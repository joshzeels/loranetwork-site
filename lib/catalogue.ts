import "server-only";
import catalogueJson from "@/data/dragino-products.json";
import documentationJson from "@/data/product-documentation.json";
import imageManifestJson from "@/data/product-images.json";
import { getPublicPrice } from "@/lib/pricing";
import { displayValue, facetSlug, facetValue, type PublicDraginoProduct } from "@/lib/product-presentation";
import { organizationId } from "@/lib/structured-data";
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

export type ProductDocumentation = {
  sku: string;
  slug: string;
  status: "EXACT_PRODUCT_SOURCE" | "FAMILY_SOURCE" | "NO_VERIFIED_SOURCE" | "AMBIGUOUS";
  sourceUrl: string;
  matchedFamily: string;
  evidence: string;
  presentInOfficialPageIndex: boolean;
};

const documentationRecords = (documentationJson as { products: ProductDocumentation[] }).products;
const documentationBySku = new Map(documentationRecords.map((record) => [record.sku, record]));

export function getDocumentationForProduct(sku: string) {
  const record = documentationBySku.get(sku);
  return record && (record.status === "EXACT_PRODUCT_SOURCE" || record.status === "FAMILY_SOURCE") ? record : undefined;
}

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

const montageImagePaths = new Set([
  "/images/products/_official/71eba7e3cfbc62f4.jpg",
  "/images/products/_official/1c7b96fcab252f11.png",
  "/images/products/_official/9f6359cd8df3dc16.png",
  "/images/products/_official/867a7fb03d7f1e8f.png",
]);

export function getDisplayImagePath(product: DraginoProduct, image?: ProductImageRecord) {
  if (!image || !montageImagePaths.has(image.localPath)) return image?.localPath ?? "";
  if (/^PS-(?:NB|NS)-I/i.test(product.sku)) return "/images/products/_official/ps-nb-immersion.png";
  if (/^PS-(?:CB|CS|K[NS])-I/i.test(product.sku)) return "/images/products/_official/ps-cb-immersion.png";
  if (/^PS-(?:NB|NS)-T/i.test(product.sku)) return "/images/products/_official/ps-nb-single.png";
  if (/^PS-(?:CB|CS|K[NS])-T/i.test(product.sku)) return "/images/products/_official/ps-cb-single.png";
  const solarVariant = /-(?:LS|CS|NS)(?:-|$)/i.test(product.sku);
  if (/^D20S-/i.test(product.sku)) return solarVariant ? "/images/products/_official/dc16df8e919fba8d.jpg" : "/images/products/_official/34cd0b0c8fb96168.jpg";
  if (/^D20-/i.test(product.sku)) return solarVariant ? "/images/products/_official/10720efa37d3f643.jpg" : "/images/products/_official/5dddfe60608e4402.jpg";
  if (/^D22-/i.test(product.sku)) return solarVariant ? "/images/products/_official/350eb20cab39374e.jpg" : "/images/products/_official/3563712d0c5bd2d6.jpg";
  if (/^D23-/i.test(product.sku)) return solarVariant ? "/images/products/_official/ec5babb0f75299d2.jpg" : "/images/products/_official/5675507b028f4a98.png";
  if (/^CS01-/i.test(product.sku)) return "/images/products/_official/07741bfcb0239eb2.jpg";
  return image.localPath;
}

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
    imagePath: getDisplayImagePath(product, imageBySku.get(product.sku)),
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

// Stable @id for the single site-level Organization node (declared in full on the homepage).
// Other pages reference this id instead of redeclaring Organization fields, so there is only
// ever one Organization entity for search engines to reconcile.
export function getOrganizationId() {
  return organizationId(getSiteUrl());
}
