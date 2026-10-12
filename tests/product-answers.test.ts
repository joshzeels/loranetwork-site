import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildComparisonFields, buildProductAnswers, parseProductSpecification, selectRelatedProducts, type AnswerDocumentationStatus } from "../lib/product-answers.ts";

type CatalogueProduct = { sku: string; slug: string; application: string; specification: string; iotInterface: string; priceUsd: string };
type Guidance = { sku: string; definition?: string; uses?: string; suitability?: string; buyerChecks?: string[]; evidenceLevel: "EXACT_PRODUCT_SOURCE" | "FAMILY_SOURCE" };

const catalogue = JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as { products: CatalogueProduct[] };
const guidance = JSON.parse(readFileSync(new URL("../data/product-guidance.json", import.meta.url), "utf8")) as { products: Guidance[] };
const documentation = JSON.parse(readFileSync(new URL("../data/product-documentation.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; status: string; sourceUrl: string }> };
const productPage = readFileSync(new URL("../app/products/[slug]/page.tsx", import.meta.url), "utf8");
const comparison = readFileSync(new URL("../components/product-comparison.tsx", import.meta.url), "utf8");
const comparePage = readFileSync(new URL("../app/compare/page.tsx", import.meta.url), "utf8");
const coverageReport = readFileSync(new URL("../scripts/report-product-answer-coverage.ts", import.meta.url), "utf8");

function product(sku: string) {
  const record = catalogue.products.find((item) => item.sku === sku);
  assert.ok(record, sku);
  return record;
}

function productGuidance(sku: string) {
  return guidance.products.find((item) => item.sku === sku);
}

function documentationStatus(sku: string) {
  return documentation.products.find((item) => item.sku === sku)?.status as AnswerDocumentationStatus | undefined;
}

test("preserves exact-source guidance as the strongest opening answer", () => {
  const answers = buildProductAnswers(product("DDS75-LB"), productGuidance("DDS75-LB"), documentationStatus("DDS75-LB"));
  assert.match(answers.opening, /ultrasonic distance detection sensor/i);
  assert.ok(answers.beforeOrdering.length >= 1);
  assert.equal(answers.evidenceClass, "EXACT");
});

test("distinguishes family, catalogue-only, ambiguous and unverified evidence without exposing it", () => {
  for (const [sku, status, evidence] of [["WQS-LB2", "FAMILY_SOURCE", "FAMILY"], ["RBwAPR-2nD&R11e-LR8", undefined, "CATALOGUE_ONLY"], ["SW3L-LB2-004", "AMBIGUOUS", "AMBIGUOUS"], ["DDS75-LB2", "NO_VERIFIED_SOURCE", "UNVERIFIED"]] as const) {
    const record = documentation.products.find((item) => item.sku === sku);
    assert.equal(record?.status, status, sku);
    const answers = buildProductAnswers(product(sku), productGuidance(sku), documentationStatus(sku));
    assert.equal(answers.evidenceClass, evidence, sku);
    assert.ok(answers.opening.length > 20, sku);
    assert.ok(answers.answerDimensions.includes("function"), sku);
  }
});

test("uses guidance only when its evidence level matches the documentation status", () => {
  const base = product("DDS75-LB2");
  const exactCopy = { definition: "Unsupported inherited definition.", uses: "Unsupported inherited use.", buyerChecks: ["Unsupported inherited check."], evidenceLevel: "EXACT_PRODUCT_SOURCE" as const };
  const unverified = buildProductAnswers(base, exactCopy, "NO_VERIFIED_SOURCE");
  assert.doesNotMatch([unverified.opening, unverified.functionAnswer, ...unverified.beforeOrdering].join(" "), /Unsupported inherited/);

  const familyCopy = { definition: "A family-safe distance sensor.", uses: "It measures liquid levels without contact.", evidenceLevel: "FAMILY_SOURCE" as const };
  const family = buildProductAnswers(base, familyCopy, "FAMILY_SOURCE");
  assert.equal(family.opening, familyCopy.definition);
  assert.equal(family.functionAnswer, familyCopy.uses);
});

test("derives only direct power, probe and before-ordering answers", () => {
  const rs485 = buildProductAnswers(product("RS485-LN"), productGuidance("RS485-LN"), documentationStatus("RS485-LN"));
  assert.equal(rs485.sensorOrProbe, undefined);
  assert.ok(rs485.beforeOrdering.some((check) => /protocol|register|modbus/i.test(check)));
  assert.equal(rs485.beforeOrdering.filter((check) => /protocol|register|modbus/i.test(check)).length, 1);

  const solar = buildProductAnswers(product("SW3L-LS-004"));
  assert.match(solar.power ?? "", /solar panel/i);
  assert.ok(solar.beforeOrdering.includes("Confirm the required power configuration."));
});

test("covers representative gateway, LoRaWAN, LTE CAT 1, and accessory products conservatively", () => {
  const gateway = buildProductAnswers(product("LPS8N"), productGuidance("LPS8N"), documentationStatus("LPS8N"));
  const lorawan = buildProductAnswers(product("DDS75-LB2"), undefined, documentationStatus("DDS75-LB2"));
  const cellular = buildProductAnswers(product("S31-KS-GE"), productGuidance("S31-KS-GE"), documentationStatus("S31-KS-GE"));
  const accessory = buildProductAnswers(product("DR-SI"));
  assert.match(gateway.opening, /gateway/i);
  assert.equal(lorawan.semanticFacts.connectivityLabel, "LoRaWAN");
  assert.equal(cellular.semanticFacts.connectivityLabel, "LTE CAT 1");
  assert.equal(lorawan.connectivity, undefined);
  assert.equal(accessory.isAccessory, true);
  assert.equal(accessory.functionAnswer, undefined);
});

test("does not create answer sections from missing fields", () => {
  const answers = buildProductAnswers({ sku: "EMPTY", application: "", specification: "", iotInterface: "" });
  assert.equal(answers.opening, "EMPTY is an IoT product.");
  assert.equal(answers.functionAnswer, undefined);
  assert.equal(answers.connectivity, undefined);
  assert.equal(answers.power, undefined);
  assert.equal(answers.sensorOrProbe, undefined);
  assert.deepEqual(answers.beforeOrdering, []);
});

test("classifies measurement, radio and physical ranges by meaning", () => {
  const radio = parseProductSpecification({ sku: "GW", application: "Gateway: LoRaWAN", iotInterface: "LoRaWAN", specification: "Wireless range: 2 km to 15 km" });
  const cable = parseProductSpecification({ sku: "CABLE", application: "Temperature Sensor", iotInterface: "LoRaWAN", specification: "Cable length: 2 m" });
  const probe = parseProductSpecification({ sku: "PROBE", application: "Temperature Sensor", iotInterface: "LoRaWAN", specification: "External probe length: 3 m" });
  const distance = parseProductSpecification({ sku: "DIST", application: "Distance Sensor", iotInterface: "LoRaWAN", specification: "Flat object range 280 mm - 7500 mm" });
  const temperature = parseProductSpecification({ sku: "TEMP", application: "Temperature Sensor", iotInterface: "LoRaWAN", specification: "Temperature range -40°C to 85°C" });
  const pressure = parseProductSpecification({ sku: "PRESS", application: "Pressure Sensor", iotInterface: "LoRaWAN", specification: "Pressure range 0 bar to 10 bar" });
  const airflow = parseProductSpecification({ sku: "AIR", application: "Air Flow Sensor", iotInterface: "LoRaWAN", specification: "Measurement Range: 0~5/10/30 m/s (selectable)" });
  const co2 = parseProductSpecification({ sku: "CO2", application: "CO2 Sensor", iotInterface: "LoRaWAN", specification: "CO2: 400ppm to 5000 ppm; Temp: 0~60°C; Humidity: 0~99.9%RH" });
  assert.equal(radio.measurementRanges.length, 0);
  assert.equal(radio.radioRanges.length, 1);
  assert.equal(cable.measurementRanges.length, 0);
  assert.equal(cable.physicalLengths.length, 1);
  assert.equal(probe.measurementRanges.length, 0);
  assert.equal(probe.physicalLengths.length, 1);
  assert.equal(distance.measurementRanges[0]?.kind, "distance");
  assert.equal(temperature.measurementRanges[0]?.kind, "temperature");
  assert.equal(pressure.measurementRanges[0]?.kind, "pressure");
  assert.equal(airflow.measurementRanges[0]?.value, "0 to 5, 0 to 10, or 0 to 30 m/s");
  assert.deepEqual(co2.measurementRanges.map((range) => range.kind), ["co2", "temperature", "humidity"]);
});

test("separates battery monitoring from real power configurations", () => {
  const monitoring = parseProductSpecification({ sku: "MON", application: "Water Quality Measurement", iotInterface: "LoRaWAN", specification: "Monitor battery Level" });
  const battery = parseProductSpecification({ sku: "BAT", application: "Tracker", iotInterface: "LoRaWAN", specification: "1000 mAh rechargeable Li-ion battery" });
  const solar = parseProductSpecification({ sku: "SOLAR", application: "Tracker", iotInterface: "LoRaWAN", specification: "Solar panel + 3000mAh Li-ion battery" });
  const waterQuality = parseProductSpecification(product("WQS-LB2"));
  assert.equal(monitoring.batteryMonitoring, true);
  assert.equal(monitoring.powerSummary, undefined);
  assert.equal(battery.batteryCapacity, "1000 mAh");
  assert.equal(battery.powerSummary, "Power is provided by a 1000 mAh rechargeable Li-ion battery.");
  assert.equal(solar.solar, true);
  assert.match(solar.powerSummary ?? "", /solar panel and 3000 mAh Li-ion battery/i);
  assert.equal(waterQuality.batteryMonitoring, true);
  assert.doesNotMatch(waterQuality.powerSummary ?? "", /monitor battery/i);
});

test("distinguishes contained probes from supported interfaces", () => {
  for (const term of ["RS485", "UART", "Modbus", "LoRaWAN", "LTE CAT 1"]) {
    const facts = parseProductSpecification({ sku: term, application: "Generic Node", iotInterface: term, specification: term });
    assert.equal(facts.sensorHeadline, undefined, term);
  }
  const external = parseProductSpecification({ sku: "EXT", application: "Temperature Sensor", iotInterface: "LoRaWAN", specification: "External 3 meters SHT31 probe" });
  const controller = parseProductSpecification({ sku: "CTRL", application: "Generic Node / RS485", iotInterface: "LoRaWAN", specification: "RS485 interface for RS485 / Modbus sensor" });
  assert.equal(external.sensorMode, "external");
  assert.equal(external.sensorHeadline, "It uses an external 3 m SHT31 probe.");
  assert.equal(external.measurementRanges.length, 0);
  assert.equal(controller.sensorMode, "supported");
  assert.match(controller.sensorHeadline ?? "", /^It supports external RS485 and Modbus sensor connections/);
  assert.doesNotMatch(controller.sensorHeadline ?? "", /^It uses/);
});

test("suppresses repeated function and basic connectivity sections", () => {
  const answers = buildProductAnswers({ sku: "TEMP-LB", application: "Temperature Sensor", iotInterface: "LoRaWAN", specification: "8500mAh" });
  assert.match(answers.opening, /LoRaWAN temperature sensor/i);
  assert.equal(answers.functionAnswer, undefined);
  assert.equal(answers.connectivity, undefined);
  assert.ok(answers.suppressedRedundantSections.includes("function"));
  assert.ok(answers.suppressedRedundantSections.includes("connectivity"));
});

test("creates variant answers only from explicit differences among curated peers", () => {
  const solar = { sku: "FAMILY-LS", application: "Temperature Sensor", iotInterface: "LoRaWAN", specification: "Solar panel + 3000mAh Li-ion battery" };
  const battery = { sku: "FAMILY-LB", application: "Temperature Sensor", iotInterface: "LoRaWAN", specification: "8500mAh" };
  const supported = buildProductAnswers(solar, undefined, "NO_VERIFIED_SOURCE", { familyName: "Example", familyProducts: [solar, battery] });
  const unsupported = buildProductAnswers({ ...solar, sku: "UNRELATED-LS" });
  assert.match(supported.modelOrVariant ?? "", /different power configurations/i);
  assert.equal(unsupported.modelOrVariant, undefined);
  assert.doesNotMatch(supported.modelOrVariant ?? "", /LS means|LB means|suffix/i);
});

test("before-ordering range checks apply only to measurement ranges", () => {
  const gateway = buildProductAnswers(product("RBwAPR-2nD&R11e-LR8"));
  const distance = buildProductAnswers({ sku: "DIST", application: "Distance Sensor", iotInterface: "LoRaWAN", specification: "Flat object range 280 mm - 7500 mm" });
  assert.ok(gateway.semanticFacts.radioRanges.length);
  assert.ok(!gateway.beforeOrdering.some((check) => /measurement range/i.test(check)));
  assert.ok(distance.beforeOrdering.some((check) => /measurement range/i.test(check)));
});

test("never leaks evidence terminology, source URLs, or unsupported claim patterns into answers", () => {
  const publicCopy = catalogue.products.map((record) => {
    const answers = buildProductAnswers(record, productGuidance(record.sku), documentationStatus(record.sku));
    return [answers.opening, answers.functionAnswer, answers.connectivity, answers.power, answers.sensorOrProbe, answers.modelOrVariant, ...answers.beforeOrdering].filter(Boolean).join(" ");
  }).join(" ");
  assert.doesNotMatch(publicCopy, /https?:\/\/|official|verified|source|documentation|manufacturer|battery life|radio range|certif/i);
  const unverifiedCopy = catalogue.products.filter((record) => documentationStatus(record.sku) === "NO_VERIFIED_SOURCE").map((record) => JSON.stringify(buildProductAnswers(record, productGuidance(record.sku), documentationStatus(record.sku)))).join(" ");
  assert.doesNotMatch(unverifiedCopy, /\bIP\d{2}\b|battery life|radio range|certif/i);
});

test("related products use family membership first and remain deterministic", () => {
  const current = product("DDS75-LB");
  const candidates = catalogue.products.map((item) => ({ ...item, imagePath: "" }));
  const familySkus = catalogue.products.filter((item) => /^DDS75-/i.test(item.sku)).map((item) => item.sku);
  const first = selectRelatedProducts(current, candidates, familySkus);
  const second = selectRelatedProducts(current, candidates, familySkus);
  assert.deepEqual(first.map((item) => item.sku), second.map((item) => item.sku));
  assert.ok(first.length > 0 && first.length <= 4);
  assert.ok(first.every((item) => /^DDS75-/i.test(item.sku) && item.sku !== current.sku));
});

test("comparison fields are buyer-oriented, deterministic, and omit universally missing details", () => {
  const products = [product("DDS75-LB"), product("DDS75-LB2")];
  const fields = buildComparisonFields(products);
  assert.deepEqual(fields.map((field) => field.label), buildComparisonFields(products).map((field) => field.label));
  assert.ok(fields.some((field) => field.label === "Primary function"));
  assert.ok(fields.some((field) => field.label === "Connectivity"));
  assert.ok(fields.every((field) => field.values.some(Boolean)));
  assert.doesNotMatch(JSON.stringify(fields), /Gateway\s*--\s*LoRaWAN/);

  const emptyFields = buildComparisonFields([{ sku: "A", application: "", specification: "", iotInterface: "" }, { sku: "B", application: "", specification: "", iotInterface: "" }]);
  assert.deepEqual(emptyFields, []);
});

test("keeps priced, contact-for-pricing, and accessory records intact", () => {
  assert.ok(Number(product("DDS75-LB").priceUsd) > 0);
  assert.equal(product("AS-02").priceUsd, "");
  assert.equal(buildProductAnswers(product("AS-02"), undefined, documentationStatus("AS-02")).isAccessory, true);
  assert.match(productPage, /getPublicPriceForProduct\(product\.sku, product\.priceUsd\)/);
  assert.match(productPage, /className="price-panel"/);
});

test("product pages use answer sections, comparison uses meaningful rows, and compare remains noindex", () => {
  assert.match(productPage, /What does it do\?/);
  assert.match(productPage, /How does it connect\?/);
  assert.match(productPage, /Before ordering/);
  assert.doesNotMatch(productPage, /documentation\.sourceUrl|dragino\.com/i);
  assert.doesNotMatch(productPage, /answers\.evidenceClass|EXACT_PRODUCT_SOURCE|FAMILY_SOURCE|CATALOGUE_ONLY|AMBIGUOUS|UNVERIFIED/);
  assert.match(productPage, /selectRelatedProducts/);
  assert.match(productPage, /Which model or variant is this\?/);
  assert.match(productPage, /familyName: family\?\.name, familyProducts/);
  assert.doesNotMatch(productPage, /<section id="overview"[^]*<dt>Connectivity<\/dt>/);
  assert.match(comparison, /buildComparisonFields/);
  assert.doesNotMatch(comparison, /Package dimensions \(mm\).*Package weight \(g\)/);
  assert.match(comparePage, /robots: \{ index: false, follow: true \}/);
});

test("coverage reporting measures semantic distinctiveness rather than section presence alone", () => {
  for (const metric of ["openingAndFunctionMateriallyDistinct", "connectivityNotUnnecessarilyRepeated", "atLeastTwoDecisionUsefulDimensions", "atLeastThreeDecisionUsefulDimensions", "meaningfulModelVariant", "semanticallyDuplicatedVisibleSections", "beforeOrderingAddsDecisionInformation", "pagesWithRedundantSectionsRemoved"]) {
    assert.match(coverageReport, new RegExp(metric));
  }
  assert.match(coverageReport, /answers\.answerDimensions/);
});
