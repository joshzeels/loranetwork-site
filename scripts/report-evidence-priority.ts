import { readFileSync } from "node:fs";
import { buildProductAnswers, type AnswerDocumentationStatus } from "../lib/product-answers.ts";

type Product = { sku: string; slug: string; application: string; specification: string; iotInterface: string; priceUsd: string };
type Documentation = { sku: string; status: AnswerDocumentationStatus };
type Guidance = { sku: string; evidenceLevel: "EXACT_PRODUCT_SOURCE" | "FAMILY_SOURCE" };
type Family = { name: string; skuPrefix: string; representativeSkus: string[] };
type Guide = { slug: string; applicationValues: string[]; searchTerms: string[]; comparisonProductSlugs?: string[] };
type ApplicationGuidance = { comparison?: { rows: string[][] } };

const products = (JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as { products: Product[] }).products;
const documentation = (JSON.parse(readFileSync(new URL("../data/product-documentation.json", import.meta.url), "utf8")) as { products: Documentation[] }).products;
const guidance = (JSON.parse(readFileSync(new URL("../data/product-guidance.json", import.meta.url), "utf8")) as { products: Guidance[] }).products;
const discovery = JSON.parse(readFileSync(new URL("../data/discovery-content.json", import.meta.url), "utf8")) as {
  families: Family[];
  guides: Guide[];
  applicationGuidance: Record<string, ApplicationGuidance>;
};

const documentationBySku = new Map(documentation.map((record) => [record.sku, record]));
const guidanceBySku = new Map(guidance.map((record) => [record.sku, record]));
const normalise = (value: string) => value.toLocaleLowerCase("en-ZA").replace(/[^a-z0-9]+/g, " ").trim();
const exactEvidence = (sku: string) => documentationBySku.get(sku)?.status === "EXACT_PRODUCT_SOURCE";
const coveredEvidence = (sku: string) => ["EXACT_PRODUCT_SOURCE", "FAMILY_SOURCE"].includes(documentationBySku.get(sku)?.status ?? "");

function familyFor(product: Product) {
  const sku = normalise(product.sku);
  return discovery.families.find((family) => {
    const prefix = normalise(family.skuPrefix);
    return sku === prefix || sku.startsWith(`${prefix} `);
  });
}

function familyProducts(product: Product) {
  const family = familyFor(product);
  if (!family) return [];
  const prefix = normalise(family.skuPrefix);
  return products.filter((candidate) => {
    const sku = normalise(candidate.sku);
    return sku === prefix || sku.startsWith(`${prefix} `);
  });
}

function guideProducts(guide: Guide) {
  const applications = new Set(guide.applicationValues.map(normalise));
  return products.filter((product) => {
    if (applications.has(normalise(product.application))) return true;
    const searchable = normalise([product.sku, product.application, product.specification, product.iotInterface].join(" "));
    return guide.searchTerms.some((term) => searchable.includes(normalise(term)));
  });
}

function cluster(product: Product) {
  const value = `${product.sku} ${product.application} ${product.specification}`;
  if (/gateway/i.test(product.application)) return { name: "gateways", weight: 10 };
  if (/water quality/i.test(product.application)) return { name: "water quality", weight: 9 };
  if (/water flow/i.test(product.application)) return { name: "water flow", weight: 8 };
  if (/rs485|modbus/i.test(value)) return { name: "RS485 / Modbus", weight: 7 };
  if (/distance/i.test(product.application)) return { name: "distance / level", weight: 6 };
  if (/pressure/i.test(product.application)) return { name: "pressure", weight: 5 };
  if (/weather/i.test(product.application)) return { name: "weather", weight: 4 };
  if (/energy|current|power/i.test(product.application)) return { name: "power / current", weight: 3 };
  if (/temperature|humidity/i.test(product.application)) return { name: "temperature / humidity", weight: 2 };
  if (/agriculture|soil/i.test(value)) return { name: "agriculture / soil", weight: 1 };
  return { name: "other", weight: 0 };
}

function applicationTableMentions(product: Product) {
  const rows = discovery.applicationGuidance[product.application]?.comparison?.rows ?? [];
  const table = normalise(rows.flat().join(" "));
  const exactSku = normalise(product.sku);
  const model = exactSku.split(" ")[0] ?? exactSku;
  return table.includes(exactSku) || model.length >= 3 && table.includes(model);
}

