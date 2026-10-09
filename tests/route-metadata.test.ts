import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildRouteMetadata } from "../lib/route-metadata.ts";

const origin = "https://loranetwork.co.za";
const applicationPage = readFileSync(new URL("../app/applications/[slug]/page.tsx", import.meta.url), "utf8");
const familyPage = readFileSync(new URL("../app/families/[slug]/page.tsx", import.meta.url), "utf8");
const guidePage = readFileSync(new URL("../app/guides/[slug]/page.tsx", import.meta.url), "utf8");
const productPage = readFileSync(new URL("../app/products/[slug]/page.tsx", import.meta.url), "utf8");
const comparePage = readFileSync(new URL("../app/compare/page.tsx", import.meta.url), "utf8");

function assertRouteMetadata(pathname: string, title: string, description: string) {
  const metadata = buildRouteMetadata(origin, pathname, title, description);
  const canonical = `${origin}${pathname}`;

  assert.equal(metadata.alternates?.canonical, canonical);
  assert.equal(metadata.openGraph?.url, canonical);
  assert.equal(metadata.openGraph?.title, `${title} | LoRa Network`);
  assert.equal(metadata.openGraph?.description, description);
  assert.equal(metadata.twitter?.title, `${title} | LoRa Network`);
  assert.equal(metadata.twitter?.description, description);
  assert.doesNotMatch(JSON.stringify(metadata), /localhost|vercel\.app/i);
}

test("application metadata is route-specific and uses the configured production origin", () => {
  assertRouteMetadata("/applications/distance-sensor", "Distance Sensor Products", "Browse 12 products for Distance Sensor.");
  assert.match(applicationPage, /buildRouteMetadata\(getSiteUrl\(\), `\/applications\/\$\{facet\.slug\}`/);
});

test("family metadata is route-specific and uses the curated family purpose", () => {
  assertRouteMetadata("/families/sw3l", "SW3L Product Family", "Water-flow sensor models.");
  assert.match(familyPage, /buildRouteMetadata\(getSiteUrl\(\), `\/families\/\$\{family\.slug\}`/);
  assert.match(familyPage, /family\.purpose/);
});

test("guide metadata is route-specific and uses the guide answer as its description", () => {
  assertRouteMetadata("/guides/choosing-iot-connectivity", "Choosing IoT Connectivity for Devices and Gateways", "Choose connectivity from the guide.");
  assert.match(guidePage, /buildRouteMetadata\(getSiteUrl\(\), `\/guides\/\$\{guide\.slug\}`/);
});

test("product metadata remains on its existing product-specific implementation", () => {
  assert.match(productPage, /openGraph: \{ type: "website", title: `\$\{name\} \| LoRa Network`/);
  assert.doesNotMatch(productPage, /buildRouteMetadata/);
});

test("compare remains noindex,follow", () => {
  assert.match(comparePage, /robots: \{ index: false, follow: true \}/);
});
