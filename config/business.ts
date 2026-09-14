export type VatDisplayMode = "none" | "inclusive" | "exclusive";

const FALLBACK_USD_ZAR_RATE = 16.75;
const FALLBACK_PRICING_RATE_UPDATED_AT = "2026-09-14";
const MARKUP_RATE = 0.4;

function optional(value: string | undefined) {
  return value?.trim() || undefined;
}

function positiveNumber(name: string, value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number.`);
  return parsed;
}

function vatMode(value: string | undefined): VatDisplayMode {
  if (!value) return "none";
  if (value === "none" || value === "inclusive" || value === "exclusive") return value;
  throw new Error('VAT_DISPLAY_MODE must be "none", "inclusive", or "exclusive".');
}

function siteUrl(value: string | undefined) {
  const candidate = optional(value) ?? "http://localhost:3000";
  const parsed = new URL(candidate);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("NEXT_PUBLIC_SITE_URL must use http or https.");
  return parsed.origin;
}

// This module is server/build configuration. Never import it from a Client Component.
export const BUSINESS_CONFIG = Object.freeze({
  pricing: Object.freeze({ usdZarRate: positiveNumber("USD_ZAR_RATE", process.env.USD_ZAR_RATE, FALLBACK_USD_ZAR_RATE), markupRate: MARKUP_RATE }),
  commerce: Object.freeze({ vatDisplayMode: vatMode(process.env.VAT_DISPLAY_MODE), pricingRateUpdatedAt: optional(process.env.PRICING_RATE_UPDATED_AT) ?? FALLBACK_PRICING_RATE_UPDATED_AT }),
  enquiries: Object.freeze({ recipientEmail: optional(process.env.CONTACT_RECIPIENT_EMAIL), provider: optional(process.env.EMAIL_PROVIDER)?.toLowerCase(), apiKey: optional(process.env.EMAIL_API_KEY), fromAddress: optional(process.env.EMAIL_FROM_ADDRESS) }),
  site: Object.freeze({ url: siteUrl(process.env.NEXT_PUBLIC_SITE_URL), analyticsId: optional(process.env.ANALYTICS_ID) }),
  profile: Object.freeze({ email: optional(process.env.BUSINESS_EMAIL), phone: optional(process.env.BUSINESS_PHONE), address: optional(process.env.BUSINESS_ADDRESS) }),
});
