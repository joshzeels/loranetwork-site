import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createEnquiryHandler } from "../lib/enquiries/handler.ts";
import { createMauticDelivery } from "../lib/enquiries/mautic.ts";
import { formatProductSelection, getProductSuggestions, MAX_PRODUCT_SUGGESTIONS, moveActiveProduct, resolveProductOption, type EnquiryProductOption } from "../lib/enquiries/product-options.ts";
import { verifyRecaptchaToken } from "../lib/enquiries/recaptcha.ts";
import { validateEnquiry } from "../lib/enquiries/validation.ts";

const validEnquiry = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "buyer@example.co.za",
  phone: "+27 11 555 0100",
  productSku: "LHT65N",
  message: "Please contact me.",
};

test("accepts an enquiry with all six required fields", () => {
  const result = validateEnquiry(validEnquiry);
  assert.equal(result.ok, true);
});

for (const field of ["firstName", "lastName", "email", "phone", "productSku", "message"] as const) {
  test(`requires ${field}`, () => {
    const result = validateEnquiry({ ...validEnquiry, [field]: "" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.errors[field], "This field is required.");
  });
}

test("rejects a malformed email", () => {
  const result = validateEnquiry({ ...validEnquiry, email: "invalid" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.errors.email, "Enter a valid email address.");
});

test("rejects oversized and control-character payloads", () => {
  const result = validateEnquiry({ ...validEnquiry, firstName: `Bad\u0000Name`, message: "x".repeat(3001) });
  assert.equal(result.ok, false);
  if (!result.ok) { assert.ok(result.errors.firstName); assert.ok(result.errors.message); }
});

const productOptions: EnquiryProductOption[] = [
  { sku: "DDS75-LB", name: "LoRaWAN Distance Sensor" },
  { sku: "LHT65N", name: "LoRaWAN Temperature and Humidity Sensor" },
  { sku: "DDS20-LB", name: "LoRaWAN Liquid Level Sensor" },
  ...Array.from({ length: 20 }, (_, index) => ({ sku: `SENSOR-${index + 1}`, name: `General Sensor ${index + 1}` })),
];

test("does not show the catalogue initially or before the minimum query length", () => {
  assert.deepEqual(getProductSuggestions(productOptions, ""), []);
  assert.deepEqual(getProductSuggestions(productOptions, "d"), []);
});

test("resolves an exact pasted SKU after trimming", () => {
  assert.deepEqual(resolveProductOption(productOptions, "  DDS75-LB  "), productOptions[0]);
});

test("searches SKU values case-insensitively", () => {
  assert.equal(getProductSuggestions(productOptions, "dds75")[0]?.sku, "DDS75-LB");
});

test("searches product names case-insensitively", () => {
  assert.equal(getProductSuggestions(productOptions, "liquid level")[0]?.sku, "DDS20-LB");
});

test("limits visible product suggestions to fifteen", () => {
  assert.equal(getProductSuggestions(productOptions, "sensor").length, MAX_PRODUCT_SUGGESTIONS);
});

test("ranks an exact SKU before other SKU and name matches", () => {
  const options = [{ sku: "AB", name: "Other" }, { sku: "AB-2", name: "AB" }, { sku: "X", name: "AB sensor" }];
  assert.deepEqual(getProductSuggestions(options, "ab").map((product) => product.sku), ["AB", "AB-2", "X"]);
});

test("formats a selected product as a readable submission value", () => {
  assert.equal(formatProductSelection(productOptions[0]), "DDS75-LB | LoRaWAN Distance Sensor");
});

test("supports wrapping keyboard navigation through suggestions", () => {
  assert.equal(moveActiveProduct(-1, "ArrowDown", 3), 0);
  assert.equal(moveActiveProduct(0, "ArrowUp", 3), 2);
  assert.equal(moveActiveProduct(2, "ArrowDown", 3), 0);
});

test("keeps the readable product-page prefill and removes company and quantity fields", () => {
  const source = readFileSync(new URL("../components/enquiry-builder.tsx", import.meta.url), "utf8");
  assert.match(source, /initialProduct \? formatProductSelection\(initialProduct\)/);
  assert.match(source, /name="productSku"/);
  assert.doesNotMatch(source, /name="company"/);
  assert.doesNotMatch(source, /name="quantity"/);
});

test("submits the exact enquiry mapping and hidden fields to Mautic", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const deliver = createMauticDelivery({
    baseUrl: "https://mautic.example/base",
    formId: "20",
    formName: "loranetworkwebsiteenquiry",
    fetchImplementation: async (input, init) => {
      requestedUrl = String(input);
      requestedInit = init;
      return new Response(null, { status: 200 });
    },
  });

  assert.deepEqual(await deliver(validEnquiry), { delivered: true });
  assert.equal(requestedUrl, "https://mautic.example/form/submit?formId=20");
  assert.equal(requestedInit?.method, "POST");
  assert.equal(new Headers(requestedInit?.headers).get("content-type"), "application/x-www-form-urlencoded");
  const fields = Object.fromEntries(new URLSearchParams(String(requestedInit?.body)));
  assert.deepEqual(fields, {
    "mauticform[first_name]": "Ada",
    "mauticform[last_name]": "Lovelace",
    "mauticform[email]": "buyer@example.co.za",
    "mauticform[phone]": "+27 11 555 0100",
    "mauticform[product__sku]": "LHT65N",
    "mauticform[f_message]": "Please contact me.",
    "mauticform[formId]": "20",
    "mauticform[formName]": "loranetworkwebsiteenquiry",
    "mauticform[return]": "",
  });
  assert.equal("mauticform[company]" in fields, false);
  assert.equal("mauticform[quantity]" in fields, false);
});

test("fails when Mautic returns an unsuccessful response", async () => {
  const deliver = createMauticDelivery({
    baseUrl: "https://mautic.example",
    formId: "20",
    formName: "loranetworkwebsiteenquiry",
    fetchImplementation: async () => new Response(null, { status: 500 }),
  });
  assert.deepEqual(await deliver(validEnquiry), { delivered: false, reason: "provider-error" });
});

test("fails when Mautic redirects to an error result", async () => {
  const response = new Response(null, { status: 200 });
  Object.defineProperty(response, "url", { value: "https://mautic.example/form/message?mauticError=Invalid" });
  const deliveryWithRedirect = createMauticDelivery({
    baseUrl: "https://mautic.example",
    formId: "20",
    formName: "loranetworkwebsiteenquiry",
    fetchImplementation: async () => response,
  });
  assert.deepEqual(await deliveryWithRedirect(validEnquiry), { delivered: false, reason: "provider-error" });
});

test("fails when the Mautic request times out", async () => {
  const deliver = createMauticDelivery({
    baseUrl: "https://mautic.example",
    formId: "20",
    formName: "loranetworkwebsiteenquiry",
    timeoutMs: 5,
    fetchImplementation: async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
    }),
  });
  assert.deepEqual(await deliver(validEnquiry), { delivered: false, reason: "provider-error" });
});

