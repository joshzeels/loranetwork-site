import "server-only";
import discoveryJson from "@/data/discovery-content.json";
import {
  applicationFacets,
  interfaceFacets,
  products,
  type CatalogueFacet,
  type DraginoProduct,
} from "@/lib/catalogue";
import { displayValue, facetValue } from "@/lib/product-presentation";

export type ProductFamily = {
  slug: string;
  name: string;
  skuPrefix: string;
  purpose: string;
  evidence: string;
};

export type BuyingGuide = {
  slug: string;
  title: string;
  question: string;
  answerTemplate: string;
  applicationValues: string[];
  searchTerms: string[];
  considerations: string[];
  differenceSummary: string;
  decisionPath: string[];
  relatedFamilySlugs: string[];
};

export type ApplicationGuidance = {
  directAnswer: string;
  hardwareSummary: string;
  considerations: string[];
  selectionPath: string;
};

export type ConnectivityGuidance = {
  definition: string;
  deploymentFit: string;
  advantage: string;
  limitation: string;
  sourceLabel: string;
  sourceUrl: string;
};

type DiscoveryContent = {
  indexableApplications: string[];
  indexableInterfaces: string[];
  applicationGuidance: Record<string, ApplicationGuidance>;
  connectivityGuidance: Record<string, ConnectivityGuidance>;
  families: ProductFamily[];
  guides: BuyingGuide[];
};

const content = discoveryJson as DiscoveryContent;
const applicationKeys = new Set(content.indexableApplications.map(facetValue));
const interfaceKeys = new Set(content.indexableInterfaces.map(facetValue));

export const indexableApplicationFacets = applicationFacets.filter((facet) => applicationKeys.has(facetValue(facet.value)));
export const indexableInterfaceFacets = interfaceFacets.filter((facet) => interfaceKeys.has(facetValue(facet.value)));
export const productFamilies = content.families;
export const buyingGuides = content.guides;

export function getConnectivityGuidance(value: string) {
  return content.connectivityGuidance[value];
}

export function getApplicationGuidance(value: string) {
  return content.applicationGuidance[value];
}

function cleanSku(value: string) {
  return displayValue(value).toUpperCase();
}

export function normaliseSearchText(value: string) {
  return displayValue(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-ZA")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getFamilyProducts(family: ProductFamily) {
  const prefix = cleanSku(family.skuPrefix);
  return products.filter((product) => {
    const sku = cleanSku(product.sku);
    return sku === prefix || sku.startsWith(`${prefix}-`);
  });
}

export function getFamilyBySlug(slug: string) {
  return productFamilies.find((family) => family.slug === slug);
}

export function getProductFamily(product: DraginoProduct) {
  return productFamilies.find((family) => getFamilyProducts(family).some((member) => member.sku === product.sku));
}

export function getFamilyComparisonSummary(family: ProductFamily, currentProduct?: DraginoProduct) {
  const members = getFamilyProducts(family);
  const interfaces = [...new Set(members.map((product) => displayValue(product.iotInterface)).filter(Boolean))];
  const specifications = new Set(members.map((product) => displayValue(product.specification)).filter(Boolean));
  const publicPrices = new Set(members.map((product) => product.priceUsd).filter(Boolean));
  const familySummary = `${family.name} has ${members.length} catalogue models across ${interfaces.length} listed connectivity ${interfaces.length === 1 ? "option" : "options"}${interfaces.length ? `: ${interfaces.join(", ")}` : ""}. The family contains ${specifications.size} distinct supplied specification ${specifications.size === 1 ? "record" : "records"}${publicPrices.size > 1 ? ", and public ZAR prices vary by model" : ""}.`;

  if (!currentProduct) return familySummary;
  const currentInterface = displayValue(currentProduct.iotInterface);
  const sameInterfaceCount = members.filter((product) => displayValue(product.iotInterface) === currentInterface).length;
  const alternatives = interfaces.filter((value) => value !== currentInterface);
  const specificationMatches = members.filter((product) => product.sku !== currentProduct.sku && displayValue(product.specification) === displayValue(currentProduct.specification)).length;
  return `${currentProduct.sku} is one of ${sameInterfaceCount} ${family.name} ${sameInterfaceCount === 1 ? "model" : "models"} with ${currentInterface || "no connectivity value"} listed.${alternatives.length ? ` Related models also list ${alternatives.join(", ")}.` : ""} Its supplied specification ${specificationMatches ? `is shared by ${specificationMatches} other family ${specificationMatches === 1 ? "model" : "models"}` : "differs from the other family records"}. Compare the exact rows for model and price differences.`;
}

export function getGuideProducts(guide: BuyingGuide) {
  const applicationValues = new Set(guide.applicationValues.map(facetValue));
  return products.filter((product) => {
    if (applicationValues.has(facetValue(product.application))) return true;
    if (!guide.searchTerms.length) return false;
    const searchable = normaliseSearchText([product.sku, product.application, product.specification, product.iotInterface].join(" "));
    return guide.searchTerms.some((term) => searchable.includes(normaliseSearchText(term)));
  });
}

export function getGuideBySlug(slug: string) {
  return buyingGuides.find((guide) => guide.slug === slug);
}

export function getRelevantGuides(product: DraginoProduct) {
  return buyingGuides.filter((guide) => getGuideProducts(guide).some((member) => member.sku === product.sku));
}

export function getIndexableApplicationFacet(value: string): CatalogueFacet | undefined {
  return indexableApplicationFacets.find((facet) => facetValue(facet.value) === facetValue(value));
}

export function getIndexableInterfaceFacet(value: string): CatalogueFacet | undefined {
  return indexableInterfaceFacets.find((facet) => facetValue(facet.value) === facetValue(value));
}

export function getIndexableInterfacesForProducts(group: DraginoProduct[]) {
  const present = new Set(group.map((product) => facetValue(product.iotInterface)));
  return indexableInterfaceFacets.filter((facet) => present.has(facetValue(facet.value)));
}

export function getIndexableApplicationsForProducts(group: DraginoProduct[]) {
  const present = new Set(group.map((product) => facetValue(product.application)));
  return indexableApplicationFacets.filter((facet) => present.has(facetValue(facet.value)));
}
