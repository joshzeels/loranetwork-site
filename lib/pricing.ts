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
}>;

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

export function calculateSellingPriceZar(
  supplierPriceUsd: string | number | null | undefined,
  configuration: PricingConfiguration = PRICING_CONFIG,
): number | null {
  validateConfiguration(configuration);
  const supplierPrice = parseSupplierPrice(supplierPriceUsd);
  if (supplierPrice === null) return null;

  const completeCalculation = supplierPrice * configuration.usdZarRate * (1 + configuration.markupRate);
  return Math.round((completeCalculation + Number.EPSILON) * 100) / 100;
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
    };
  }

  const vatLabel = VAT_DISPLAY_MODE === "inclusive" ? " incl. VAT" : VAT_DISPLAY_MODE === "exclusive" ? " excl. VAT" : "";
  return {
    amountZar,
    formatted: `${formatSellingPriceZar(amountZar)}${vatLabel}`,
    schemaAmount: amountZar.toFixed(2),
  };
}
