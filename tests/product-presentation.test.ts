import assert from "node:assert/strict";
import test from "node:test";
import { displayValue, facetValue, productDefinition, productDisplayName, productSummary, sentenceAwareDescription, specificationItems } from "../lib/product-presentation.ts";

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
