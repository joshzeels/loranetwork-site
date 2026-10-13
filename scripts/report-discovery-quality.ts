import { readFile } from "node:fs/promises";

type Product = { sku: string; application: string; specification: string; iotInterface: string };
type Comparison = { caption: string; headers: string[]; rows: string[][] };
type ApplicationGuidance = { directAnswer: string; hardwareSummary: string; considerations: string[]; selectionPath: string; relatedFamilySlugs?: string[]; relatedGuideSlugs?: string[]; comparison?: Comparison };
type Family = { slug: string; skuPrefix: string; variantGuidance: string; representativeSkus: string[]; relatedGuideSlugs: string[]; selectionPath: string[] };
type Guide = {
  slug: string;
  question: string;
  applicationValues: string[];
  searchTerms: string[];
  relatedFamilySlugs: string[];
  differenceSummary: string;
  decisionPath: string[];
  comparisonProductSlugs?: string[];
  decisionResource?: { table: { rows: string[][] }; relatedLinks: Array<{ href: string }> };
};
type Content = { indexableApplications: string[]; applicationGuidance: Record<string, ApplicationGuidance>; families: Family[]; guides: Guide[] };

const catalogue = JSON.parse(await readFile("data/dragino-products.json", "utf8")) as { products: Product[] };
const content = JSON.parse(await readFile("data/discovery-content.json", "utf8")) as Content;
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const key = (value: string) => clean(value).toLocaleLowerCase("en-ZA");
const searchText = (product: Product) => key([product.sku, product.application, product.specification, product.iotInterface].join(" "));
const uniqueCount = (values: string[]) => new Set(values.map(key)).size;
const percent = (count: number, total: number) => ({ count, total, percentage: total ? Number(((count / total) * 100).toFixed(1)) : 0 });
const applicationProducts = (value: string) => catalogue.products.filter((product) => key(product.application) === key(value));
const familyProducts = (family: Family) => catalogue.products.filter((product) => { const sku = key(product.sku); const prefix = key(family.skuPrefix); return sku === prefix || sku.startsWith(`${prefix}-`); });
const guideProducts = (guide: Guide) => {
  const applications = new Set(guide.applicationValues.map(key));
  return catalogue.products.filter((product) => applications.has(key(product.application)) || guide.searchTerms.some((term) => searchText(product).includes(key(term))));
};
const guideIntentText = (guide: Guide) => key([guide.question, guide.differenceSummary, guide.decisionPath[0] ?? ""].join(" "));
const intentTokens = (guide: Guide) => new Set(guideIntentText(guide).split(" ").filter((token) => token.length > 3));
const intentSimilarity = (left: Guide, right: Guide) => {
  const leftTokens = intentTokens(left);
  const rightTokens = intentTokens(right);
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
};

const applicationRows = content.indexableApplications.map((value) => {
  const guidance = content.applicationGuidance[value];
  const products = applicationProducts(value);
  const skus = new Set(products.map((product) => key(product.sku)));
  const inferredFamilies = content.families.filter((family) => familyProducts(family).some((product) => skus.has(key(product.sku))));
  const inferredGuides = content.guides.filter((guide) => guideProducts(guide).some((product) => skus.has(key(product.sku))));
  return {
    value,
    guidance: Boolean(guidance),
    answerFirstIntro: Boolean(guidance && guidance.directAnswer.length > 80 && !/^browse \d+/i.test(guidance.directAnswer)),
    decisionPath: Boolean(guidance && guidance.selectionPath.split(/(?<=[.!?])\s+/).filter(Boolean).length >= 2),
    curatedSelectionTable: Boolean(guidance?.comparison && guidance.comparison.rows.length >= 2),
    catalogueComparisonTable: products.length > 0,
    guideLinks: new Set([...(guidance?.relatedGuideSlugs ?? []), ...inferredGuides.map((guide) => guide.slug)]).size > 0,
    familyLinks: new Set([...(guidance?.relatedFamilySlugs ?? []), ...inferredFamilies.map((family) => family.slug)]).size > 0,
    enquiryPath: Boolean(guidance),
  };
});

const familyRows = content.families.map((family) => {
  const members = familyProducts(family);
  const applications = new Set(members.map((product) => key(product.application)));
  const copy = [family.variantGuidance, ...family.selectionPath].join(" ");
  return {
    slug: family.slug,
    variantExplanation: family.variantGuidance.length > 80,
    variantMatrix: family.representativeSkus.length >= 2 && family.representativeSkus.every((sku) => members.some((product) => key(product.sku) === key(sku))),
    powerOrConnectivityDistinction: /power|battery|solar|connectivity|lorawan|lte cat 1/i.test(copy),
    applicationLinks: applications.size > 0,
    guideLinks: family.relatedGuideSlugs.length > 0,
    comparisonPath: family.representativeSkus.length >= 2,
    enquiryPath: true,
  };
});