function isExhaustedCandidate(sku: string) {
  return /^(?:LPS8N-EC25|LPS8V2-EC25|LG308N-EC25|MS48-LR-EC25)$/i.test(sku) || /-K[NS]-/i.test(sku);
}

const rows = products.map((product) => {
  const family = familyFor(product);
  const answers = buildProductAnswers(product, guidanceBySku.get(product.sku), documentationBySku.get(product.sku)?.status, {
    familyName: family?.name,
    familyProducts: familyProducts(product),
  });
  const guides = discovery.guides.filter((guide) => guideProducts(guide).some((candidate) => candidate.sku === product.sku));
  const inGuideComparison = discovery.guides.some((guide) => guide.comparisonProductSlugs?.includes(product.slug));
  const inApplicationTable = applicationTableMentions(product);
  const variants = products.filter((candidate) => normalise(candidate.sku).split(" ")[0] === normalise(product.sku).split(" ")[0]).length;
  const priorityCluster = cluster(product);
  const roles = `${product.sku} ${product.application} ${product.specification}`;
  const score = priorityCluster.weight * 5
    + (family ? 18 : 0)
    + (inApplicationTable ? 12 : 0)
    + (guides.length ? 10 : 0)
    + (inGuideComparison ? 12 : 0)
    + (variants > 1 ? Math.min(variants, 10) : 0)
    + (product.priceUsd ? 6 : 0)
    + (/gateway|controller|converter|rs485|modbus/i.test(roles) ? 8 : 0)
    + (answers.answerDimensions.length < 3 ? 5 : 0);

  return { product, answers, family, guides, inGuideComparison, inApplicationTable, variants, priorityCluster, score };
});

function coverage(items: typeof rows) {
  return {
    products: items.length,
    exact: items.filter(({ product }) => exactEvidence(product.sku)).length,
    exactOrFamily: items.filter(({ product }) => coveredEvidence(product.sku)).length,
  };
}

const unresolved = rows
  .filter(({ product, answers }) => !answers.isAccessory && !coveredEvidence(product.sku) && !isExhaustedCandidate(product.sku))
  .sort((a, b) => b.score - a.score || a.product.sku.localeCompare(b.product.sku, "en-ZA"));
const buyerFacing = rows.filter(({ answers }) => !answers.isAccessory);
const accessories = rows.filter(({ answers }) => answers.isAccessory);
const familyRows = rows.filter(({ family }) => Boolean(family));
const applicationTableRows = rows.filter(({ inApplicationTable }) => inApplicationTable);
const guideRows = rows.filter(({ guides, inGuideComparison }) => guides.length > 0 || inGuideComparison);
const highIntentRows = rows.filter(({ priorityCluster }) => priorityCluster.weight > 0);

console.log(JSON.stringify({
  methodology: "Commercial score weights cluster order, curated-family membership, application tables, buying guides, variant count, public pricing, gateway/controller/converter roles, and sparse answers. Accessories and explicitly exhausted shorthand or inferred KN/KS candidates are excluded from the queue.",
  priorityQueue: unresolved.slice(0, 30).map(({ product, family, guides, inGuideComparison, inApplicationTable, variants, priorityCluster, score, answers }) => ({
    sku: product.sku,
    application: product.application,
    status: documentationBySku.get(product.sku)?.status ?? "CATALOGUE_ONLY",
    cluster: priorityCluster.name,
    score,
    priced: Boolean(product.priceUsd),
    curatedFamily: family?.name ?? "",
    applicationTable: inApplicationTable,
    guides: guides.map((guide) => guide.slug),
    guideComparison: inGuideComparison,
    relatedVariantCount: variants,
    answerDimensions: answers.answerDimensions.length,
  })),
  coverage: {
    buyerFacing: coverage(buyerFacing),
    accessoriesComponents: coverage(accessories),
    totalDocumentationRecords: coverage(rows),
    curatedFamilies: coverage(familyRows),
    applicationTables: coverage(applicationTableRows),
    guideLinked: coverage(guideRows),
    highIntentClusters: coverage(highIntentRows),
  },
}, null, 2));
