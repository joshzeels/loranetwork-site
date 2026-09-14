import { PRICING_CONFIG, VAT_DISPLAY_MODE, type PricingConfiguration } from "../config/pricing.ts";

export class InvalidPricingInputError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPricingInputError";
  }
}

export type PublicPrice = Readonly<{
  amountZar: number | null;
  formatted: string;
  schemaAmount: string | null;
  vatNotice: string;
}>;

export function getVatDisplayNotice() {
  if (VAT_DISPLAY_MODE === "inclusive") return "VAT included.";
  if (VAT_DISPLAY_MODE === "exclusive") return "VAT excluded.";
  return "VAT treatment will be confirmed on quotation.";
}

function parseSupplierPrice(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string" && !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) {
    throw new InvalidPricingInputError(`Invalid supplier price: ${JSON.stringify(value)}`);
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new InvalidPricingInputError(`Supplier price must be a finite number greater than zero: ${JSON.stringify(value)}`);
  }

  return parsed;
}

function validateConfiguration(configuration: PricingConfiguration) {
  if (!Number.isFinite(configuration.usdZarRate) || configuration.usdZarRate <= 0) {
    throw new InvalidPricingInputError("The configured currency conversion rate must be greater than zero.");
  }

  if (!Number.isFinite(configuration.markupRate) || configuration.markupRate < 0) {
    throw new InvalidPricingInputError("The configured markup rate cannot be negative.");
  }
}

type DecimalFraction = { numerator: bigint; denominator: bigint };
const BIG_ONE = BigInt(1);
const BIG_TWO = BigInt(2);
const BIG_TEN = BigInt(10);
const BIG_TWO_HUNDRED = BigInt(200);

function decimalFraction(value: string | number): DecimalFraction {
  const match = String(value).match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i);
  if (!match) throw new InvalidPricingInputError(`Invalid decimal value: ${JSON.stringify(value)}`);
  const sign = match[1] === "-" ? -BIG_ONE : BIG_ONE;
  const whole = match[2] ?? "0";
  const fraction = match[3] ?? match[4] ?? "";
  const exponent = Number(match[5] ?? 0);
  const digits = BigInt(`${whole}${fraction}` || "0") * sign;
  const scale = fraction.length - exponent;
  if (scale >= 0) return { numerator: digits, denominator: BIG_TEN ** BigInt(scale) };
  return { numerator: digits * BIG_TEN ** BigInt(-scale), denominator: BIG_ONE };
}

export function calculateSellingPriceZar(
  supplierPriceUsd: string | number | null | undefined,
  configuration: PricingConfiguration = PRICING_CONFIG,
): number | null {
  validateConfiguration(configuration);
  const supplierPrice = parseSupplierPrice(supplierPriceUsd);
  if (supplierPrice === null) return null;

  const supplier = decimalFraction(typeof supplierPriceUsd === "string" ? supplierPriceUsd : supplierPrice);
  const exchangeRate = decimalFraction(configuration.usdZarRate);
  const markup = decimalFraction(configuration.markupRate);
  const numerator = supplier.numerator * exchangeRate.numerator * (markup.denominator + markup.numerator);
  const denominator = supplier.denominator * exchangeRate.denominator * markup.denominator;
  const roundedCents = (numerator * BIG_TWO_HUNDRED + denominator) / (denominator * BIG_TWO);
  return Number(roundedCents) / 100;
}

export function formatSellingPriceZar(amountZar: number): string {
  if (!Number.isFinite(amountZar) || amountZar <= 0) {
    throw new InvalidPricingInputError("A public selling price must be a finite number greater than zero.");
  }

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountZar);
}

export function getPublicPrice(
  supplierPriceUsd: string | number | null | undefined,
  configuration: PricingConfiguration = PRICING_CONFIG,
): PublicPrice {
  const amountZar = calculateSellingPriceZar(supplierPriceUsd, configuration);

  if (amountZar === null) {
    return {
      amountZar: null,
      formatted: "Contact for pricing",
      schemaAmount: null,
      vatNotice: getVatDisplayNotice(),
    };
  }

  const vatLabel = VAT_DISPLAY_MODE === "inclusive" ? " incl. VAT" : VAT_DISPLAY_MODE === "exclusive" ? " excl. VAT" : "";
  return {
    amountZar,
    formatted: `${formatSellingPriceZar(amountZar)}${vatLabel}`,
    schemaAmount: amountZar.toFixed(2),
    vatNotice: getVatDisplayNotice(),
  };
}
