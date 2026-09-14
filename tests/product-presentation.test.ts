import assert from "node:assert/strict";
import test from "node:test";
import { displayValue, facetValue, productDisplayName, productSummary } from "../lib/product-presentation.ts";

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
  assert.equal(productSummary({ sku: "AIS01-LB", application: "Angle Sensor / Tilting", iotInterface: "LoRaWAN" }), "AIS01-LB is a Dragino product listed for Angle Sensor / Tilting. Its catalogue interface is LoRaWAN.");
});
