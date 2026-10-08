import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ANALYTICS_BROWSER_EVENT, trackEvent } from "../lib/analytics/client.ts";
import { ANALYTICS_EVENT_NAMES } from "../lib/analytics/events.ts";

const eventDefinitions = readFileSync(new URL("../lib/analytics/events.ts", import.meta.url), "utf8");
const enquiryBuilder = readFileSync(new URL("../components/enquiry-builder.tsx", import.meta.url), "utf8");
const productPage = readFileSync(new URL("../app/products/[slug]/page.tsx", import.meta.url), "utf8");
const applicationPage = readFileSync(new URL("../app/applications/[slug]/page.tsx", import.meta.url), "utf8");
const comparisonPage = readFileSync(new URL("../app/compare/page.tsx", import.meta.url), "utf8");
const contactPage = readFileSync(new URL("../app/contact/page.tsx", import.meta.url), "utf8");

test("analytics event names remain stable and tracking safely no-ops without a browser provider", () => {
  assert.deepEqual(ANALYTICS_EVENT_NAMES, ["product_view", "application_view", "enquiry_open", "enquiry_product_selected", "enquiry_submit_success", "enquiry_submit_failure", "comparison_open", "comparison_product_added", "contact_email_click", "contact_phone_click"]);
  assert.doesNotThrow(() => trackEvent("product_view", { sku: "DDS75-LB", productName: "DDS75-LB", slug: "dds75-lb" }));
});

test("analytics emits typed public event data to the future provider hook", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let emitted: CustomEvent | undefined;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent: (event: CustomEvent) => { emitted = event; return true; } } });

  try {
    trackEvent("product_view", { sku: "DDS75-LB", productName: "DDS75-LB", slug: "dds75-lb" });
    assert.equal(emitted?.type, ANALYTICS_BROWSER_EVENT);
    assert.deepEqual(emitted?.detail, { name: "product_view", properties: { sku: "DDS75-LB", productName: "DDS75-LB", slug: "dds75-lb" } });
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete (globalThis as { window?: Window }).window;
  }
});

test("analytics event definitions contain only public, non-PII fields", () => {
  assert.doesNotMatch(eventDefinitions, /\b(firstName|lastName|email:|phone:|message:|recaptchaToken|ipAddress|mautic)\b/);
  assert.match(eventDefinitions, /enquiry_submit_failure: \{ reason:/);
});

test("view, enquiry, comparison and contact instrumentation use only the requested safe events", () => {
  assert.match(productPage, /<ProductViewTracker sku=\{product\.sku\} productName=\{name\} slug=\{product\.slug\}/);
  assert.match(applicationPage, /<ApplicationViewTracker applicationName=\{productApplicationLabel\(facet\.value\)\} slug=\{facet\.slug\}/);
  assert.match(enquiryBuilder, /enquiryOpened\.current/);
  assert.match(enquiryBuilder, /trackEvent\("enquiry_product_selected"/);
  assert.match(enquiryBuilder, /if \(nextResult\.ok\) \{ trackEvent\("enquiry_submit_success"/);
  assert.match(enquiryBuilder, /reason: "client_validation"/);
  assert.match(comparisonPage, /<ComparisonTracker products=\{selected\.map/);
  assert.match(comparisonPage, /productName: productDisplayName\(product\.sku\)/);
  assert.match(contactPage, /<TrackedContactLink href=\{`mailto:\$\{email\}`\} kind="email">/);
  assert.match(contactPage, /<TrackedContactLink href=\{`tel:\$\{phone\}`\} kind="phone">/);
});
