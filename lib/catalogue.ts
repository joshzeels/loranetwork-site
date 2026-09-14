import "server-only";
import catalogueJson from "@/data/dragino-products.json";
import imageManifestJson from "@/data/product-images.json";
import { getPublicPrice } from "@/lib/pricing";
import { displayValue, facetSlug, facetValue, type PublicDraginoProduct } from "@/lib/product-presentation";
import { BUSINESS_CONFIG } from "@/config/business";

export type DraginoProduct = {
  sourceRow: number;
  slug: string;
  sku: string;
  application: string;
  specification: string;
  iotInterface: string;
  priceUsd: string;
  productUrl: string;
  packageDimensionMm: string;
  packageWeightG: string;
};

type Catalogue = {
  source: {
    file: string;
    worksheet: string;
    productCount: number;
  };
  products: DraginoProduct[];
};

export const catalogue = catalogueJson as Catalogue;
export const products = catalogue.products;

type ProductImageRecord = {
  sku: string;
  slug: string;
  localPath: string;
  sourcePage: string;
  originalImageUrl: string;
  sourceDomain: string;
  matchConfidence: "EXACT" | "FAMILY_CONFIRMED";
  matchMethod: string;
  productFamily: string;
  licenceClassification: "PUBLIC_DOMAIN" | "CC0" | "CC_BY" | "CC_BY_SA" | "MANUFACTURER_REUSE_CONFIRMED" | "MANUFACTURER_OWNED" | "LICENCE_UNCLEAR" | "REUSE_NOT_ALLOWED";
  licenceName: string;
  licenceUrl: string;
  attributionRequired: boolean;
  attributionText: string;
  retrievedAt: string;
  notes: string;
};

const imageRecords = (imageManifestJson as { images: ProductImageRecord[] }).images;
const imageBySku = new Map(imageRecords.map((image) => [image.sku, image]));

export const publicProducts: PublicDraginoProduct[] = products.map((product) => {
  const publicPrice = getPublicPrice(product.priceUsd);

  return {
    sourceRow: product.sourceRow,
    slug: product.slug,
    sku: product.sku,
    application: displayValue(product.application),
    specification: displayValue(product.specification),
    iotInterface: displayValue(product.iotInterface),
    formattedPriceZar: publicPrice.formatted,
    imagePath: imageBySku.get(product.sku)?.localPath ?? "",
  };
});

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getFacetOptions(field: "application" | "iotInterface") {
  const facets = new Map<string, { value: string; count: number }>();

  for (const product of products) {
    const display = displayValue(product[field]);
    if (!display) continue;

    const key = facetValue(display);
    const current = facets.get(key);
    facets.set(key, {
      value: current?.value ?? display,
      count: (current?.count ?? 0) + 1,
    });
  }

  return [...facets.values()].sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value, "en-ZA"),
  );
}

export const applicationOptions = getFacetOptions("application");
export const interfaceOptions = getFacetOptions("iotInterface");

export type CatalogueFacet = { value: string; count: number; slug: string };

function withSlugs(options: { value: string; count: number }[]): CatalogueFacet[] {
  const used = new Map<string, number>();
  return options.map((option) => {
    const base = facetSlug(option.value) || "uncategorised";
    const occurrence = (used.get(base) ?? 0) + 1;
    used.set(base, occurrence);
    return { ...option, slug: occurrence === 1 ? base : `${base}-${occurrence}` };
  });
}

export const applicationFacets = withSlugs(applicationOptions);
export const interfaceFacets = withSlugs(interfaceOptions);

export function getFacetBySlug(kind: "application" | "iotInterface", slug: string) {
  return (kind === "application" ? applicationFacets : interfaceFacets).find((facet) => facet.slug === slug);
}

export function getPublicProductsByFacet(kind: "application" | "iotInterface", value: string) {
  const normalized = facetValue(value);
  return publicProducts.filter((product) => facetValue(product[kind]) === normalized);
}

export function getImageForProduct(sku: string) {
  return imageBySku.get(sku) ?? null;
}

export function getSiteUrl() {
  return BUSINESS_CONFIG.site.url;
}
