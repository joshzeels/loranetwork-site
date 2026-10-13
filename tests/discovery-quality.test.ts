import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { productApplicationLabel } from "../lib/product-presentation.ts";

type Comparison = { caption: string; headers: string[]; rows: string[][] };
type Guidance = { directAnswer: string; hardwareSummary: string; considerations: string[]; selectionPath: string; relatedFamilySlugs?: string[]; relatedGuideSlugs?: string[]; comparison?: Comparison };
type Family = { slug: string; skuPrefix: string; variantGuidance: string; representativeSkus: string[]; relatedGuideSlugs: string[]; selectionPath: string[] };
type Guide = { slug: string };
const content = JSON.parse(readFileSync(new URL("../data/discovery-content.json", import.meta.url), "utf8")) as { indexableApplications: string[]; applicationGuidance: Record<string, Guidance>; families: Family[]; guides: Guide[] };
const catalogue = JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; application: string }> };
const facetPage = readFileSync(new URL("../components/facet-detail.tsx", import.meta.url), "utf8");
const familyPage = readFileSync(new URL("../app/families/[slug]/page.tsx", import.meta.url), "utf8");
const guidePage = readFileSync(new URL("../app/guides/[slug]/page.tsx", import.meta.url), "utf8");
const discoveryReport = readFileSync(new URL("../scripts/report-discovery-quality.ts", import.meta.url), "utf8");
const clean = (value: string) => value.replace(/\s+/g, " ").trim().toLocaleLowerCase("en-ZA");

test("all 19 application pages have meaningful guidance and distinct decision paths", () => {
  assert.equal(content.indexableApplications.length, 19);
  assert.deepEqual(Object.keys(content.applicationGuidance).sort(), [...content.indexableApplications].sort());
  const decisionPaths = new Set<string>();
  for (const value of content.indexableApplications) {
    const guidance = content.applicationGuidance[value];
    assert.ok(guidance.directAnswer.length > 80, value);
    assert.ok(guidance.hardwareSummary.length > 80, value);
    assert.ok(guidance.considerations.length >= 4, value);
    assert.ok(guidance.selectionPath.split(/(?<=[.!?])\s+/).length >= 2, value);
    decisionPaths.add(clean(guidance.selectionPath));
    assert.equal(productApplicationLabel(value).includes("  "), false, value);
  }
  assert.equal(decisionPaths.size, 19);
});

test("application guidance avoids raw taxonomy, evidence language and copied templates", () => {
  const answers = Object.values(content.applicationGuidance).map((guidance) => clean(guidance.directAnswer));
  assert.equal(new Set(answers).size, answers.length);
  const copy = Object.values(content.applicationGuidance).flatMap((guidance) => [guidance.directAnswer, guidance.hardwareSummary, ...guidance.considerations, guidance.selectionPath, guidance.comparison?.caption ?? "", ...(guidance.comparison?.rows.flat() ?? [])]).join(" ");
  assert.doesNotMatch(copy, /https?:\/\/|evidence class|exact_product_source|family_source|no_verified_source|catalogue row|raw taxonomy|source url/i);
  assert.doesNotMatch(copy, /choose (?:a|the) model that best suits your requirements|compare connectivity options|consider power and installation needs/i);
});

test("the six newly curated applications expose grounded selection tables", () => {
  const expected = ["Generic Node / RS485", "Water Leak Detect", "Generic Node", "Gateway: LoRaWAN", "Power Outage Monitoring Sensor", "Antenna"];
  for (const value of expected) {
    const comparison = content.applicationGuidance[value]?.comparison;
    assert.ok(comparison, value);
    assert.deepEqual(comparison.headers, ["Option", "Stated distinction", "Confirm next"], value);
    assert.ok(comparison.rows.length >= 2, value);
    assert.ok(comparison.rows.every((row) => row.length === comparison.headers.length), value);
  }
});

test("family pages expose safe variant guidance and explicit representative matrices", () => {
  assert.equal(content.families.length, 7);
  for (const family of content.families) {
    assert.ok(family.variantGuidance.length > 100, family.slug);
    assert.ok(family.representativeSkus.length >= 2 && family.representativeSkus.length <= 4, family.slug);
    const members = catalogue.products.filter((product) => { const sku = clean(product.sku); const prefix = clean(family.skuPrefix); return sku === prefix || sku.startsWith(`${prefix}-`); });
    for (const sku of family.representativeSkus) assert.ok(members.some((product) => clean(product.sku) === clean(sku)), `${family.slug}: ${sku}`);
    assert.match([family.variantGuidance, ...family.selectionPath].join(" "), /connectivity|LoRaWAN|LTE CAT 1|power|battery|solar/i, family.slug);
    assert.doesNotMatch(family.variantGuidance, /(?:LB|LS|KN|KS|GE|1T) means|suffix means|always means/i, family.slug);
  }
  assert.match(familyPage, /getFamilyRepresentativeProducts/);
  assert.match(familyPage, /Representative \$\{family\.name\} variant matrix/);
});

test("application and family relationships resolve to valid routes", () => {
  const familySlugs = new Set(content.families.map((family) => family.slug));
  const guideSlugs = new Set(content.guides.map((guide) => guide.slug));
  for (const [application, guidance] of Object.entries(content.applicationGuidance)) {
    for (const slug of guidance.relatedFamilySlugs ?? []) assert.ok(familySlugs.has(slug), `${application} -> family ${slug}`);
    for (const slug of guidance.relatedGuideSlugs ?? []) assert.ok(guideSlugs.has(slug), `${application} -> guide ${slug}`);
  }
  for (const family of content.families) for (const slug of family.relatedGuideSlugs) assert.ok(guideSlugs.has(slug), `${family.slug} -> guide ${slug}`);
});

test("application, family and guide templates retain comparison and enquiry paths", () => {
  assert.match(facetPage, /Compare representative products/);
  assert.match(facetPage, /href="\/contact">Discuss this application/);
  assert.match(familyPage, /Open the selected comparison/);
  assert.match(familyPage, /Enquire about \{family\.name\}/);
  assert.match(guidePage, /Compare representative products/);
  assert.match(guidePage, /href="\/contact">Discuss this buying decision/);
  assert.doesNotMatch(`${facetPage} ${familyPage} ${guidePage}`, /FAQPage|AggregateRating|"@type": "Review"/);
});

test("discovery reporting measures guide coverage and duplicate intent risk", () => {
  assert.equal(content.guides.length, 10);
  assert.match(discoveryReport, /applicationsWithRelevantGuideCoverage/);
  assert.match(discoveryReport, /decisionPath: percent\(guideRows/);
  assert.match(discoveryReport, /comparisonPath: percent\(guideRows/);
  assert.match(discoveryReport, /enquiryPath: percent\(guideRows/);
  assert.match(discoveryReport, /duplicateIntentRisk/);
});

