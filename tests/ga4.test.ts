import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createGa4PageViewTracker, forwardToGa4, initialiseGa4, isGa4MeasurementId, mapToGa4, type Gtag } from "../lib/analytics/ga4.ts";

const googleAnalytics = readFileSync(new URL("../components/google-analytics.tsx", import.meta.url), "utf8");
const ga4Adapter = readFileSync(new URL("../lib/analytics/ga4.ts", import.meta.url), "utf8");
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
  assert.equal(isGa4MeasurementId("G-ABC123"), false);
  assert.equal(isGa4MeasurementId("g-7j6t1gvhdq"), false);
  assert.equal(isGa4MeasurementId("G-7J6T1GVHDQ"), true);
});

test("the root layout omits the GA4 client boundary unless the measurement ID is valid", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

  assert.match(layout, /process\.env\.NEXT_PUBLIC_GA_MEASUREMENT_ID\?\.trim\(\)/);
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
  const trackPageView = createGa4PageViewTracker();
  assert.doesNotThrow(() => forwardToGa4(event, undefined));
  assert.doesNotThrow(() => trackPageView("/contact", undefined));
  const failingGtag: Gtag = () => { throw new Error("provider unavailable"); };
  assert.doesNotThrow(() => forwardToGa4(event, failingGtag));
  assert.doesNotThrow(() => trackPageView("/contact", failingGtag));
});

test("GA4 initialisation queues native Arguments in Google's required order only once", () => {
  const invalidTarget = {} as Window & { dataLayer?: IArguments[]; gtag?: Gtag };
  assert.equal(initialiseGa4(invalidTarget, "G-ABC123"), false);
  assert.equal(invalidTarget.dataLayer, undefined);

  const target = {} as Window & { dataLayer?: IArguments[]; gtag?: Gtag };
  assert.equal(initialiseGa4(target, "G-7J6T1GVHDQ"), true);
  assert.equal(initialiseGa4(target, "G-7J6T1GVHDQ"), false);

  assert.ok(Array.isArray(target.dataLayer));
  const dataLayer = target.dataLayer;
  assert.equal(dataLayer.length, 2);
  assert.ok(dataLayer.every((entry) => !Array.isArray(entry)));
  assert.ok(dataLayer.every((entry) => Object.prototype.toString.call(entry) === "[object Arguments]"));

  const calls = dataLayer.map((entry) => Array.from(entry));
  assert.equal(calls[0]?.[0], "js");
  assert.ok(calls[0]?.[1] instanceof Date);
  assert.deepEqual(calls[1], ["config", "G-7J6T1GVHDQ", { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false }]);

  forwardToGa4({ name: "contact_email_click", properties: { pathname: "/contact" } }, target.gtag);
  assert.equal(dataLayer.length, 3);
  assert.equal(Object.prototype.toString.call(dataLayer[2]), "[object Arguments]");
  assert.deepEqual(Array.from(dataLayer[2]!), ["event", "contact_email_click", { page_path: "/contact" }]);
});

test("GA4 bootstrap source preserves the official command contract and ordering", () => {
  const dataLayerIndex = ga4Adapter.indexOf("target.dataLayer ??= []");
  const gtagIndex = ga4Adapter.indexOf("function gtag()");
  const jsIndex = ga4Adapter.indexOf('target.gtag("js"');
  const configIndex = ga4Adapter.indexOf('target.gtag("config"');

  assert.ok(dataLayerIndex >= 0);
  assert.ok(dataLayerIndex < gtagIndex);
  assert.ok(gtagIndex < jsIndex);
  assert.ok(jsIndex < configIndex);
  assert.match(ga4Adapter, /dataLayer\?\.push\(arguments\)/);
  assert.doesNotMatch(ga4Adapter, /\.\.\.arguments_/);
});

test("page views send once per pathname and never include query parameters", () => {
  const calls: unknown[][] = [];
  const gtag: Gtag = (...arguments_) => { calls.push(arguments_); };
  const trackPageView = createGa4PageViewTracker();

  const origin = "https://loranetwork.co.za";
  assert.equal(trackPageView("/?campaign=private#top", gtag, origin), true);
  assert.equal(trackPageView("/?campaign=other", gtag, origin), false);
  assert.equal(trackPageView("/products?search=user-entered", gtag, origin), true);
  assert.equal(trackPageView("/products", gtag, origin), false);
  assert.equal(trackPageView("/products/dds75-lb", gtag, origin), true);
  assert.equal(trackPageView("/applications/distance-sensor?sku=private", gtag, origin), true);
  assert.equal(trackPageView("/contact", gtag, origin), true);
  assert.equal(trackPageView("https://loranetwork.co.za/contact", gtag, origin), false);
  assert.deepEqual(calls, [
    ["event", "page_view", { page_path: "/", page_location: "https://loranetwork.co.za/" }],
    ["event", "page_view", { page_path: "/products", page_location: "https://loranetwork.co.za/products" }],
    ["event", "page_view", { page_path: "/products/dds75-lb", page_location: "https://loranetwork.co.za/products/dds75-lb" }],
    ["event", "page_view", { page_path: "/applications/distance-sensor", page_location: "https://loranetwork.co.za/applications/distance-sensor" }],
    ["event", "page_view", { page_path: "/contact", page_location: "https://loranetwork.co.za/contact" }],
  ]);
});

test("only the GA4 provider adapter calls gtag and it uses pathname-only page views", () => {
  assert.doesNotMatch(applicationAnalytics, /\bgtag\b/);
  assert.match(googleAnalytics, /pageViewTracker\.current\(pathname, window\.gtag, window\.location\.origin\)/);
  assert.match(googleAnalytics, /strategy="afterInteractive"/);
  assert.equal(googleAnalytics.match(/googletagmanager\.com\/gtag\/js/g)?.length, 1);
  assert.equal(googleAnalytics.match(/initialiseGa4\(window, measurementId\)/g)?.length, 1);
  assert.equal(googleAnalytics.match(/id="google-analytics"/g)?.length, 1);
});
