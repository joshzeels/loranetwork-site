import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const catalogue = JSON.parse(readFileSync(new URL("../data/dragino-products.json", import.meta.url), "utf8")) as { products: Array<{ sku: string; slug: string }> };
const discovery = JSON.parse(readFileSync(new URL("../data/discovery-content.json", import.meta.url), "utf8")) as { indexableApplications: string[]; indexableInterfaces: string[]; families: Array<{ slug: string }>; guides: Array<{ slug: string }> };
const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
const robots = readFileSync(new URL("../app/robots.ts", import.meta.url), "utf8");
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const linkAudit = readFileSync(new URL("../scripts/audit-internal-links.ts", import.meta.url), "utf8");

test("current internal route inputs are unique and produce the expected 492 sitemap URLs", () => {
  assert.equal(catalogue.products.length, 448);
  assert.equal(new Set(catalogue.products.map((product) => product.sku)).size, 448);
  assert.equal(new Set(catalogue.products.map((product) => product.slug)).size, 448);
  const sitemapCount = 10 + discovery.indexableApplications.length + discovery.indexableInterfaces.length + discovery.families.length + discovery.guides.length + catalogue.products.length;
  assert.equal(sitemapCount, 492);
});

test("sitemap and robots use the shared site origin and exclude comparison URLs", () => {
  assert.match(sitemap, /const siteUrl = getSiteUrl\(\)/);
  assert.doesNotMatch(sitemap, /\/compare/);
  assert.match(robots, /sitemap: `\$\{siteUrl\}\/sitemap\.xml`/);
  assert.match(nextConfig, /NEXT_PUBLIC_SITE_URL/);
  assert.match(linkAudit, /https:\/\/loranetwork\.co\.za/);
  assert.match(linkAudit, /Duplicate sitemap URLs detected/);
});