test("does not request Mautic when configuration is missing", async () => {
  let requests = 0;
  const deliver = createMauticDelivery({
    baseUrl: "",
    formId: "20",
    formName: "loranetworkwebsiteenquiry",
    fetchImplementation: async () => { requests += 1; return new Response(null, { status: 200 }); },
  });
  assert.deepEqual(await deliver(validEnquiry), { delivered: false, reason: "not-configured" });
  assert.equal(requests, 0);
});

const NOW = Date.parse("2026-10-06T10:00:00.000Z");
const validPayload = {
  ...validEnquiry,
  website: "",
  startedAt: NOW - 3000,
  recaptchaToken: "fresh-token",
};

function request(payload: Record<string, unknown>, ip = "192.0.2.10") {
  return new Request("https://loranetwork.example/api/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(payload),
  });
}

function verificationResponse(overrides: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ success: true, action: "enquiry_submit", score: 0.9, hostname: "loranetwork.example", ...overrides }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function verify(overrides: Partial<Parameters<typeof verifyRecaptchaToken>[1]> = {}) {
  return verifyRecaptchaToken("fresh-token", {
    secret: "test-secret",
    expectedHostname: "loranetwork.example",
    fetchImplementation: async () => verificationResponse(),
    ...overrides,
  });
}

test("fails verification when the client token is missing", async () => {
  let requested = false;
  const verified = await verifyRecaptchaToken("", {
    secret: "test-secret",
    expectedHostname: "loranetwork.example",
    fetchImplementation: async () => { requested = true; return verificationResponse(); },
  });
  assert.equal(verified, false);
  assert.equal(requested, false);
});

