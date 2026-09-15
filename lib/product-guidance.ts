import "server-only";
import guidanceJson from "@/data/product-guidance.json";

export type ProductGuidance = {
  sku: string;
  definition?: string;
  uses?: string;
  suitability?: string;
  buyerChecks?: string[];
  sourceUrl?: string;
  evidenceLevel: "EXACT_PRODUCT_SOURCE" | "FAMILY_SOURCE";
};

const guidanceBySku = new Map((guidanceJson as { products: ProductGuidance[] }).products.map((guidance) => [guidance.sku, guidance]));

export function getProductGuidance(sku: string) {
  return guidanceBySku.get(sku);
}