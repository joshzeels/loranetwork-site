import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { displayValue, facetValue, productDefinition, productDisplayName, productSummary, sentenceAwareDescription, specificationItems } from "../lib/product-presentation.ts";

const catalogue = JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as { products: Array<Record<string, string>> };
const documentation = JSON.parse(readFileSync(new URL("../data/product-documentation.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; status: string }> };
const guidance = JSON.parse(readFileSync(new URL("../data/product-guidance.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; definition?: string; suitability?: string; buyerChecks?: string[]; evidenceLevel: string }> };

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
  assert.equal(productSummary({ sku: "AIS01-LB", application: "Angle Sensor / Tilting", iotInterface: "LoRaWAN" }), "AIS01-LB is listed as an angle sensor / tilting. It uses LoRaWAN connectivity.");
  assert.equal(productDefinition({ sku: "RS485W-LB", application: "Generic Node / RS485", iotInterface: "LoRaWAN" }), "RS485W-LB is an IoT device in the catalogue's Generic Node / RS485 group. It uses LoRaWAN connectivity.");
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
  assert.equal(productDefinition({ sku: "PS-LB-Txx or PS-LB-Ixx", application: "Pressure Sensor", iotInterface: "LoRaWAN" }), "PS-LB-Txx or PS-LB-Ixx is listed as a pressure sensor. It uses LoRaWAN connectivity.");
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
