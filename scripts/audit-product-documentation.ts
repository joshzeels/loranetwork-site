import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Product = { sku: string; slug: string; iotInterface: string; productUrl: string };
type Family = { slug: string; name: string; skuPrefix: string; evidence: string };
type Status = "EXACT_PRODUCT_SOURCE" | "FAMILY_SOURCE" | "NO_VERIFIED_SOURCE" | "AMBIGUOUS";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogue = JSON.parse(await readFile(join(root, "data", "dragino-products.json"), "utf8")) as { products: Product[] };
const discovery = JSON.parse(await readFile(join(root, "data", "discovery-content.json"), "utf8")) as { families: Family[] };
const officialIndex = JSON.parse(await readFile(join(root, "data", "dragino-official-page-index.json"), "utf8")) as { pages: Array<{ url: string }> };

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-ZA").replace(/\s+/g, " ");
}

function normalizeSku(value: string) {
  return value.trim().toUpperCase();
}

function canonicalOfficialUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (!/(^|\.)dragino\.com$/i.test(url.hostname)) return "";
    url.hash = "";
    url.search = "";
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return "";
  }
}

function familyFor(product: Product) {
  const sku = normalizeSku(product.sku);
  return discovery.families.find((family) => {
    const prefix = normalizeSku(family.skuPrefix);
    return sku === prefix || sku.startsWith(`${prefix}-`);
  });
}

const indexedUrls = new Set(officialIndex.pages.map((page) => canonicalOfficialUrl(page.url)).filter(Boolean));
const reconciled = catalogue.products.map((product) => {
  const directUrl = canonicalOfficialUrl(product.productUrl);
  if (directUrl) {
    return { sku: product.sku, slug: product.slug, status: "EXACT_PRODUCT_SOURCE" as Status, sourceUrl: directUrl, matchedFamily: familyFor(product)?.name ?? "", evidence: "Official Dragino URL is attached to this exact source-catalogue row.", presentInOfficialPageIndex: indexedUrls.has(directUrl) };
  }

  if (product.productUrl.trim()) {
    return { sku: product.sku, slug: product.slug, status: "AMBIGUOUS" as Status, sourceUrl: "", matchedFamily: "", evidence: "The source-catalogue URL is not on an official Dragino host.", presentInOfficialPageIndex: false };
  }

  const family = familyFor(product);
  if (!family) return { sku: product.sku, slug: product.slug, status: "NO_VERIFIED_SOURCE" as Status, sourceUrl: "", matchedFamily: "", evidence: "No direct official URL or verified family relationship is available.", presentInOfficialPageIndex: false };

  const prefix = normalizeSku(family.skuPrefix);
  const candidates = [...new Set(catalogue.products
    .filter((candidate) => {
      const sku = normalizeSku(candidate.sku);
      return (sku === prefix || sku.startsWith(`${prefix}-`)) && normalize(candidate.iotInterface) === normalize(product.iotInterface);
    })
    .map((candidate) => canonicalOfficialUrl(candidate.productUrl))
    .filter(Boolean))];

  if (candidates.length === 1) {
    return { sku: product.sku, slug: product.slug, status: "FAMILY_SOURCE" as Status, sourceUrl: candidates[0], matchedFamily: family.name, evidence: `The verified ${family.name} family has one official source for this exact catalogue connectivity value. ${family.evidence}`, presentInOfficialPageIndex: indexedUrls.has(candidates[0]) };
  }

  return { sku: product.sku, slug: product.slug, status: candidates.length > 1 ? "AMBIGUOUS" as Status : "NO_VERIFIED_SOURCE" as Status, sourceUrl: "", matchedFamily: family.name, evidence: candidates.length > 1 ? "More than one official family source matches this connectivity value, so no source is exposed." : "The verified family has no official source for this connectivity value.", presentInOfficialPageIndex: false };
});

const counts = reconciled.reduce<Record<Status, number>>((summary, product) => {
  summary[product.status] += 1;
  return summary;
}, { EXACT_PRODUCT_SOURCE: 0, FAMILY_SOURCE: 0, NO_VERIFIED_SOURCE: 0, AMBIGUOUS: 0 });

const generatedAt = new Date().toISOString();
const publicData = { generatedAt, policy: "Only exact catalogue-row sources and unambiguous sources from the seven verified families are eligible for public display.", products: reconciled };
const report = { generatedAt, officialHosts: ["dragino.com and subdomains"], method: ["Accept an official URL attached to the exact source-catalogue row.", "For rows without a URL, use only the seven already verified families.", "Require exactly one official family URL for the product's exact catalogue connectivity value.", "Reject non-Dragino, absent and multi-candidate sources."], counts, publicCoverage: counts.EXACT_PRODUCT_SOURCE + counts.FAMILY_SOURCE, products: reconciled };

await mkdir(join(root, "reports"), { recursive: true });
await writeFile(join(root, "data", "product-documentation.json"), `${JSON.stringify(publicData, null, 2)}\n`, "utf8");
await writeFile(join(root, "reports", "product-documentation-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`EXACT_PRODUCT_SOURCE: ${counts.EXACT_PRODUCT_SOURCE}`);
console.log(`FAMILY_SOURCE: ${counts.FAMILY_SOURCE}`);
console.log(`NO_VERIFIED_SOURCE: ${counts.NO_VERIFIED_SOURCE}`);
console.log(`AMBIGUOUS: ${counts.AMBIGUOUS}`);
console.log(`PUBLIC DOCUMENTATION COVERAGE: ${report.publicCoverage}/${catalogue.products.length}`);
