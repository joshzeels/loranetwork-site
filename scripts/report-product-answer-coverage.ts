import { readFileSync } from "node:fs";
import { buildComparisonFields, buildProductAnswers, selectRelatedProducts, type AnswerDocumentationStatus } from "../lib/product-answers.ts";

type Product = { sku: string; slug: string; application: string; specification: string; iotInterface: string; priceUsd: string };
type Guidance = { sku: string; definition?: string; uses?: string; suitability?: string; buyerChecks?: string[]; evidenceLevel: "EXACT_PRODUCT_SOURCE" | "FAMILY_SOURCE" };
type Documentation = { sku: string; status: AnswerDocumentationStatus };
type Family = { name: string; skuPrefix: string };

const products = (JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as { products: Product[] }).products;
const guidance = (JSON.parse(readFileSync(new URL("../data/product-guidance.json", import.meta.url), "utf8")) as { products: Guidance[] }).products;
const documentation = (JSON.parse(readFileSync(new URL("../data/product-documentation.json", import.meta.url), "utf8")) as { products: Documentation[] }).products;
const discovery = JSON.parse(readFileSync(new URL("../data/discovery-content.json", import.meta.url), "utf8")) as { families: Family[]; indexableApplications: string[] };
const guidanceBySku = new Map(guidance.map((item) => [item.sku, item]));
const documentationBySku = new Map(documentation.map((item) => [item.sku, item]));

const clean = (value: string) => value.trim().toLocaleLowerCase("en-ZA");
const familyFor = (product: Product) => discovery.families.find((family) => {
  const sku = clean(product.sku);
  const prefix = clean(family.skuPrefix);
  return sku === prefix || sku.startsWith(`${prefix}-`);
});
const familySkusFor = (product: Product) => {
  const family = familyFor(product);
  if (!family) return [];
  const prefix = clean(family.skuPrefix);
  return products.filter((candidate) => clean(candidate.sku) === prefix || clean(candidate.sku).startsWith(`${prefix}-`)).map((candidate) => candidate.sku);
};
const familyProductsFor = (product: Product) => {
  const skus = new Set(familySkusFor(product));
  return products.filter((candidate) => skus.has(candidate.sku));
};

const rows = products.map((product) => ({
  product,
  answers: buildProductAnswers(product, guidanceBySku.get(product.sku), documentationBySku.get(product.sku)?.status, { familyName: familyFor(product)?.name, familyProducts: familyProductsFor(product) }),
}));

function relatedFor(product: Product) {
  return selectRelatedProducts(product, products, familySkusFor(product));
}

function meaningfulComparison(product: Product) {
  const peer = relatedFor(product)[0];
  if (!peer) return false;
  return buildComparisonFields([product, peer]).filter((field) => Boolean(field.values[0])).length >= 2;
}

function measure(count: number, total: number) {
  return { count, percentage: total ? Number(((count / total) * 100).toFixed(1)) : 0 };
}

function eligibleMeasure(count: number, eligible: number) {
  return { count, eligible, percentage: eligible ? Number(((count / eligible) * 100).toFixed(1)) : 0 };
}

function materiallyDistinct(first: string, second: string) {
  const terms = (value: string) => new Set(value.toLocaleLowerCase("en-ZA").replace(/[^a-z0-9]+/g, " ").split(" ").filter((term) => term.length > 3 && !/^(this|that|with|from|product|model|used|uses)$/.test(term)));
  const firstTerms = terms(first);
  const secondTerms = terms(second);
  const overlap = [...secondTerms].filter((term) => firstTerms.has(term)).length;
  return secondTerms.size > 0 && overlap / secondTerms.size < 0.75;
}

