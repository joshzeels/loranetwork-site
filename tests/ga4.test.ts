import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { forwardToGa4, initialiseGa4, isGa4MeasurementId, mapToGa4, trackGa4PageView, type Gtag } from "../lib/analytics/ga4.ts";

const googleAnalytics = readFileSync(new URL("../components/google-analytics.tsx", import.meta.url), "utf8");
const applicationAnalytics = [
  "../components/analytics-trackers.tsx",
  "../components/enquiry-builder.tsx",
  "../app/products/[slug]/page.tsx",
  "../app/applications/[slug]/page.tsx",
  "../app/compare/page.tsx",
  "../app/contact/page.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");

test("GA4 remains disabled for a missing or invalid measurement ID", () => {
  assert.equal(isGa4MeasurementId(undefined), false);
  assert.equal(isGa4MeasurementId(""), false);
  assert.equal(isGa4MeasurementId("UA-123"), false);
  assert.equal(isGa4MeasurementId("G-ABC123"), true);
});

test("the root layout omits the GA4 client boundary unless the measurement ID is valid", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

  assert.match(layout, /isGa4MeasurementId\(gaMeasurementId\) \? <GoogleAnalytics measurementId=\{gaMeasurementId\} \/> : null/);
});

test("GA4 maps product and enquiry conversion events without PII", () => {
  assert.deepEqual(mapToGa4({ name: "product_view", properties: { sku: "DDS75-LB", productName: "DDS75-LB", slug: "dds75-lb" } }), { name: "view_item", parameters: { items: [{ item_id: "DDS75-LB", item_name: "DDS75-LB" }], product_slug: "dds75-lb" } });
  assert.deepEqual(mapToGa4({ name: "enquiry_product_selected", properties: { sku: "DDS75-LB", productName: "DDS75-LB", sourcePathname: "/contact" } }), { name: "select_item", parameters: { items: [{ item_id: "DDS75-LB", item_name: "DDS75-LB" }], page_path: "/contact" } });
  assert.deepEqual(mapToGa4({ name: "enquiry_submit_success", properties: { sku: "DDS75-LB", sourcePathname: "/contact" } }), { name: "generate_lead", parameters: { product_sku: "DDS75-LB", page_path: "/contact" } });
  assert.deepEqual(mapToGa4({ name: "enquiry_submit_failure", properties: { reason: "network", sourcePathname: "/contact" } }), { name: "enquiry_submit_failure", parameters: { reason: "network", page_path: "/contact" } });
});

test("GA4 forwarding and page views do not throw when a provider is absent or fails", () => {
  const event = { name: "contact_email_click", properties: { pathname: "/contact" } } as const;
  assert.doesNotThrow(() => forwardToGa4(event, undefined));
  assert.doesNotThrow(() => trackGa4PageView("/contact", undefined));
  const failingGtag: Gtag = () => { throw new Error("provider unavailable"); };
  assert.doesNotThrow(() => forwardToGa4(event, failingGtag));
  assert.doesNotThrow(() => trackGa4PageView("/contact", failingGtag));
});

test("GA4 initialisation configures one measurement ID only once", () => {
  const calls: unknown[][] = [];
  const target = { dataLayer: [] as unknown[][], gtag: (...args: unknown[]) => { calls.push(args); } } as unknown as Window;
  assert.equal(initialiseGa4(target, "G-ABC123"), true);
  assert.equal(initialiseGa4(target, "G-ABC123"), false);
  assert.equal(calls.filter(([command]) => command === "config").length, 1);
  assert.deepEqual(calls.find(([command]) => command === "config"), ["config", "G-ABC123", { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false }]);
});

test("only the GA4 provider adapter calls gtag and it uses pathname-only page views", () => {
  assert.doesNotMatch(applicationAnalytics, /\bgtag\b/);
  assert.match(googleAnalytics, /trackGa4PageView\(pathname, window\.gtag\)/);
  assert.match(googleAnalytics, /strategy="afterInteractive"/);
});
