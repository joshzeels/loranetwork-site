import assert from "node:assert/strict";
import test from "node:test";
import {
  InvalidPricingInputError,
  calculateSellingPriceZar,
  formatSellingPriceZar,
  getPublicPrice,
} from "../lib/pricing.ts";

test("calculates the configured price completely before rounding", () => {
  assert.equal(calculateSellingPriceZar("100.00"), 2345);
});

test("calculates decimal supplier prices", () => {
  assert.equal(calculateSellingPriceZar("55.5"), 1301.48);
});

test("calculates very low prices without prematurely rounding the conversion", () => {
  assert.equal(calculateSellingPriceZar("0.01"), 0.23);
  assert.equal(calculateSellingPriceZar("0.37"), 8.68);
});

test("returns no price for genuinely missing source values", () => {
  assert.equal(calculateSellingPriceZar(""), null);
  assert.equal(calculateSellingPriceZar(null), null);
  assert.equal(calculateSellingPriceZar(undefined), null);
  assert.deepEqual(getPublicPrice(""), {
    amountZar: null,
    formatted: "Contact for pricing",
    schemaAmount: null,
    vatNotice: "VAT treatment will be confirmed on quotation.",
  });
});

test("rejects zero and invalid supplier values", () => {
  for (const invalidValue of [0, "0", -1, "-1", " ", "free", "1,25", Number.NaN]) {
    assert.throws(
      () => calculateSellingPriceZar(invalidValue),
      InvalidPricingInputError,
    );
  }
});

test("supports a changed conversion rate without changing the calculation", () => {
  assert.equal(
    calculateSellingPriceZar("100", { usdZarRate: 20, markupRate: 0.40 }),
    2800,
  );
});

test("supports a changed markup configuration", () => {
  assert.equal(
    calculateSellingPriceZar("100", { usdZarRate: 20, markupRate: 0.1 }),
    2200,
  );
});

test("rejects invalid pricing configuration", () => {
  assert.throws(
    () => calculateSellingPriceZar("100", { usdZarRate: 0, markupRate: 0.40 }),
    InvalidPricingInputError,
  );
  assert.throws(
    () => calculateSellingPriceZar("100", { usdZarRate: 20, markupRate: -0.01 }),
    InvalidPricingInputError,
  );
});

test("formats public prices with the South African ZAR locale", () => {
  assert.equal(formatSellingPriceZar(1299), "R\u00a01\u00a0299,00");
  assert.deepEqual(getPublicPrice("100.00"), {
    amountZar: 2345,
    formatted: "R\u00a02\u00a0345,00",
    schemaAmount: "2345.00",
    vatNotice: "VAT treatment will be confirmed on quotation.",
  });
});
