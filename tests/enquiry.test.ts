import assert from "node:assert/strict";
import test from "node:test";
import { createEnquiryHandler } from "../lib/enquiries/handler.ts";
import { verifyRecaptchaToken } from "../lib/enquiries/recaptcha.ts";
import { validateEnquiry } from "../lib/enquiries/validation.ts";

test("accepts a minimal general enquiry", () => {
  const result = validateEnquiry({ name: "Customer", company: "", email: "buyer@example.co.za", phone: "", sku: "", quantity: "", message: "Please contact me." });
  assert.equal(result.ok, true);
});

test("rejects malformed email, quantity and missing required fields", () => {
  const result = validateEnquiry({ name: "", company: "", email: "invalid", phone: "", sku: "", quantity: "1.5", message: "" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.deepEqual(Object.keys(result.errors).sort(), ["email", "message", "name", "quantity"]);
});

test("rejects oversized and control-character payloads", () => {
  const result = validateEnquiry({ name: `Bad\u0000Name`, company: "", email: "buyer@example.co.za", phone: "", sku: "", quantity: "1", message: "x".repeat(3001) });
  assert.equal(result.ok, false);
  if (!result.ok) { assert.ok(result.errors.name); assert.ok(result.errors.message); }
});

const NOW = Date.parse("2026-10-06T10:00:00.000Z");
const validPayload = {
  name: "Customer",
  company: "",
  email: "buyer@example.co.za",
  phone: "",
  sku: "",
  quantity: "",
  message: "Please contact me.",
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
    findProduct: () => undefined,
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
    findProduct: () => undefined,
    deliver: async () => ({ delivered: true }),
    verifyRecaptcha: async () => true,
  }), /Invalid URL/);
});

test("does not deliver when reCAPTCHA verification fails", async () => {
  let deliveries = 0;
  const handler = createEnquiryHandler({
    siteUrl: "https://loranetwork.example",
    findProduct: () => undefined,
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
  const handler = createEnquiryHandler({
    siteUrl: "https://loranetwork.example",
    findProduct: () => undefined,
    deliver: async () => { deliveries += 1; return { delivered: true }; },
    verifyRecaptcha: async (token, hostname) => token === "fresh-token" && hostname === "loranetwork.example",
    now: () => NOW,
  });
  const response = await handler(request(validPayload));
  assert.equal(response.status, 200);
  assert.equal(deliveries, 1);
});

test("preserves honeypot synthetic success without verification or delivery", async () => {
  let verifications = 0;
  let deliveries = 0;
  const handler = createEnquiryHandler({
    siteUrl: "https://loranetwork.example",
    findProduct: () => undefined,
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
    findProduct: () => undefined,
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

test("preserves process-local rate limiting", async () => {
  let deliveries = 0;
  const handler = createEnquiryHandler({
    siteUrl: "https://loranetwork.example",
    findProduct: () => undefined,
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