test("fails closed when the server secret is missing", async () => {
  let requested = false;
  const verified = await verifyRecaptchaToken("fresh-token", {
    expectedHostname: "loranetwork.example",
    fetchImplementation: async () => { requested = true; return verificationResponse(); },
  });
  assert.equal(verified, false);
  assert.equal(requested, false);
});

test("posts verification to Google and handles verification failure", async () => {
  let requestUrl = "";
  let requestBody = "";
  const verified = await verify({
    fetchImplementation: async (input, init) => {
      requestUrl = String(input);
      requestBody = String(init?.body);
      return verificationResponse({ success: false });
    },
  });
  assert.equal(verified, false);
  assert.equal(requestUrl, "https://www.google.com/recaptcha/api/siteverify");
  assert.equal(new URLSearchParams(requestBody).get("response"), "fresh-token");
  assert.equal(new URLSearchParams(requestBody).get("secret"), "test-secret");
});

test("rejects the wrong action", async () => {
  assert.equal(await verify({ fetchImplementation: async () => verificationResponse({ action: "other_action" }) }), false);
});

test("rejects a score below the default threshold", async () => {
  assert.equal(await verify({ fetchImplementation: async () => verificationResponse({ score: 0.49 }) }), false);
});

test("accepts a score exactly at the default threshold", async () => {
  assert.equal(await verify({ fetchImplementation: async () => verificationResponse({ score: 0.5 }) }), true);
});

test("accepts a score above the default threshold", async () => {
  assert.equal(await verify({ fetchImplementation: async () => verificationResponse({ score: 0.8 }) }), true);
});

test("rejects an unexpected hostname when Google provides one", async () => {
  assert.equal(await verify({ fetchImplementation: async () => verificationResponse({ hostname: "attacker.example" }) }), false);
});

test("accepts the exact expected hostname and allows Google to omit it", async () => {
  assert.equal(await verify({ fetchImplementation: async () => verificationResponse({ hostname: "LORANETWORK.EXAMPLE." }) }), true);
  assert.equal(await verify({ fetchImplementation: async () => verificationResponse({ hostname: undefined }) }), true);
});

test("falls back to 0.5 for an invalid configured threshold", async () => {
  assert.equal(await verify({ minimumScore: "invalid", fetchImplementation: async () => verificationResponse({ score: 0.49 }) }), false);
  assert.equal(await verify({ minimumScore: "invalid", fetchImplementation: async () => verificationResponse({ score: 0.5 }) }), true);
});

test("fails closed for a network failure", async () => {
  assert.equal(await verify({ fetchImplementation: async () => { throw new Error("network failure"); } }), false);
});

test("derives a lower-case hostname without protocol, path or port", async () => {
  let expectedHostname = "";
  const handler = createEnquiryHandler({
    siteUrl: "https://LORANETWORK.EXAMPLE:8443/contact",
    findProduct: () => ({ sku: "LHT65N", name: "LoRaWAN Temperature and Humidity Sensor" }),
    deliver: async () => ({ delivered: true }),
    verifyRecaptcha: async (_token, hostname) => { expectedHostname = hostname; return true; },
    now: () => NOW,
  });
  assert.equal((await handler(request(validPayload))).status, 200);
  assert.equal(expectedHostname, "loranetwork.example");
});

test("rejects a malformed configured site URL", () => {
  assert.throws(() => createEnquiryHandler({
    siteUrl: "not a URL",
    findProduct: () => ({ sku: "LHT65N", name: "LoRaWAN Temperature and Humidity Sensor" }),
    deliver: async () => ({ delivered: true }),
    verifyRecaptcha: async () => true,
  }), /Invalid URL/);
});

