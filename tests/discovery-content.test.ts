import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { summariseFamilyOverlap } from "../lib/product-presentation.ts";

// Read the raw content file directly rather than through lib/discovery.ts, which is
// "server-only" and cannot be imported by the plain node test runner.
const content = JSON.parse(readFileSync(new URL("../data/discovery-content.json", import.meta.url), "utf8")) as {
  indexableApplications: string[];
  indexableInterfaces: string[];
  applicationGuidance: Record<string, { directAnswer: string; hardwareSummary: string; considerations: string[]; selectionPath: string }>;
  guides: Array<{ slug: string; question: string; answerTemplate: string; differenceSummary: string; searchTerms: string[]; applicationValues: string[]; relatedFamilySlugs: string[]; verifiedDocumentationOnly?: boolean; comparisonProductSlugs?: string[]; considerations: string[]; decisionPath: string[] }>;
  families: Array<{ slug: string }>;
};

const catalogue = JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; slug: string; application: string; iotInterface: string; specification: string }> };
const documentation = JSON.parse(readFileSync(new URL("../data/product-documentation.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; status: string }> };
const facetDetail = readFileSync(new URL("../components/facet-detail.tsx", import.meta.url), "utf8");

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

test("Water Quality Measurement guidance supports safe buyer selection", () => {
  const guidance = content.applicationGuidance["Water Quality Measurement"];
  assert.ok(guidance);
  assert.match(guidance.directAnswer, /\{count\}/);
  assert.ok(guidance.considerations.length >= 5);
  const waterQualityProducts = catalogue.products.filter((product) => product.application.trim() === "Water Quality Measurement");
  const statuses = waterQualityProducts.map((product) => documentation.products.find((record) => record.sku === product.sku)?.status);
  assert.equal(waterQualityProducts.length, 29);
  assert.equal(statuses.filter((status) => status === "EXACT_PRODUCT_SOURCE").length, 5);
  assert.equal(statuses.filter((status) => status === "FAMILY_SOURCE").length, 10);
  assert.equal(statuses.filter((status) => status === "NO_VERIFIED_SOURCE").length, 14);
  assert.equal(statuses.filter((status) => status === "AMBIGUOUS").length, 0);
  assert.equal(waterQualityProducts.filter((product) => product.sku.trim().startsWith("WQS-")).length, 19);
  assert.ok(content.families.some((family) => family.slug === "wqs"));
  const guide = content.guides.find((item) => item.slug === "choose-water-monitoring-device");
  assert.ok(guide);
  assert.ok(guide.applicationValues.includes("Water Quality Measurement"));
  assert.ok(guide.relatedFamilySlugs.includes("wqs"));
  for (const connectivity of ["LoRaWAN", "NB-IoT", "NB-IoT, 10 years 500MB data", "LTE-M & NB-IoT", "LTE-M & NB-IoT, 10 years 500MB data", "LTE CAT 1"]) {
    assert.ok(content.indexableInterfaces.includes(connectivity), connectivity);
  }
  const copy = [guidance.directAnswer, guidance.hardwareSummary, ...guidance.considerations, guidance.selectionPath].join(" ");
  assert.match(copy, /EC|pH|dissolved oxygen|ORP|turbidity|chlorine/i);
  assert.match(copy, /Individual WQS product specifications note one to three probes/);
  assert.doesNotMatch(copy, /each WQS model|all WQS|every WQS/i);
  assert.doesNotMatch(copy, /all (?:water quality )?products|every (?:water quality )?product|manufacturer|official|verified|source|documentation|according to|Dragino|datasheet|manual/i);
  assert.doesNotMatch(copy, /dragino\.com|â€”|(?<!-)--(?!-)/);
});

test("Energy Control / Monitoring guidance supports a practical, bounded selection", () => {
  const guidance = content.applicationGuidance["Energy Control / Monitoring"];
  assert.ok(guidance);
  assert.match(guidance.directAnswer, /\{count\}/);
  assert.ok(guidance.considerations.length >= 5);

  const energyProducts = catalogue.products.filter((product) => product.application.trim() === "Energy Control / Monitoring");
  const statuses = energyProducts.map((product) => documentation.products.find((record) => record.sku === product.sku)?.status);
  assert.equal(energyProducts.length, 26);
  assert.equal(statuses.filter((status) => status === "EXACT_PRODUCT_SOURCE").length, 8);
  assert.equal(statuses.filter((status) => status === "FAMILY_SOURCE").length, 0);
  assert.equal(statuses.filter((status) => status === "NO_VERIFIED_SOURCE").length, 18);
  assert.equal(statuses.filter((status) => status === "AMBIGUOUS").length, 0);
  assert.ok(energyProducts.some((product) => product.sku === "CS01-LB"));
  assert.ok(energyProducts.some((product) => product.sku === "SCT013G-D-100" && product.iotInterface === "For CS01"));
  assert.ok(energyProducts.some((product) => product.sku === "LC01"));
  assert.ok(energyProducts.some((product) => product.sku === "LC03"));
  assert.ok(energyProducts.some((product) => product.sku === "Thermostat"));
  assert.equal(content.indexableInterfaces.includes("For CS01"), false);
  assert.equal(content.families.some((family) => family.slug === "cs01"), false);
  assert.equal(content.guides.some((guide) => guide.applicationValues.includes("Energy Control / Monitoring")), false);
  for (const connectivity of ["LoRaWAN", "LTE CAT 1", "NB-IoT", "LTE-M & NB-IoT", "LTE-M & NB-IoT, 10 years 500MB data", "NB-IoT, 10 years 500MB data"]) {
    assert.ok(content.indexableInterfaces.includes(connectivity), connectivity);
  }

  const copy = [guidance.directAnswer, guidance.hardwareSummary, ...guidance.considerations, guidance.selectionPath].join(" ");
  assert.match(copy, /current monitoring|electrical control|thermostat/i);
  assert.doesNotMatch(copy, /all (?:energy )?products|every (?:energy )?product|manufacturer|official|verified|source|documentation|according to|Dragino|datasheet|manual/i);
  assert.doesNotMatch(copy, /dragino\.com|â€”|Ã¢â‚¬â€|(?<!-)--(?!-)/);
});

test("Door Sensor guidance supports a practical, bounded selection", () => {
  const guidance = content.applicationGuidance["Door Sensor"];
  assert.ok(guidance);
  assert.match(guidance.directAnswer, /\{count\}/);
  assert.ok(guidance.considerations.length >= 5);

  const doorProducts = catalogue.products.filter((product) => product.application.trim() === "Door Sensor");
  const statuses = doorProducts.map((product) => documentation.products.find((record) => record.sku === product.sku)?.status);
  assert.equal(doorProducts.length, 22);
  assert.equal(statuses.filter((status) => status === "EXACT_PRODUCT_SOURCE").length, 7);
  assert.equal(statuses.filter((status) => status === "FAMILY_SOURCE").length, 0);
  assert.equal(statuses.filter((status) => status === "NO_VERIFIED_SOURCE").length, 15);
  assert.equal(statuses.filter((status) => status === "AMBIGUOUS").length, 0);
  assert.ok(doorProducts.some((product) => product.sku === "DS03A-LB" && /Datalog Feature, Open Alarm Feature/i.test(product.specification)));
  assert.ok(doorProducts.some((product) => product.sku === "LDS02" && /Door Open\/Close detect/i.test(product.specification)));
  assert.ok(doorProducts.some((product) => product.sku === "LHT65N-DS" && /1 meter metal Door Sensor/i.test(product.specification)));
  assert.equal(content.families.some((family) => /door|ds03|lds02/i.test(family.slug)), false);
  assert.equal(content.guides.some((guide) => guide.applicationValues.includes("Door Sensor")), false);
  for (const connectivity of ["LoRaWAN", "LTE CAT 1", "NB-IoT", "LTE-M & NB-IoT", "LTE-M & NB-IoT, 10 years 500MB data", "NB-IoT, 10 years 500MB data"]) {
    assert.ok(content.indexableInterfaces.includes(connectivity), connectivity);
  }

  const copy = [guidance.directAnswer, guidance.hardwareSummary, ...guidance.considerations, guidance.selectionPath].join(" ");
  assert.match(copy, /open or closed|open\/close|open-alarm/i);
  assert.match(copy, /Some DS03A product specifications state datalog and open-alarm features/);
  assert.doesNotMatch(copy, /all DS03A|every DS03A/i);
  assert.doesNotMatch(copy, /all (?:door sensor )?products|every (?:door sensor )?product|manufacturer|official|verified|source|documentation|according to|Dragino|datasheet|manual/i);
  assert.doesNotMatch(copy, /dragino\.com|â€”|Ã¢â‚¬â€|(?<!-)--(?!-)/);
});

test("application guidance avoids import-led public wording", () => {
  const copy = Object.values(content.applicationGuidance).flatMap((guidance) => [guidance.directAnswer, guidance.hardwareSummary, ...guidance.considerations, guidance.selectionPath]).join(" ");
  assert.doesNotMatch(copy, /This catalogue (lists|includes)|\blisted (?:for|as)\b|catalogue products|catalogue entries/i);
});

test("guided application family overlap uses customer-friendly punctuation", () => {
  assert.match(facetDetail, /<\/Link>, \{entry\.matched\}/);
  assert.doesNotMatch(facetDetail, /<\/Link> — \{entry\.matched\}/);
});

test("gateway guide provides verified decision support without supplier language", () => {
  const guide = content.guides.find((item) => item.slug === "choose-lorawan-gateway");
  assert.ok(guide);
  assert.deepEqual(guide.comparisonProductSlugs, ["lps8n", "lps8v2", "ms48-lr", "dlos8n"]);
  assert.ok(guide.considerations.length >= 5);
  assert.ok(guide.decisionPath.length >= 4);
  const copy = [guide.question, guide.answerTemplate, ...guide.considerations, guide.differenceSummary, ...guide.decisionPath].join(" ");
  assert.match(copy, /indoor|outdoor/i);
  assert.match(copy, /Wi-Fi|Ethernet/i);
  assert.match(copy, /optional cellular|optional 4G/i);
  assert.doesNotMatch(copy, /manufacturer|official|verified|source|documentation|according to|Dragino|datasheet|manual/i);
  assert.doesNotMatch(copy, /coverage|throughput|number of devices|cloud compatibility|redundancy/i);
  assert.doesNotMatch(copy, /dragino\.com|docs\.dragino\.com/i);
  for (const slug of guide.comparisonProductSlugs) assert.ok(catalogue.products.some((product) => product.slug === slug), slug);
});

test("Smart Weather Station guidance provides evidence-based selection support", () => {
  const guidance = content.applicationGuidance["Smart Weather Station"];
  assert.ok(guidance);
  assert.match(guidance.directAnswer, /\{count\}/);
  assert.ok(guidance.hardwareSummary.length > 40);
  assert.ok(guidance.considerations.length >= 5);
  assert.ok(guidance.selectionPath.length > 40);
  assert.match(guidance.hardwareSummary, /WSC2|WSS/);
  const copy = [guidance.directAnswer, guidance.hardwareSummary, ...guidance.considerations, guidance.selectionPath].join(" ");
  assert.doesNotMatch(copy, /every|all .*products|manufacturer|official|verified|source|documentation|according to|Dragino|datasheet|manual/i);
  assert.doesNotMatch(copy, /—|(?<!-)--(?!-)/);
  assert.ok(content.indexableApplications.includes("Smart Weather Station"));
  assert.ok(content.families.some((family) => family.slug === "wsc2"));
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
