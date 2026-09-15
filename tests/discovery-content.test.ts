import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { summariseFamilyOverlap } from "../lib/product-presentation.ts";

// Read the raw content file directly rather than through lib/discovery.ts, which is
// "server-only" and cannot be imported by the plain node test runner.
const content = JSON.parse(readFileSync(new URL("../data/discovery-content.json", import.meta.url), "utf8")) as {
  indexableApplications: string[];
  applicationGuidance: Record<string, { directAnswer: string; hardwareSummary: string; considerations: string[]; selectionPath: string }>;
  guides: Array<{ slug: string; question: string; searchTerms: string[]; verifiedDocumentationOnly?: boolean; comparisonProductSlugs?: string[]; considerations: string[]; decisionPath: string[] }>;
};

const catalogue = JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; slug: string; application: string }> };
const documentation = JSON.parse(readFileSync(new URL("../data/product-documentation.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; status: string }> };

test("every application-guidance entry resolves to a real indexed application facet", () => {
  for (const value of Object.keys(content.applicationGuidance)) {
    assert.ok(content.indexableApplications.includes(value), `"${value}" has guidance but is not an indexable application facet`);
  }
});

test("the highest-count application facets have complete, non-empty guidance", () => {
  const expected = ["Distance Sensor", "Temperature Sensor", "Smart Agriculture", "Water Flow Sensor", "Pressure Sensor", "Temperature & Humidity Sensor"];
  for (const value of expected) {
    const guidance = content.applicationGuidance[value];
    assert.ok(guidance, `missing applicationGuidance for "${value}"`);
    assert.match(guidance.directAnswer, /\{count\}/, `"${value}" directAnswer should include the {count} placeholder`);
    assert.ok(guidance.hardwareSummary.length > 20, `"${value}" hardwareSummary looks too short`);
    assert.ok(guidance.considerations.length >= 3, `"${value}" should list at least 3 considerations`);
    assert.ok(guidance.selectionPath.length > 20, `"${value}" selectionPath looks too short`);
  }
});

test("application guidance is not one copy-pasted template across pages", () => {
  const answers = Object.values(content.applicationGuidance).map((guidance) => guidance.directAnswer);
  assert.equal(new Set(answers).size, answers.length, "two application facets share an identical directAnswer");
});

test("DDS comparison guide contains only exact-source DDS products", () => {
  const guide = content.guides.find((item) => item.slug === "compare-dds-distance-sensors");
  assert.ok(guide);
  assert.equal(guide.verifiedDocumentationOnly, true);
  assert.deepEqual(guide.comparisonProductSlugs, ["dds20-lb", "dds45-lb", "dds75-lb"]);
  assert.ok(content.indexableApplications.includes("Distance Sensor"));
  assert.ok(guide.comparisonProductSlugs.every((slug) => catalogue.products.some((product) => product.slug === slug)));
  assert.ok(guide.considerations.length >= 4);
  assert.ok(guide.decisionPath.length >= 3);

  const ddsProducts = catalogue.products.filter((product) => /^(?:DDS20|DDS45|DDS75)-/i.test(product.sku));
  const exactDdsSkus = new Set(documentation.products.filter((record) => /^(?:DDS20|DDS45|DDS75)-/i.test(record.sku) && record.status === "EXACT_PRODUCT_SOURCE").map((record) => record.sku));
  assert.ok(ddsProducts.length > exactDdsSkus.size);
  assert.ok(exactDdsSkus.size >= 3);
  assert.ok([...exactDdsSkus].every((sku) => ddsProducts.some((product) => product.sku === sku)));
  assert.ok(guide.searchTerms.every((term) => /^DDS(?:20|45|75)$/.test(term)));
});

test("DDS comparison copy avoids supplier provenance language", () => {
  const guide = content.guides.find((item) => item.slug === "compare-dds-distance-sensors");
  assert.ok(guide);
  const copy = [guide.question, ...guide.considerations, ...guide.decisionPath].join(" ");
  assert.doesNotMatch(copy, /manufacturer|official|verified|source|documentation|according to|Dragino/i);
  assert.doesNotMatch(copy, /dragino\.com/i);
});

test("summariseFamilyOverlap counts only members actually present in the facet", () => {
  const families = [
    { slug: "sw3l", name: "SW3L", memberSkus: ["SW3L-LB", "SW3L-NB", "SW3L-LTE"] },
    { slug: "s31b", name: "S31B", memberSkus: ["S31B-LB", "S31B-NB"] },
  ];
  const facetSkus = new Set(["SW3L-LB", "SW3L-NB", "OTHER-SKU"]);
  const overlap = summariseFamilyOverlap(families, facetSkus);
  assert.deepEqual(overlap, [
    { slug: "sw3l", name: "SW3L", matched: 2, total: 3 },
    { slug: "s31b", name: "S31B", matched: 0, total: 2 },
  ]);
});

test("summariseFamilyOverlap returns nothing extra when there are no families", () => {
  assert.deepEqual(summariseFamilyOverlap([], new Set(["ANY-SKU"])), []);
});
