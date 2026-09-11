export type PricingConfiguration = Readonly<{
  usdZarRate: number;
  markupRate: number;
}>;

import { BUSINESS_CONFIG } from "./business.ts";

export const PRICING_CONFIG: PricingConfiguration = BUSINESS_CONFIG.pricing;
export const VAT_DISPLAY_MODE = BUSINESS_CONFIG.commerce.vatDisplayMode;
