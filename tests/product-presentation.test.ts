import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { displayValue, facetValue, productApplicationLabel, productConnectivityLabel, productDefinition, productDisplayName, productFit, productSummary, sentenceAwareDescription, specificationItems } from "../lib/product-presentation.ts";

const catalogue = JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as { products: Array<Record<string, string>> };
const documentation = JSON.parse(readFileSync(new URL("../data/product-documentation.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; status: string }> };
const guidance = JSON.parse(readFileSync(new URL("../data/product-guidance.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; definition?: string; uses?: string; suitability?: string; buyerChecks?: string[]; sourceUrl?: string; evidenceLevel: string }> };
const productPage = readFileSync(new URL("../app/products/[slug]/page.tsx", import.meta.url), "utf8");

test("cleans presentation artefacts without changing stored source values", () => {
  const sourceSku = "Â\u00a0SN50v3-MS";
  assert.equal(productDisplayName(sourceSku), "SN50v3-MS");
  assert.equal(sourceSku, "Â\u00a0SN50v3-MS");
  assert.equal(productDisplayName("Type N Enclosure KitÂ\u00a0"), "Type N Enclosure Kit");
});

test("normalises confirmed catalogue typos and equivalent facet labels", () => {
  assert.equal(displayValue("emperature & Humidity Sensor "), "Temperature & Humidity Sensor");
  assert.equal(displayValue("UVC Radation Sensor"), "UVC Radiation Sensor");
  assert.equal(displayValue("LTE-M&NB-loT(NRF9151)"), "LTE-M & NB-IoT (NRF9151)");
  assert.equal(facetValue("LTE CAT-1"), facetValue("LTE CAT 1"));
});

test("builds a factual summary only from supplied catalogue fields", () => {
  assert.equal(productSummary({ sku: "AIS01-LB", application: "Angle Sensor / Tilting", iotInterface: "LoRaWAN" }), "AIS01-LB supports angle sensor and tilting projects. Connectivity is via LoRaWAN.");
  assert.equal(productDefinition({ sku: "RS485W-LB", application: "Generic Node / RS485", iotInterface: "LoRaWAN" }), "RS485W-LB is an IoT node for RS485 projects. Connectivity is via LoRaWAN.");
  assert.equal(productApplicationLabel("Gateway -- LoRaWAN"), "LoRaWAN gateway");
  assert.equal(productApplicationLabel("Generic Node / RS485"), "Generic node and RS485");
  assert.equal(productConnectivityLabel("LoRaWAN"), "LoRaWAN");
  assert.equal(productConnectivityLabel("NB-IoT"), "NB-IoT");
  assert.equal(productConnectivityLabel("LTE-M & NB-IoT"), "LTE-M & NB-IoT");
  assert.equal(productConnectivityLabel("LTE-M & NB-IoT, 10 years 500MB data"), "LTE-M & NB-IoT, 10 years / 500MB data");
  assert.equal(productConnectivityLabel("NB-IoT, 10 years 500MB data"), "NB-IoT, 10 years / 500MB data");
  assert.equal(productConnectivityLabel("RS485, For WSC2"), "RS485 for WSC2");
});

test("writes natural conservative fallback copy across representative products", () => {
  const samples = [
    { sku: "WSC2-L", application: "Smart Weather Station", iotInterface: "LoRaWAN" },
    { sku: "DLOS8N", application: "Gateway -- LoRaWAN", iotInterface: "LoRaWAN" },
    { sku: "DDS75-LB2", application: "Distance Sensor", iotInterface: "LoRaWAN" },
    { sku: "S31B-KS-GE", application: "Temperature & Humidity Sensor", iotInterface: "LTE CAT 1" },
    { sku: "WQS-LB2", application: "Water Quality Measurement", iotInterface: "LoRaWAN" },
    { sku: "RS485-KS-GE", application: "Generic Node / RS485", iotInterface: "LTE CAT 1" },
    { sku: "WL03A-LB", application: "Water Leak Detect", iotInterface: "LoRaWAN" },
    { sku: "CS01-LB", application: "Energy Control / Monitoring", iotInterface: "LoRaWAN" },
    { sku: "PS-LB2-Txx", application: "Pressure Sensor", iotInterface: "LoRaWAN" },
    { sku: "WSS-09", application: "Smart Weather Station", iotInterface: "RS485, For WSC2" },
    { sku: "LPS8N-EC25", application: "Gateway -- LoRaWAN", iotInterface: "LoRaWAN" },
    { sku: "DS03A-LB", application: "Door Sensor", iotInterface: "LoRaWAN" },
  ];
  for (const sample of samples) {
    const catalogueProduct = catalogue.products.find((product) => product.sku === sample.sku);
    assert.equal(displayValue(catalogueProduct?.application ?? ""), sample.application, `${sample.sku} application`);
    assert.equal(displayValue(catalogueProduct?.iotInterface ?? ""), sample.iotInterface, `${sample.sku} connectivity`);
    const copy = `${productDefinition(sample)} ${productFit(sample)}`;
    assert.doesNotMatch(copy, /is listed for|listed as|Consider it where|available project connectivity option|Confirm any requirement that is not stated|manufacturer|official|verified|source|documentation|according to|Dragino|datasheet|manual/i, sample.sku);
    assert.doesNotMatch(copy, /—|(?<!-)--(?!-)/, sample.sku);
    assert.ok(copy.length > 30, sample.sku);
  }
  assert.match(productDefinition({ sku: "WQS-KS-GE", application: "Water Quality Measurement", iotInterface: "LTE-M & NB-IoT, 10 years 500MB data" }), /LTE-M & NB-IoT, 10 years \/ 500MB data/);
  assert.match(productFit({ sku: "LPS8N-EC25", application: "Gateway -- LoRaWAN", iotInterface: "LTE-M & NB-IoT" }), /LoRaWAN gateway\. Connectivity is via LTE-M & NB-IoT/);
});

test("provides verified DDS75-LB guidance without changing catalogue data", () => {
  const record = guidance.products.find((item) => item.sku === "DDS75-LB");
  const product = catalogue.products.find((item) => item.sku === "DDS75-LB");
  assert.ok(record);
  assert.equal(record.evidenceLevel, "EXACT_PRODUCT_SOURCE");
  assert.match(record.definition ?? "", /ultrasonic distance detection sensor/i);
  assert.match(record.definition ?? "", /LoRaWAN/i);
  assert.ok(record.suitability);
  assert.doesNotMatch(record.suitability ?? "", /factory|agriculture|healthcare|mining/i);
  assert.ok(record.buyerChecks?.some((check) => check.includes("280–7500 mm")));
  assert.equal(product?.packageDimensionMm, "145*105*50");
  assert.equal(product?.packageWeightG, "270");
});

test("provides exact-source guidance for the selected representative products", () => {
  const selected = ["SW3L-004", "S31-LB", "D20S-LB", "SDI-12-LB", "PS-LB-Dxx", "RS485-LN", "WQS-LB", "LPS8N"];
  for (const sku of selected) {
    const record = guidance.products.find((item) => item.sku === sku);
    assert.ok(record, sku);
    assert.equal(record.evidenceLevel, "EXACT_PRODUCT_SOURCE", sku);
    assert.ok(record.definition, sku);
    assert.ok(record.suitability, sku);
    assert.ok(record.buyerChecks && record.buyerChecks.length >= 3, sku);
    assert.match(record.sourceUrl ?? "", /^https:\/\/www\.dragino\.com\//, sku);
  }
  assert.equal(guidance.products.length, selected.length + 1);
});

test("keeps supplier provenance language out of public guidance fields", () => {
  const publicFields = guidance.products.flatMap((record) => [record.definition, record.uses, record.suitability, ...(record.buyerChecks ?? [])]).filter(Boolean).join(" ");
  assert.doesNotMatch(publicFields, /source|documentation|manufacturer|according to|verified|official|datasheet|manual/i);
});

test("keeps Dragino source URLs out of the public product page", () => {
  assert.doesNotMatch(productPage, /dragino\.com|docs\.dragino\.com/i);
  assert.doesNotMatch(productPage, /documentation\.sourceUrl/);
  assert.match(productPage, /Manufacturer<\/dt><dd>Dragino/);
  assert.match(productPage, /href={`\/contact\?sku=/);
  assert.match(productPage, /guidance\?\.suitability \?\? productFit\(product\)/);
});

test("keeps representative weak-evidence products on conservative fallback", () => {
  const sample = [
    ["SW3L-004", "Water Flow Sensor", "EXACT_PRODUCT_SOURCE"],
    ["S31B-LB", "Temperature & Humidity  Sensor", "EXACT_PRODUCT_SOURCE"],
    ["D20S-LB", "Temperature Sensor", "EXACT_PRODUCT_SOURCE"],
    ["SDI-12-LB", "Smart Agriculture", "EXACT_PRODUCT_SOURCE"],
    ["PS-LB-Txx or PS-LB-Ixx", "Pressure Sensor", "NO_VERIFIED_SOURCE"],
    ["RS485-LB", "Generic Node / RS485", "EXACT_PRODUCT_SOURCE"],
    ["RS485-KS-GE", "Generic Node / RS485", "NO_VERIFIED_SOURCE"],
    ["WQS-LB", "Water Quality Measurement", "EXACT_PRODUCT_SOURCE"],
    ["WQS-LB2", "Water Quality Measurement", "FAMILY_SOURCE"],
    ["LPS8N", "Gateway -- LoRaWAN", "EXACT_PRODUCT_SOURCE"],
    ["LPS8N-EC25", "Gateway -- LoRaWAN", "NO_VERIFIED_SOURCE"],
    ["DDS75-LB2", "Distance Sensor", "NO_VERIFIED_SOURCE"],
  ] as const;
  for (const [sku, application, status] of sample) {
    const catalogueRecord = catalogue.products.find((item) => item.sku === sku);
    const record = documentation.products.find((item) => item.sku === sku);
    assert.equal(catalogueRecord?.application, application, sku);
    assert.ok(record);
    assert.equal(record.status, status, sku);
    if (status === "NO_VERIFIED_SOURCE") assert.equal(guidance.products.find((item) => item.sku === sku), undefined, sku);
  }
  assert.equal(guidance.products.find((item) => item.sku === "DDS75-LB2"), undefined);
  assert.equal(productDefinition({ sku: "PS-LB-Txx or PS-LB-Ixx", application: "Pressure Sensor", iotInterface: "LoRaWAN" }), "PS-LB-Txx or PS-LB-Ixx is a pressure sensor. Connectivity is via LoRaWAN.");
});

test("structures only clearly separated specification fragments", () => {
  assert.deepEqual(specificationItems("8500mAh, LoRaWAN, IP67"), ["8500mAh", "LoRaWAN", "IP67"]);
  assert.deepEqual(specificationItems("Single unstructured statement"), []);
});

test("does not truncate metadata in the middle of a word", () => {
  const description = sentenceAwareDescription(["A complete opening sentence. A deliberately long sentence about product specifications and connectivity that must be shortened cleanly."], 80);
  assert.ok(description.length <= 80);
  assert.ok(description.endsWith("."));
  assert.ok(!description.endsWith("specifica."));
});
