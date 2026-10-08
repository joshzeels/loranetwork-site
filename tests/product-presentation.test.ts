import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { displayValue, facetSlug, facetValue, productApplicationLabel, productConnectivityLabel, productDefinition, productDisplayName, productFit, productFullName, productSummary, sentenceAwareDescription, specificationItems } from "../lib/product-presentation.ts";

const catalogue = JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as { products: Array<Record<string, string>> };
const documentation = JSON.parse(readFileSync(new URL("../data/product-documentation.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; status: string; sourceUrl: string; evidence: string }> };
const guidance = JSON.parse(readFileSync(new URL("../data/product-guidance.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; definition?: string; uses?: string; suitability?: string; buyerChecks?: string[]; sourceUrl?: string; evidenceLevel: string }> };
const productPage = readFileSync(new URL("../app/products/[slug]/page.tsx", import.meta.url), "utf8");
const familyPage = readFileSync(new URL("../app/families/[slug]/page.tsx", import.meta.url), "utf8");
const facetDetail = readFileSync(new URL("../components/facet-detail.tsx", import.meta.url), "utf8");

test("cleans presentation artefacts without changing stored source values", () => {
  const sourceSku = "Â\u00a0SN50v3-MS";
  assert.equal(productDisplayName(sourceSku), "SN50v3-MS");
  assert.equal(sourceSku, "Â\u00a0SN50v3-MS");
  assert.equal(productDisplayName("Type N Enclosure KitÂ\u00a0"), "Type N Enclosure Kit");
});

test("uses a full descriptive name for the SKUs on override, and the bare SKU otherwise", () => {
  assert.equal(productDisplayName("RBwAPR-2nD&R11e-LR8"), "MikroTik wAP LR8 Kit");
  assert.equal(productDisplayName("TOF-0809-7V-S1"), "MikroTik LoRa Antenna Kit");
  assert.equal(productDisplayName("BLG-AN-020"), "BLG-AN-020");
});

test("gives the overridden SKUs a longer subtext name distinct from the short display name", () => {
  assert.equal(productFullName("RBwAPR-2nD&R11e-LR8"), "MikroTik wAP LR8 Kit 2.4Ghz 2dBi LoraWAN Gateway");
  assert.equal(productFullName("TOF-0809-7V-S1"), "MikroTik LoRa 6.5dBi Antenna Kit");
  assert.equal(productFullName("BLG-AN-020"), productDisplayName("BLG-AN-020"));
});

test("normalises confirmed catalogue typos and equivalent facet labels", () => {
  assert.equal(displayValue("emperature & Humidity Sensor "), "Temperature & Humidity Sensor");
  assert.equal(displayValue("UVC Radation Sensor"), "UVC Radiation Sensor");
  assert.equal(facetValue("LTE CAT-1"), facetValue("LTE CAT 1"));
});

test("builds a factual summary only from supplied catalogue fields", () => {
  assert.equal(productSummary({ sku: "AIS01-LB", application: "Angle Sensor / Tilting", iotInterface: "LoRaWAN" }), "AIS01-LB supports angle and tilt monitoring projects. Connectivity is via LoRaWAN.");
  assert.equal(productDefinition({ sku: "RS485W-LB", application: "Generic Node / RS485", iotInterface: "LoRaWAN" }), "RS485W-LB is an IoT node for RS485 projects. Connectivity is via LoRaWAN.");
  assert.equal(productApplicationLabel("Gateway -- LoRaWAN"), "LoRaWAN Gateway");
  assert.equal(productApplicationLabel("Generic Node / RS485"), "RS485 IoT Node");
  assert.equal(productApplicationLabel("Generic Node / Analog"), "Analogue IoT Node");
  assert.equal(productApplicationLabel("Dry Contact / Counting / Interrupt"), "Dry Contact, Counting & Interrupt");
  assert.equal(productApplicationLabel("Angle Sensor / Tilting"), "Angle Sensor & Tilt Detection");
  assert.equal(productConnectivityLabel("LoRaWAN"), "LoRaWAN");
  assert.equal(productConnectivityLabel("NB-IoT"), "NB-IoT");
  assert.equal(productConnectivityLabel("LTE-M & NB-IoT"), "LTE-M & NB-IoT");
  assert.equal(productConnectivityLabel("LTE-M & NB-IoT, 10 years 500MB data"), "LTE-M & NB-IoT, 10-year / 500 MB data plan");
  assert.equal(productConnectivityLabel("NB-IoT, 10 years 500MB data"), "NB-IoT, 10-year / 500 MB data plan");
  assert.equal(productConnectivityLabel("RS485, For WSC2"), "RS485 for WSC2");
});

test("uses presentation-only labels without changing stored values or route matching", () => {
  const applications = ["Gateway -- LoRaWAN", "Generic Node / RS485", "Generic Node / Analog"];
  const connectivity = ["LoRaWAN", "NB-IoT", "LTE-M & NB-IoT", "LTE-M & NB-IoT, 10 years 500MB data", "NB-IoT, 10 years 500MB data", "RS485, For WSC2"];

  for (const value of applications) {
    const label = productApplicationLabel(value);
    assert.notEqual(label, "");
    assert.doesNotMatch(label, /â€”|(?<!-)--(?!-)/);
    assert.equal(facetValue(value), displayValue(value).toLocaleLowerCase("en-ZA"));
    assert.equal(facetSlug(value), facetSlug(displayValue(value)));
  }
  for (const value of connectivity) {
    const label = productConnectivityLabel(value);
    assert.notEqual(label, "");
    assert.doesNotMatch(label, /â€”|(?<!-)--(?!-)/);
    assert.equal(facetValue(value), displayValue(value).toLocaleLowerCase("en-ZA"));
    assert.equal(facetSlug(value), facetSlug(displayValue(value)));
  }
  assert.notEqual(productConnectivityLabel("LTE-M & NB-IoT"), productConnectivityLabel("NB-IoT"));
  assert.equal("Gateway -- LoRaWAN", applications[0]);
  assert.equal("RS485, For WSC2", connectivity[5]);
});

test("writes natural conservative fallback copy across representative products", () => {
  const samples = [
    { sku: "WSC2-L", application: "Smart Weather Station", iotInterface: "LoRaWAN" },
    { sku: "DLOS8N", application: "Gateway: LoRaWAN", iotInterface: "LoRaWAN" },
    { sku: "DDS75-LB2", application: "Distance Sensor", iotInterface: "LoRaWAN" },
    { sku: "S31B-KS-GE", application: "Temperature & Humidity Sensor", iotInterface: "LTE CAT 1" },
    { sku: "WQS-LB2", application: "Water Quality Measurement", iotInterface: "LoRaWAN" },
    { sku: "RS485-KS-GE", application: "Generic Node / RS485", iotInterface: "LTE CAT 1" },
    { sku: "WL03A-LB", application: "Water Leak Detect", iotInterface: "LoRaWAN" },
    { sku: "CS01-LB", application: "Energy Control / Monitoring", iotInterface: "LoRaWAN" },
    { sku: "PS-LB2-Txx", application: "Pressure Sensor", iotInterface: "LoRaWAN" },
    { sku: "WSS-09", application: "Smart Weather Station", iotInterface: "RS485, For WSC2" },
    { sku: "LPS8N-EC25", application: "Gateway: LoRaWAN", iotInterface: "LoRaWAN" },
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
  assert.match(productDefinition({ sku: "WQS-KS-GE", application: "Water Quality Measurement", iotInterface: "LTE-M & NB-IoT, 10 years 500MB data" }), /LTE-M & NB-IoT, 10-year \/ 500 MB data plan/);
  assert.match(productFit({ sku: "LPS8N-EC25", application: "Gateway: LoRaWAN", iotInterface: "LTE-M & NB-IoT" }), /LoRaWAN gateway\. Connectivity is via LTE-M & NB-IoT/);
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
  const selected = ["SW3L-004", "S31-LB", "S31B-LB", "D20-LB", "D20S-LB", "DDS20-LB", "DDS45-LB", "SDI-12-LB", "PS-LB-Dxx", "RS485-LN", "WQS-LB", "WSC2-L", "TrackerD", "LPS8N", "TrackerD-LS", "WSC2-Compact-LS", "DLOS8N-EC25", "S31-KS-GE", "S31-KS-1T", "S31B-KS-GE", "S31B-KS-1T", "D20-KS-GE", "D20-KS-1T", "D20S-KS-GE", "D20S-KS-1T", "RS485-KN-GE", "RS485-KN-1T"];
  for (const sku of selected) {
    const record = guidance.products.find((item) => item.sku === sku);
    assert.ok(record, sku);
    assert.equal(record.evidenceLevel, "EXACT_PRODUCT_SOURCE", sku);
    assert.ok(record.definition, sku);
    assert.ok(record.suitability, sku);
    assert.ok(record.buyerChecks && record.buyerChecks.length >= 3, sku);
    assert.match(record.sourceUrl ?? "", /^https:\/\/(?:www\.)?(?:wiki\.)?dragino\.com\//, sku);
  }
  assert.equal(guidance.products.length, selected.length + 8);
});

test("uses only newly verified exact models from the focused discovery pass", () => {
  const exact = ["IVS-LN", "AirFlow-LN ", " CO2-LE ", "Dishsense", "LPT01", "TC01-LB", "TC11-LB", "LHT52", "BH01-LB", "SVC01-LS2", "UV254-LB", "WeightScale-LB", "POM01-L", "IBPv1", "DR-RG-6P", "DR-THP-6P", "DR-IL-6P", "SCT013G-D-100", "SCT024-300", "SCT036-600", "A01A-15", "A02-15", "A13-15", "A16-15"];
  for (const sku of exact) {
    const record = documentation.products.find((item) => item.sku === sku);
    assert.equal(record?.status, "EXACT_PRODUCT_SOURCE", sku);
    assert.match(record?.sourceUrl ?? "", /^https:\/\/(?:www\.)?(?:wiki\.)?dragino\.com\//, sku);
  }
  for (const sku of ["TC01-LB2", "TC11-LB2", "BH01-LB2", "UV254-LB2", "Thermostat"]) {
    assert.equal(documentation.products.find((item) => item.sku === sku)?.status, "NO_VERIFIED_SOURCE", sku);
  }
  for (const sku of ["IVS-LN", "AirFlow-LN", "CO2-LE", "Dishsense", "LPT01", "SVC01-LS2", "POM01-L"]) {
    assert.equal(guidance.products.find((item) => item.sku === sku)?.evidenceLevel, "EXACT_PRODUCT_SOURCE", sku);
  }
});

test("uses only the supplied exact-source gateway and weather-station reconciliation", () => {
  const exact = ["WSC2-Compact-LS", "TrackerD-LS", "DLOS8N-EC25"];
  for (const sku of exact) {
    const record = documentation.products.find((item) => item.sku === sku);
    assert.equal(record?.status, "EXACT_PRODUCT_SOURCE", sku);
  }
  assert.match(documentation.products.find((item) => item.sku === "WSC2-Compact-LS")?.sourceUrl ?? "", /wsc2-compact-ls/);
  assert.match(documentation.products.find((item) => item.sku === "DLOS8N-EC25")?.sourceUrl ?? "", /outdoor-gateways\/dlos8n/);

  for (const sku of ["LPS8N-EC25", "LPS8v2-EC25", "LG308N-EC25", "MS48-LR-EC25"]) {
    const record = documentation.products.find((item) => item.sku === sku);
    assert.equal(record?.status, "NO_VERIFIED_SOURCE", sku);
    assert.equal(guidance.products.find((item) => item.sku === sku), undefined, sku);
  }
  assert.equal(documentation.products.find((item) => item.sku === "S31B-LB2")?.status, "FAMILY_SOURCE");
  for (const sku of ["SW3L-LB2-004", "SW3L-LB2-006", "SW3L-LB2-010", "SW3L-LB2-020"]) assert.equal(documentation.products.find((item) => item.sku === sku)?.status, "AMBIGUOUS", sku);
});

test("scopes CAT-1 evidence to the exact KS and KN order structures", () => {
  const s31Ks = ["S31-KS-GE", "S31-KS-1T", "S31B-KS-GE", "S31B-KS-1T"];
  const d20Ks = ["D20-KS-GE", "D20-KS-1T", "D20S-KS-GE", "D20S-KS-1T"];
  const rs485Kn = ["RS485-KN-GE", "RS485-KN-1T"];
  for (const sku of [...s31Ks, ...d20Ks, ...rs485Kn]) {
    const record = documentation.products.find((item) => item.sku === sku);
    assert.equal(record?.status, "EXACT_PRODUCT_SOURCE", sku);
    assert.match(record?.sourceUrl ?? "", /^https:\/\/wiki\.dragino\.com\/docs\/CAT-1\//, sku);
    assert.equal(guidance.products.find((item) => item.sku === sku)?.evidenceLevel, "EXACT_PRODUCT_SOURCE", sku);
  }
  for (const sku of ["S31-KN-GE", "S31-KN-1T", "S31B-KN-GE", "S31B-KN-1T", "D20-KN-GE", "D20S-KN-GE", "RS485-KS-GE", "RS485-KS-1T", "DDS20-KS-GE", "DDS20-KS-1T", "DDS45-KS-GE", "DDS45-KS-1T", "DDS75-KS-GE", "DDS75-KS-1T"]) {
    const record = documentation.products.find((item) => item.sku === sku);
    assert.equal(record?.status, "NO_VERIFIED_SOURCE", sku);
    assert.equal(guidance.products.find((item) => item.sku === sku), undefined, sku);
  }
  assert.match(guidance.products.find((item) => item.sku === "S31-KS-GE")?.suitability ?? "", /own SIM card/i);
  assert.match(guidance.products.find((item) => item.sku === "S31-KS-1T")?.suitability ?? "", /pre-installed SIM/i);
});

test("keeps supplier provenance language out of public guidance fields", () => {
  const publicFields = guidance.products.flatMap((record) => [record.definition, record.uses, record.suitability, ...(record.buyerChecks ?? [])]).filter(Boolean).join(" ");
  assert.doesNotMatch(publicFields, /source|documentation|manufacturer|according to|verified|official|datasheet|manual/i);
});

test("keeps Dragino source URLs out of the public product page", () => {
  assert.doesNotMatch(productPage, /dragino\.com|docs\.dragino\.com/i);
  assert.doesNotMatch(productPage, /documentation\.sourceUrl/);
  assert.match(productPage, /Manufacturer<\/dt><dd>{buildProductManufacturer\(product\.sku\)\.manufacturer\.name}/);
  assert.match(productPage, /href={`\/contact\?sku=/);
  assert.match(productPage, /guidance\?\.suitability \?\? productFit\(product\)/);
  assert.doesNotMatch(productPage, /Key catalogue details|Reseller<\/dt>/);
  assert.doesNotMatch(familyPage, /source catalogue/);
  assert.doesNotMatch(facetDetail, /verified product family/);
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
    ["LPS8N", "Gateway: LoRaWAN", "EXACT_PRODUCT_SOURCE"],
    ["LPS8N-EC25", "Gateway: LoRaWAN", "NO_VERIFIED_SOURCE"],
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
