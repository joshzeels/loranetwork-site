import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPublicPrice } from "../lib/pricing.ts";

type SourceProduct = {
  sourceRow: number;
  slug: string;
  sku: string;
  application: string;
  specification: string;
  iotInterface: string;
  priceUsd: string;
  productUrl: string;
  packageDimensionMm: string;
  packageWeightG: string;
};

type CatalogueFile = {
  products: SourceProduct[];
};

type Discrepancy = {
  sku: string;
  sourceUsdValue: string;
  calculatedZarValue: string | null;
  renderedZarValue: string | null;
  schemaZarValue: string | null;
  problem: string;
};

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const cataloguePath = path.join(projectRoot, "data", "dragino-products.json");
const staticAppPath = path.join(projectRoot, ".next", "server", "app");
const reportPath = path.join(projectRoot, "reports", "pricing-reconciliation.json");

const catalogue = JSON.parse(await fs.readFile(cataloguePath, "utf8")) as CatalogueFile;
const discrepancies: Discrepancy[] = [];
let pricedSourceProducts = 0;
let unpricedSourceProducts = 0;
let productsWithPublicZarPrices = 0;
let productsWithContactState = 0;
let pricingCalculationErrors = 0;
let schemaVisiblePriceMismatches = 0;
let missingProducts = 0;

function getProductSchema(html: string) {
  const scripts = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  for (const match of scripts) {
    const data = JSON.parse(match[1]) as Record<string, unknown>;
    if (data["@type"] === "Product") return data;
  }
  return null;
}

function getRenderedPrice(html: string) {
  const match = html.match(/<aside class="price-panel">[\s\S]*?<strong>([\s\S]*?)<\/strong>/);
  return match ? match[1].replace(/<[^>]+>/g, "") : null;
}

async function reconcileProduct(product: SourceProduct) {
  const pagePath = path.join(staticAppPath, "products", `${product.slug}.html`);
  let publicPrice;

  try {
    publicPrice = getPublicPrice(product.priceUsd);
    if (product.priceUsd === "") unpricedSourceProducts += 1;
    else pricedSourceProducts += 1;
  } catch (error) {
    pricingCalculationErrors += 1;
    discrepancies.push({
      sku: product.sku,
      sourceUsdValue: product.priceUsd,
      calculatedZarValue: null,
      renderedZarValue: null,
      schemaZarValue: null,
      problem: error instanceof Error ? error.message : "Unknown pricing calculation error",
    });
    return;
  }

  let html: string;
  try {
    html = await fs.readFile(pagePath, "utf8");
  } catch {
    missingProducts += 1;
    discrepancies.push({
      sku: product.sku,
      sourceUsdValue: product.priceUsd,
      calculatedZarValue: publicPrice.schemaAmount,
      renderedZarValue: null,
      schemaZarValue: null,
      problem: "Static product page is missing",
    });
    return;
  }

  const renderedPrice = getRenderedPrice(html);
  const schema = getProductSchema(html);
  const offers = schema?.offers as Record<string, unknown> | undefined;
  const schemaPrice = typeof offers?.price === "string" ? offers.price : null;
  const schemaCurrency = typeof offers?.priceCurrency === "string" ? offers.priceCurrency : null;

  if (publicPrice.amountZar === null) {
    productsWithContactState += 1;
    if (renderedPrice !== publicPrice.formatted || offers !== undefined) {
      schemaVisiblePriceMismatches += 1;
      discrepancies.push({
        sku: product.sku,
        sourceUsdValue: product.priceUsd,
        calculatedZarValue: null,
        renderedZarValue: renderedPrice,
        schemaZarValue: schemaPrice,
        problem: offers !== undefined
          ? "Unpriced product emitted an Offer"
          : "Contact-for-pricing state does not match the public pricing utility",
      });
    }
    return;
  }

  productsWithPublicZarPrices += 1;
  if (
    renderedPrice !== publicPrice.formatted ||
    schemaPrice !== publicPrice.schemaAmount ||
    schemaCurrency !== "ZAR"
  ) {
    schemaVisiblePriceMismatches += 1;
    discrepancies.push({
      sku: product.sku,
      sourceUsdValue: product.priceUsd,
      calculatedZarValue: publicPrice.schemaAmount,
      renderedZarValue: renderedPrice,
      schemaZarValue: schemaPrice,
      problem: "Calculated, visible and structured-data prices do not agree",
    });
  }
}

await Promise.all(catalogue.products.map(reconcileProduct));

async function listHtmlFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [entryPath] : [];
  }));
  return nestedFiles.flat();
}

const publicExposurePatterns = [
  { type: "supplier currency", expression: /\bUSD\b|US\$|priceUsd|Price \(USD\)/i },
  { type: "excluded currency", expression: /\bEUR\b|\bEuro\b|price\(Euro\)/i },
  { type: "pricing configuration", expression: /16\.0413|MARKUP_RATE|USD_ZAR_RATE|markupRate|supplierPriceUsd|completeCalculation/i },
];