function metrics(items: typeof rows) {
  const buyerRows = items.filter(({ answers }) => !answers.isAccessory);
  const accessories = items.length - buyerRows.length;
  const count = (predicate: (item: (typeof rows)[number]) => boolean) => buyerRows.filter(predicate).length;
  const total = buyerRows.length;
  const catalogueDerived = buyerRows.filter(({ product }) => !guidanceBySku.has(product.sku));
  const strictCatalogueOnly = buyerRows.filter(({ answers }) => answers.evidenceClass === "CATALOGUE_ONLY");
  const answerDepth = ({ answers }: (typeof rows)[number]) => answers.answerDimensions.length;
  const withFunctionSection = buyerRows.filter(({ answers }) => Boolean(answers.functionAnswer));
  const withChecks = buyerRows.filter(({ answers }) => answers.beforeOrdering.length > 0);
  const distinctFunction = withFunctionSection.filter(({ answers }) => materiallyDistinct(answers.opening, answers.functionAnswer ?? ""));
  const additiveChecks = withChecks.filter(({ answers }) => answers.beforeOrdering.every((check) => /^(?:confirm|select|check|plan|review|verify|choose|provide|use)\b/i.test(check)));
  const duplicatedSections = buyerRows.filter(({ answers }) => (answers.functionAnswer && !materiallyDistinct(answers.opening, answers.functionAnswer)) || (answers.connectivity && !answers.semanticFacts.localInterface && !answers.semanticFacts.gatewayBackhaul.length));

  return {
    catalogueProducts: items.length,
    buyerFacingProducts: total,
    accessoriesComponents: accessories,
    usefulOpening: measure(count(({ answers }) => Boolean(answers.opening) && !/\bis an IoT product\.?$/i.test(answers.opening)), total),
    explicitFunction: measure(count(({ answers }) => answers.answerDimensions.includes("function")), total),
    connectivity: measure(count(({ answers }) => answers.answerDimensions.includes("connectivity")), total),
    power: measure(count(({ answers }) => answers.answerDimensions.includes("power")), total),
    sensorProbe: measure(count(({ answers }) => answers.answerDimensions.includes("sensorProbe")), total),
    beforeOrdering: measure(count(({ answers }) => answers.beforeOrdering.length > 0), total),
    relatedContextNavigation: measure(count(({ product }) => relatedFor(product).length > 0), total),
    meaningfulComparison: measure(count(({ product }) => meaningfulComparison(product)), total),
    renderedFunctionSections: measure(withFunctionSection.length, total),
    renderedConnectivitySections: measure(count(({ answers }) => Boolean(answers.connectivity)), total),
    renderedPowerSections: measure(count(({ answers }) => Boolean(answers.power)), total),
    renderedSensorProbeSections: measure(count(({ answers }) => Boolean(answers.sensorOrProbe)), total),
    openingAndFunctionMateriallyDistinct: eligibleMeasure(distinctFunction.length, withFunctionSection.length),
    connectivityNotUnnecessarilyRepeated: measure(count(({ answers }) => !answers.connectivity || Boolean(answers.semanticFacts.localInterface || answers.semanticFacts.gatewayBackhaul.length)), total),
    atLeastTwoDecisionUsefulDimensions: measure(count(({ answers }) => answers.answerDimensions.length >= 2), total),
    atLeastThreeDecisionUsefulDimensions: measure(count(({ answers }) => answers.answerDimensions.length >= 3), total),
    meaningfulModelVariant: measure(count(({ answers }) => Boolean(answers.modelOrVariant)), total),
    semanticallyDuplicatedVisibleSections: measure(duplicatedSections.length, total),
    beforeOrderingAddsDecisionInformation: eligibleMeasure(additiveChecks.length, withChecks.length),
    pagesWithRedundantSectionsRemoved: measure(count(({ answers }) => answers.suppressedRedundantSections.length > 0), total),
    redundantSectionsRemoved: buyerRows.reduce((totalRemoved, { answers }) => totalRemoved + answers.suppressedRedundantSections.length, 0),
    legacyBuyerChecks: measure(count(({ product }) => Boolean(guidanceBySku.get(product.sku)?.buyerChecks?.length)), total),
    catalogueOnlyProducts: catalogueDerived.length,
    catalogueOnlyMateriallyImproved: catalogueDerived.filter((row) => answerDepth(row) >= 2).length,
    stillTooSparseToImproveSafely: catalogueDerived.filter((row) => answerDepth(row) < 2).length,
    strictCatalogueOnlyEvidenceClass: strictCatalogueOnly.length,
  };
}

const clusters: Record<string, (product: Product) => boolean> = {
  gateways: (product) => /gateway/i.test(product.application),
  distanceLevel: (product) => /distance|level/i.test(`${product.sku} ${product.application}`),
  temperatureHumidity: (product) => /temperature|humidity/i.test(product.application),
  flow: (product) => /flow/i.test(product.application),
  waterQuality: (product) => /water quality/i.test(product.application),
  pressure: (product) => /pressure/i.test(product.application),
  agricultureSoil: (product) => /agriculture|soil/i.test(`${product.application} ${product.specification}`),
  rs485Modbus: (product) => /rs485|modbus/i.test(`${product.sku} ${product.application} ${product.iotInterface} ${product.specification}`),
  tracking: (product) => /tracker/i.test(`${product.sku} ${product.application}`),
  weather: (product) => /weather/i.test(product.application),
  powerCurrent: (product) => /energy|current/i.test(product.application),
  vibration: (product) => /vibration/i.test(`${product.application} ${product.specification}`),
  airflow: (product) => /airflow/i.test(`${product.sku} ${product.application}`),
  co2: (product) => /\bco2\b/i.test(`${product.sku} ${product.application}`),
};

const evidence = Object.fromEntries(["EXACT", "FAMILY", "CATALOGUE_ONLY", "AMBIGUOUS", "UNVERIFIED"].map((level) => [level, rows.filter(({ answers }) => answers.evidenceClass === level).length]));
const missingDocumentationSkus = products.filter((product) => !documentationBySku.has(product.sku)).map((product) => product.sku);

console.log(JSON.stringify({
  methodology: {
    percentagesUseBuyerFacingProductsOnly: true,
    accessoriesAreReportedSeparately: true,
    catalogueOnlyMeansNoRichGuidanceRecord: true,
    materiallyImprovedRequiresAtLeastTwoDecisionUsefulDimensions: true,
    semanticFactsCountEvenWhenADuplicateSectionIsSuppressed: true,
    richExactSourceGuidanceIsNotIncreasedByCatalogueDerivedAnswers: true,
  },
  evidence,
  evidenceCoverage: documentation.filter((item) => item.status === "EXACT_PRODUCT_SOURCE" || item.status === "FAMILY_SOURCE").length,
  richExactSourceGuidance: guidance.filter((item) => item.evidenceLevel === "EXACT_PRODUCT_SOURCE").length,
  missingDocumentationSkus,
  overall: metrics(rows),
  clusters: Object.fromEntries(Object.entries(clusters).map(([name, predicate]) => [name, metrics(rows.filter(({ product }) => predicate(product)))])),
  sparseBuyerProducts: rows.filter((row) => !row.answers.isAccessory && !guidanceBySku.has(row.product.sku) && row.answers.answerDimensions.length < 2).map(({ product }) => product.sku),
}, null, 2));
