import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
for (const name of [".env", ".env.local"]) {
  const path = resolve(root, name);
  if (existsSync(path)) process.loadEnvFile(path);
}

type Product = { sku: string; slug: string; application: string; iotInterface: string };
type Facet = { slug: string; value: string };
type Family = { slug: string; skuPrefix: string };
type Guide = { slug: string; applicationValues: string[]; relatedFamilySlugs: string[]; relatedGuideSlugs?: string[] };

const catalogue = JSON.parse(readFileSync(resolve(root, "data", "dragino-products.json"), "utf8")) as { products: Product[] };
const discovery = JSON.parse(readFileSync(resolve(root, "data", "discovery-content.json"), "utf8")) as { indexableApplications: string[]; indexableInterfaces: string[]; families: Family[]; guides: Guide[] };
const normalise = (value: string) => value.trim().toLocaleLowerCase("en-ZA");
const slugify = (value: string) => normalise(value).replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const applicationValues = new Set(discovery.indexableApplications.map(normalise));
const interfaceValues = new Set(discovery.indexableInterfaces.map(normalise));
function currentFacets(values: string[], indexableValues: Set<string>): Facet[] {
  const byValue = new Map<string, string>();
  for (const value of values) {
    const key = normalise(value);
    if (key && indexableValues.has(key) && !byValue.has(key)) byValue.set(key, value);
  }
  const usedSlugs = new Map<string, number>();
  return [...byValue.values()].map((value) => {
    const base = slugify(value) || "uncategorised";
    const occurrence = (usedSlugs.get(base) ?? 0) + 1;
    usedSlugs.set(base, occurrence);
    return { value, slug: occurrence === 1 ? base : `${base}-${occurrence}` };
  });
}
const applicationFacets = currentFacets(catalogue.products.map((product) => product.application), applicationValues);
const interfaceFacets = currentFacets(catalogue.products.map((product) => product.iotInterface), interfaceValues);
const productionOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://loranetwork.co.za").origin;
const expectedOrigin = "https://loranetwork.co.za";
const failures: string[] = [];

function check(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const coreRoutes = ["/", "/about", "/applications", "/connectivity", "/contact", "/families", "/guides", "/privacy", "/products", "/terms"];
const productRoutes = catalogue.products.map((product) => `/products/${product.slug}`);
const applicationRoutes = applicationFacets.map((facet) => `/applications/${facet.slug}`);
const connectivityRoutes = interfaceFacets.map((facet) => `/connectivity/${facet.slug}`);
const familyRoutes = discovery.families.map((family) => `/families/${family.slug}`);
const guideRoutes = discovery.guides.map((guide) => `/guides/${guide.slug}`);
const knownRoutes = new Set([...coreRoutes, ...productRoutes, ...applicationRoutes, ...connectivityRoutes, ...familyRoutes, ...guideRoutes, "/compare"]);

for (const [label, values] of [["product SKU", catalogue.products.map((product) => product.sku)], ["product slug", catalogue.products.map((product) => product.slug)], ["application slug", applicationFacets.map((facet) => facet.slug)], ["connectivity slug", interfaceFacets.map((facet) => facet.slug)], ["family slug", discovery.families.map((family) => family.slug)], ["guide slug", discovery.guides.map((guide) => guide.slug)]] as const) {
  check(new Set(values).size === values.length, `Duplicate ${label} detected.`);
}

for (const family of discovery.families) {
  const prefix = normalise(family.skuPrefix);
  check(catalogue.products.some((product) => normalise(product.sku) === prefix || normalise(product.sku).startsWith(`${prefix}-`)), `Family ${family.slug} has no matching product.`);
}
for (const guide of discovery.guides) {
  check(guide.applicationValues.every((value) => catalogue.products.some((product) => normalise(product.application) === normalise(value))), `Guide ${guide.slug} references an unknown application.`);
  check(guide.relatedFamilySlugs.every((slug) => discovery.families.some((family) => family.slug === slug)), `Guide ${guide.slug} references an unknown family.`);
  check((guide.relatedGuideSlugs ?? []).every((slug) => discovery.guides.some((candidate) => candidate.slug === slug)), `Guide ${guide.slug} references an unknown guide.`);
}

for (const file of sourceFiles(resolve(root, "app")).concat(sourceFiles(resolve(root, "components")))) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/href=["'](\/[A-Za-z0-9_./-]*(?:#[A-Za-z0-9_-]+)?)["']/g)) {
    const href = match[1];
    const path = href.split(/[?#]/, 1)[0] || "/";
    check(knownRoutes.has(path), `Unknown static internal link ${href} in ${file.replace(root, ".")}.`);
  }
}

const activeSources = sourceFiles(resolve(root, "app")).concat(sourceFiles(resolve(root, "components")), sourceFiles(resolve(root, "lib")), sourceFiles(resolve(root, "config")));
for (const file of activeSources) {
  const source = readFileSync(file, "utf8");
  if (/vercel\.app/i.test(source)) failures.push(`Stale Vercel hostname in ${file.replace(root, ".")}.`);
}

check(productionOrigin === expectedOrigin, `Production origin must be ${expectedOrigin}; received ${productionOrigin}.`);
const sitemapUrls = [...coreRoutes, ...applicationRoutes, ...connectivityRoutes, ...familyRoutes, ...guideRoutes, ...productRoutes].map((path) => `${productionOrigin}${path === "/" ? "" : path}`);
check(!sitemapUrls.includes(`${productionOrigin}/compare`), "Compare must not be included in the sitemap.");
check(new Set(sitemapUrls).size === sitemapUrls.length, "Duplicate sitemap URLs detected.");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${catalogue.products.length} products, ${applicationRoutes.length} applications, ${connectivityRoutes.length} connectivity pages, ${familyRoutes.length} families, ${guideRoutes.length} guides, ${sitemapUrls.length} unique sitemap URLs.`);
  console.log(`PASS: static internal links resolve and the production origin is ${productionOrigin}.`);
}
