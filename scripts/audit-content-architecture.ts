import { readFile, writeFile } from "node:fs/promises";

type Product = { sku: string; application: string; specification: string; iotInterface: string };
type Family = { slug: string; name: string; skuPrefix: string; purpose: string };
type Guide = { slug: string; title: string; applicationValues: string[]; searchTerms: string[] };
type ConnectivityGuidance = { sourceLabel: string; sourceUrl: string };
type Content = { indexableApplications: string[]; indexableInterfaces: string[]; connectivityGuidance: Record<string, ConnectivityGuidance>; families: Family[]; guides: Guide[] };

const catalogue = JSON.parse(await readFile("data/dragino-products.json", "utf8")) as { products: Product[] };
const content = JSON.parse(await readFile("data/discovery-content.json", "utf8")) as Content;
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const key = (value: string) => clean(value).toLocaleLowerCase("en-ZA");
const slug = (value: string) => clean(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-ZA").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const searchable = (product: Product) => key([product.sku, product.application, product.specification, product.iotInterface].join(" "));
const facts = ["SKU", "Application", "Specification", "IoT Interface", "Package Dimension (mm)", "Package Weight (g)", "calculated public ZAR price"];
const applicationGroups = Map.groupBy(catalogue.products, (product) => key(product.application));
const interfaceGroups = Map.groupBy(catalogue.products, (product) => key(product.iotInterface));
const applicationKeys = new Set(content.indexableApplications.map(key));
const interfaceKeys = new Set(content.indexableInterfaces.map(key));
const record = (url: string, purpose: string, sourceProductGroups: string[], productCount: number) => ({ url, purpose, sourceProductGroups, numberOfProductsRepresented: productCount, catalogueFactsUsed: facts, externalTechnicalSourcesUsed: [] as string[] });

const applicationPages = content.indexableApplications.map((value) => record(`/applications/${slug(value)}`, `Answer which products are listed for the exact ${value} application value and provide factual comparison.`, [value], applicationGroups.get(key(value))?.length ?? 0));
const connectivityPages = content.indexableInterfaces.map((value) => {
  const page = record(`/connectivity/${slug(value)}`, `Explain ${value} with sourced technology context, then identify and compare products carrying that exact interface value.`, [value], interfaceGroups.get(key(value))?.length ?? 0);
  const guidance = content.connectivityGuidance[value];
  page.externalTechnicalSourcesUsed = guidance ? [`${guidance.sourceLabel}: ${guidance.sourceUrl}`] : [];
  return page;
});
const familyPages = content.families.map((family) => { const prefix = key(family.skuPrefix); const count = catalogue.products.filter((product) => { const sku = key(product.sku); return sku === prefix || sku.startsWith(`${prefix}-`); }).length; return record(`/families/${family.slug}`, family.purpose, [family.name], count); });
const guidePages = content.guides.map((guide) => { const applications = new Set(guide.applicationValues.map(key)); const matching = catalogue.products.filter((product) => applications.has(key(product.application)) || guide.searchTerms.some((term) => searchable(product).includes(key(term)))); return record(`/guides/${guide.slug}`, guide.title, [...guide.applicationValues, ...guide.searchTerms], matching.length); });
const thinPagesRejected = [
  ...[...applicationGroups.entries()].filter(([value]) => value && !applicationKeys.has(value)).map(([, products]) => ({ type: "application", sourceValue: clean(products[0].application), productCount: products.length, reason: "Not promoted as an indexable landing page because the group is thin, accessory-led, duplicated, malformed, or lacks enough distinct buying value." })),
  ...[...interfaceGroups.entries()].filter(([value]) => value && !interfaceKeys.has(value)).map(([, products]) => ({ type: "connectivity", sourceValue: clean(products[0].iotInterface), productCount: products.length, reason: "Not promoted as an indexable connectivity page because the value is thin, accessory-specific, duplicated, or is not a substantive connectivity group." })),
];

const report = {
  generatedAt: new Date().toISOString(),
  policy: "Index only curated pages that answer a distinct buying question from authoritative catalogue facts.",
  applicationPages,
  connectivityPages,
  productFamilyPages: familyPages,
  buyingGuides: guidePages,
  comparisonFeatures: [
    { url: "/compare", indexable: false, purpose: "Compare up to four selected related products using supplied fields and central ZAR pricing." },
    { location: "Application, connectivity, family and guide pages", purpose: "Server-rendered comparison tables using catalogue fields only." },
    { location: "Product pages", purpose: "Links to a verified family comparison or related-model comparison where available." }
  ],
  search: { fields: ["SKU", "Application", "Specification", "IoT Interface"], normalization: "Case, punctuation and hyphen tolerant; every query token must occur in a source field.", synonyms: [], documentedExamples: ["water", "temperature", "humidity", "gateway", "tracker", "RS485", "Modbus", "LoRaWAN", "NB-IoT", "agriculture", "level", "meter", "CO2"] },
  thinPagesRejected,
  unsupportedClaimsRejected: [
    { topic: "Tank level monitoring", reason: "The word tank has zero matches across the searchable catalogue fields; no tank synonym or landing page was created." },
    { topic: "Unsourced technology advantages and limitations", reason: "Connectivity context was limited to claims supported by LoRa Alliance or GSMA primary sources." },
    { topic: "Compatibility, accuracy, ranges and installation", reason: "Not inferred when absent from the workbook." }
  ],
  duplicateContentAvoided: ["Non-substantive and near-duplicate source facets are excluded from the sitemap and landing-page indexes.", "Family pages are limited to seven evidence-backed groups rather than every SKU prefix.", "The comparison query route is noindex and canonicalized to /compare."],
};

await writeFile("reports/content-architecture-audit.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ applicationPages: applicationPages.length, connectivityPages: connectivityPages.length, productFamilyPages: familyPages.length, buyingGuides: guidePages.length, comparisonFeatures: report.comparisonFeatures.length, thinPagesRejected: thinPagesRejected.length, unsupportedClaimsRejected: report.unsupportedClaimsRejected.length }, null, 2));