const publicExposureFindings: Array<{ file: string; type: string }> = [];
for (const htmlFile of await listHtmlFiles(staticAppPath)) {
  const html = await fs.readFile(htmlFile, "utf8");
  for (const pattern of publicExposurePatterns) {
    if (pattern.expression.test(html)) {
      publicExposureFindings.push({
        file: path.relative(projectRoot, htmlFile).replaceAll("\\", "/"),
        type: pattern.type,
      });
    }
  }
}

const skuGroups = Map.groupBy(catalogue.products, (product) => product.sku);
const duplicateSkus = [...skuGroups.entries()]
  .filter(([, groupedProducts]) => groupedProducts.length > 1)
  .map(([sku, groupedProducts]) => ({ sku, count: groupedProducts.length }));

const pricedProducts = catalogue.products.filter((product) => product.priceUsd !== "");
const representativeProducts = {
  lowCost: pricedProducts.reduce((lowest, product) => Number(product.priceUsd) < Number(lowest.priceUsd) ? product : lowest),
  expensive: pricedProducts.reduce((highest, product) => Number(product.priceUsd) > Number(highest.priceUsd) ? product : highest),
  decimalPriced: pricedProducts.find((product) => product.priceUsd.includes(".")),
  unpriced: catalogue.products.find((product) => product.priceUsd === ""),
  missingUrl: catalogue.products.find((product) => product.productUrl === ""),
  missingPackageInformation: catalogue.products.find((product) => product.packageDimensionMm === "" && product.packageWeightG === ""),
};

const representativeChecks = Object.fromEntries(
  await Promise.all(Object.entries(representativeProducts).map(async ([kind, product]) => {
    if (!product) return [kind, null];
    const pagePath = path.join(staticAppPath, "products", `${product.slug}.html`);
    const publicPrice = getPublicPrice(product.priceUsd);
    const html = await fs.readFile(pagePath, "utf8").catch(() => null);
    const schema = html ? getProductSchema(html) : null;
    const offers = schema?.offers as Record<string, unknown> | undefined;
    return [kind, {
      sku: product.sku,
      slug: product.slug,
      calculatedZarValue: publicPrice.schemaAmount,
      renderedZarValue: html ? getRenderedPrice(html) : null,
      schemaZarValue: typeof offers?.price === "string" ? offers.price : null,
      pageGenerated: html !== null,
    }];
  })),
);

const report = {
  generatedAt: new Date().toISOString(),
  expectedTotalProducts: 981,
  totalProducts: catalogue.products.length,
  pricedSourceProducts,
  unpricedSourceProducts,
  productsWithPublicZarPrices,
  productsWithContactForPriceState: productsWithContactState,
  usdPricesPubliclyExposed: publicExposureFindings.filter((finding) => finding.type === "supplier currency").length,
  euroPricesPubliclyExposed: publicExposureFindings.filter((finding) => finding.type === "excluded currency").length,
  pricingConfigurationPubliclyExposed: publicExposureFindings.filter((finding) => finding.type === "pricing configuration").length,
  pricingCalculationErrors,
  schemaVisiblePriceMismatches,
  duplicateSkus: duplicateSkus.length,
  missingProducts,
  publicExposureFindings,
  discrepancies,
  representativeChecks,
};

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`TOTAL PRODUCTS: ${report.totalProducts} (${report.expectedTotalProducts} expected)`);
console.log(`PRICED SOURCE PRODUCTS: ${report.pricedSourceProducts}`);
console.log(`UNPRICED SOURCE PRODUCTS: ${report.unpricedSourceProducts} (12 expected)`);
console.log(`PRODUCTS WITH PUBLIC ZAR PRICES: ${report.productsWithPublicZarPrices}`);
console.log(`PRODUCTS WITH CONTACT-FOR-PRICE STATE: ${report.productsWithContactForPriceState}`);
console.log(`USD PRICES PUBLICLY EXPOSED: ${report.usdPricesPubliclyExposed}`);
console.log(`EURO PRICES PUBLICLY EXPOSED: ${report.euroPricesPubliclyExposed}`);
console.log(`PRICING CALCULATION ERRORS: ${report.pricingCalculationErrors}`);
console.log(`SCHEMA/VISIBLE PRICE MISMATCHES: ${report.schemaVisiblePriceMismatches}`);
console.log(`DUPLICATE SKUS: ${report.duplicateSkus}`);
console.log(`MISSING PRODUCTS: ${report.missingProducts}`);

if (
  report.totalProducts !== report.expectedTotalProducts ||
  report.unpricedSourceProducts !== 12 ||
  report.publicExposureFindings.length > 0 ||
  report.pricingCalculationErrors > 0 ||
  report.schemaVisiblePriceMismatches > 0 ||
  report.duplicateSkus > 0 ||
  report.missingProducts > 0
) {
  process.exitCode = 1;
}
