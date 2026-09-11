import assert from "node:assert/strict";
import test from "node:test";
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