test("does not deliver when reCAPTCHA verification fails", async () => {
  let deliveries = 0;
  const handler = createEnquiryHandler({
    siteUrl: "https://loranetwork.example",
    findProduct: () => ({ sku: "LHT65N", name: "LoRaWAN Temperature and Humidity Sensor" }),
    deliver: async () => { deliveries += 1; return { delivered: true }; },
    verifyRecaptcha: async () => false,
    now: () => NOW,
  });
  const response = await handler(request(validPayload));
  assert.equal(response.status, 403);
  assert.equal(deliveries, 0);
  assert.deepEqual(await response.json(), { ok: false, message: "The enquiry could not be sent. Please try again later." });
});

test("delivers after successful reCAPTCHA verification", async () => {
  let deliveries = 0;
  let deliveredProduct = "";
  const handler = createEnquiryHandler({
    siteUrl: "https://loranetwork.example",
    findProduct: () => ({ sku: "LHT65N", name: "LoRaWAN Temperature and Humidity Sensor" }),
    deliver: async (enquiry) => { deliveries += 1; deliveredProduct = enquiry.productSku; return { delivered: true }; },
    verifyRecaptcha: async (token, hostname) => token === "fresh-token" && hostname === "loranetwork.example",
    now: () => NOW,
  });
  const response = await handler(request(validPayload));
  assert.equal(response.status, 200);
  assert.equal(deliveries, 1);
  assert.equal(deliveredProduct, "LHT65N | LoRaWAN Temperature and Humidity Sensor");
});

test("preserves honeypot synthetic success without verification or delivery", async () => {
  let verifications = 0;
  let deliveries = 0;
  const handler = createEnquiryHandler({
    siteUrl: "https://loranetwork.example",
    findProduct: () => ({ sku: "LHT65N", name: "LoRaWAN Temperature and Humidity Sensor" }),
    deliver: async () => { deliveries += 1; return { delivered: true }; },
    verifyRecaptcha: async () => { verifications += 1; return false; },
    now: () => NOW,
  });
  const response = await handler(request({ ...validPayload, website: "bot-filled.example", recaptchaToken: "" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, message: "Thank you." });
  assert.equal(verifications, 0);
  assert.equal(deliveries, 0);
});

test("preserves validation before verification and delivery", async () => {
  let verifications = 0;
  let deliveries = 0;
  const handler = createEnquiryHandler({
    siteUrl: "https://loranetwork.example",
    findProduct: () => ({ sku: "LHT65N", name: "LoRaWAN Temperature and Humidity Sensor" }),
    deliver: async () => { deliveries += 1; return { delivered: true }; },
    verifyRecaptcha: async () => { verifications += 1; return true; },
    now: () => NOW,
  });
  const response = await handler(request({ ...validPayload, email: "invalid", message: "" }));
  assert.equal(response.status, 400);
  const body = await response.json() as { errors: Record<string, string> };
  assert.ok(body.errors.email);
  assert.ok(body.errors.message);
  assert.equal(verifications, 0);
  assert.equal(deliveries, 0);
});

test("does not let invalid manual product text bypass server-side catalogue validation", async () => {
  let verifications = 0;
  let deliveries = 0;
  const handler = createEnquiryHandler({
    siteUrl: "https://loranetwork.example",
    findProduct: () => undefined,
    deliver: async () => { deliveries += 1; return { delivered: true }; },
    verifyRecaptcha: async () => { verifications += 1; return true; },
    now: () => NOW,
  });
  const response = await handler(request({ ...validPayload, productSku: "Not a real product" }));
  assert.equal(response.status, 400);
  const body = await response.json() as { errors: Record<string, string> };
  assert.equal(body.errors.productSku, "This SKU is not in the catalogue.");
  assert.equal(verifications, 0);
  assert.equal(deliveries, 0);
});

test("preserves process-local rate limiting", async () => {
  let deliveries = 0;
  const handler = createEnquiryHandler({
    siteUrl: "https://loranetwork.example",
    findProduct: () => ({ sku: "LHT65N", name: "LoRaWAN Temperature and Humidity Sensor" }),
    deliver: async () => { deliveries += 1; return { delivered: true }; },
    verifyRecaptcha: async () => true,
    now: () => NOW,
  });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal((await handler(request(validPayload))).status, 200);
  }
  const limitedResponse = await handler(request(validPayload));
  assert.equal(limitedResponse.status, 429);
  assert.equal(deliveries, 5);
});