const duplicateIntentPairs: string[] = [];
for (let leftIndex = 0; leftIndex < content.guides.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < content.guides.length; rightIndex += 1) {
    const left = content.guides[leftIndex];
    const right = content.guides[rightIndex];
    const leftProducts = new Set(guideProducts(left).map((product) => key(product.sku)));
    const overlappingProducts = guideProducts(right).filter((product) => leftProducts.has(key(product.sku))).length;
    if (overlappingProducts > 0 && intentSimilarity(left, right) >= 0.7) duplicateIntentPairs.push(`${left.slug} <> ${right.slug}`);
  }
}
const guideRows = content.guides.map((guide) => ({
  slug: guide.slug,
  decisionPath: guide.decisionPath.length >= 3,
  comparisonPath: Boolean((guide.comparisonProductSlugs?.length ?? 0) >= 2 || (guide.decisionResource?.table.rows.length ?? 0) >= 2),
  enquiryPath: true,
}));

const applicationGuidance = Object.values(content.applicationGuidance);
const familyCopy = content.families.map((family) => [family.variantGuidance, ...family.selectionPath].join(" "));
const result = {
  baseline: {
    applications: { curatedGuidance: 13, answerFirstIntro: 13, decisionPath: 13, curatedSelectionTable: 0, catalogueComparisonTable: 19, enquiryPath: 0, genericFallbackRisk: 6 },
    families: { explicitVariantExplanation: 0, compactCuratedVariantMatrix: 0, comparisonPath: 7, enquiryPath: 7 },
    guides: { total: 7, applicationsWithRelevantGuideCoverage: 12, decisionPath: 7, comparisonPath: 6, enquiryPath: 7, duplicateIntentRisk: 0 },
  },
  current: {
    applications: {
      total: applicationRows.length,
      curatedGuidance: percent(applicationRows.filter((row) => row.guidance).length, applicationRows.length),
      answerFirstIntro: percent(applicationRows.filter((row) => row.answerFirstIntro).length, applicationRows.length),
      decisionPath: percent(applicationRows.filter((row) => row.decisionPath).length, applicationRows.length),
      curatedSelectionTable: percent(applicationRows.filter((row) => row.curatedSelectionTable).length, applicationRows.length),
      catalogueComparisonTable: percent(applicationRows.filter((row) => row.catalogueComparisonTable).length, applicationRows.length),
      guideLinks: percent(applicationRows.filter((row) => row.guideLinks).length, applicationRows.length),
      familyLinks: percent(applicationRows.filter((row) => row.familyLinks).length, applicationRows.length),
      enquiryPath: percent(applicationRows.filter((row) => row.enquiryPath).length, applicationRows.length),
      duplicateDirectAnswers: applicationGuidance.length - uniqueCount(applicationGuidance.map((guidance) => guidance.directAnswer)),
      duplicateDecisionPaths: applicationGuidance.length - uniqueCount(applicationGuidance.map((guidance) => guidance.selectionPath)),
      genericFallbackRisk: applicationRows.filter((row) => !row.guidance).length,
    },
    families: {
      total: familyRows.length,
      variantExplanation: percent(familyRows.filter((row) => row.variantExplanation).length, familyRows.length),
      variantMatrix: percent(familyRows.filter((row) => row.variantMatrix).length, familyRows.length),
      powerOrConnectivityDistinction: percent(familyRows.filter((row) => row.powerOrConnectivityDistinction).length, familyRows.length),
      applicationLinks: percent(familyRows.filter((row) => row.applicationLinks).length, familyRows.length),
      guideLinks: percent(familyRows.filter((row) => row.guideLinks).length, familyRows.length),
      comparisonPath: percent(familyRows.filter((row) => row.comparisonPath).length, familyRows.length),
      enquiryPath: percent(familyRows.filter((row) => row.enquiryPath).length, familyRows.length),
      duplicateVariantBlocks: familyCopy.length - uniqueCount(familyCopy),
    },
    guides: {
      total: guideRows.length,
      applicationsWithRelevantGuideCoverage: percent(applicationRows.filter((row) => row.guideLinks).length, applicationRows.length),
      decisionPath: percent(guideRows.filter((row) => row.decisionPath).length, guideRows.length),
      comparisonPath: percent(guideRows.filter((row) => row.comparisonPath).length, guideRows.length),
      enquiryPath: percent(guideRows.filter((row) => row.enquiryPath).length, guideRows.length),
      duplicateIntentRisk: { count: duplicateIntentPairs.length, pairs: duplicateIntentPairs },
    },
  },
};

console.log(JSON.stringify(result, null, 2));
