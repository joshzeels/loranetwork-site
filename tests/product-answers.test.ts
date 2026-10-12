import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildComparisonFields, buildProductAnswers, selectRelatedProducts, type AnswerDocumentationStatus } from "../lib/product-answers.ts";

type CatalogueProduct = { sku: string; slug: string; application: string; specification: string; iotInterface: string; priceUsd: string };
type Guidance = { sku: string; definition?: string; uses?: string; suitability?: string; buyerChecks?: string[]; evidenceLevel: "EXACT_PRODUCT_SOURCE" | "FAMILY_SOURCE" };

const catalogue = JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as { products: CatalogueProduct[] };
const guidance = JSON.parse(readFileSync(new URL("../data/product-guidance.json", import.meta.url), "utf8")) as { products: Guidance[] };
const documentation = JSON.parse(readFileSync(new URL("../data/product-documentation.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; status: string; sourceUrl: string }> };
const productPage = readFileSync(new URL("../app/products/[slug]/page.tsx", import.meta.url), "utf8");
const comparison = readFileSync(new URL("../components/product-comparison.tsx", import.meta.url), "utf8");
const comparePage = readFileSync(new URL("../app/compare/page.tsx", import.meta.url), "utf8");

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
    assert.ok(answers.functionAnswer || answers.connectivity, sku);
  }
});

test("uses guidance only when its evidence level matches the documentation status", () => {
  const base = product("DDS75-LB2");
  const exactCopy = { definition: "Unsupported inherited definition.", uses: "Unsupported inherited use.", buyerChecks: ["Unsupported inherited check."], evidenceLevel: "EXACT_PRODUCT_SOURCE" as const };
  const unverified = buildProductAnswers(base, exactCopy, "NO_VERIFIED_SOURCE");
  assert.doesNotMatch([unverified.opening, unverified.functionAnswer, ...unverified.beforeOrdering].join(" "), /Unsupported inherited/);

  const familyCopy = { definition: "A family-safe definition.", uses: "A family-safe use.", evidenceLevel: "FAMILY_SOURCE" as const };
  const family = buildProductAnswers(base, familyCopy, "FAMILY_SOURCE");
  assert.equal(family.opening, familyCopy.definition);
  assert.equal(family.functionAnswer, familyCopy.uses);
});

test("derives only direct power, probe and before-ordering answers", () => {
  const rs485 = buildProductAnswers(product("RS485-LN"), productGuidance("RS485-LN"), documentationStatus("RS485-LN"));
  assert.equal(rs485.sensorOrProbe, undefined);
  assert.ok(rs485.beforeOrdering.some((check) => /protocol and register requirements/i.test(check)));

  const solar = buildProductAnswers(product("SW3L-LS-004"));
  assert.ok(solar.power?.includes("Solar"));
  assert.ok(solar.beforeOrdering.includes("Confirm the required power configuration."));
});

test("covers representative gateway, LoRaWAN, LTE CAT 1, and accessory products conservatively", () => {
  const gateway = buildProductAnswers(product("LPS8N"), productGuidance("LPS8N"), documentationStatus("LPS8N"));
  const lorawan = buildProductAnswers(product("DDS75-LB2"), undefined, documentationStatus("DDS75-LB2"));
  const cellular = buildProductAnswers(product("S31-KS-GE"), productGuidance("S31-KS-GE"), documentationStatus("S31-KS-GE"));
  const accessory = buildProductAnswers(product("DR-SI"));
  assert.match(gateway.opening, /gateway/i);
  assert.match(lorawan.connectivity ?? "", /LoRaWAN/);
  assert.match(cellular.connectivity ?? "", /LTE CAT 1/);
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

test("never leaks evidence terminology, source URLs, or unsupported claim patterns into answers", () => {
  const samples = ["DDS75-LB", "WQS-LB2", "DDS75-LB2", "RS485-LN", "LPS8N", "DR-SI"];
  const publicCopy = samples.map((sku) => {
    const answers = buildProductAnswers(product(sku), productGuidance(sku), documentationStatus(sku));
    return [answers.opening, answers.functionAnswer, answers.connectivity, answers.power, answers.sensorOrProbe, ...answers.beforeOrdering].filter(Boolean).join(" ");
  }).join(" ");
  assert.doesNotMatch(publicCopy, /https?:\/\/|official|verified|source|documentation|manufacturer|battery life|radio range|IP\d|certif/i);
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
  assert.match(comparison, /buildComparisonFields/);
  assert.doesNotMatch(comparison, /Package dimensions \(mm\).*Package weight \(g\)/);
  assert.match(comparePage, /robots: \{ index: false, follow: true \}/);
});
