import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const CURRENT_APPROVED_CATALOGUE_COUNT = 448;
const catalogue = JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as {
  products: Array<{ sku: string; slug: string }>;
};
const productRoute = readFileSync(new URL("../app/products/[slug]/page.tsx", import.meta.url), "utf8");
const launchAudit = readFileSync(new URL("../scripts/audit-launch-readiness.ts", import.meta.url), "utf8");
const pricingAudit = readFileSync(new URL("../scripts/reconcile-pricing.ts", import.meta.url), "utf8");

test("the current approved catalogue has 448 unique products and route slugs", () => {
  assert.equal(catalogue.products.length, CURRENT_APPROVED_CATALOGUE_COUNT);
  assert.equal(new Set(catalogue.products.map((product) => product.sku)).size, CURRENT_APPROVED_CATALOGUE_COUNT);
  assert.equal(new Set(catalogue.products.map((product) => product.slug)).size, CURRENT_APPROVED_CATALOGUE_COUNT);
});

test("product route generation remains derived from every current catalogue product", () => {
  assert.match(productRoute, /generateStaticParams\(\)\s*\{\s*return products\.map\(\(product\) => \(\{ slug: product\.slug \}\)\);\s*\}/);
});

test("current catalogue audits use the approved 448-product baseline, not the historical 981 baseline", () => {
  assert.match(launchAudit, /CURRENT_APPROVED_CATALOGUE_COUNT = 448/);
  assert.match(pricingAudit, /CURRENT_APPROVED_CATALOGUE_COUNT = 448/);
  assert.doesNotMatch(launchAudit, /\b981\b/);
  assert.doesNotMatch(pricingAudit, /\b981\b/);
});
