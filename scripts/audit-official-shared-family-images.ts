import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Product = { sku: string };
type ManifestImage = { sku: string };
type OfficialPage = { url: string; title: string; imageUrl: string | null };

const root = process.cwd();
const products = (JSON.parse(await readFile(join(root, "data", "dragino-products.json"), "utf8")) as { products: Product[] }).products;
const mappedImages = (JSON.parse(await readFile(join(root, "data", "product-images.json"), "utf8")) as { images: ManifestImage[] }).images;
const pages = (JSON.parse(await readFile(join(root, "data", "dragino-official-page-index.json"), "utf8")) as { pages: OfficialPage[] }).pages;

function normal(value: string) { return value.replace(/[^A-Z0-9-]+/gi, " ").replace(/\s+/g, " ").trim().toUpperCase(); }
function familyName(sku: string) {
  const parts = normal(sku).split("-").filter(Boolean);
  if (parts.length > 1 && /^(?:SDI|MR)$/.test(parts[0]) && /^(?:\d|XX)/.test(parts[1])) return parts.slice(0, 2).join("-");
  return parts[0] ?? "";
}
function hasToken(value: string, token: string) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`, "i").test(normal(value));
}
function canonicalAsset(imageUrl: string) { return new URL(imageUrl).pathname; }
function canonicalPage(pageUrl: string) { return new URL(pageUrl).pathname.replace(/\/$/, ""); }
function modelTitle(title: string) { return title.split(/\s(?:–|—|--)\s|\|/)[0]; }

const mappedSkus = new Set(mappedImages.map((image) => image.sku));
const families = Map.groupBy(products, (product) => familyName(product.sku));
const candidates = [];

for (const [family, members] of families) {
  const unresolved = members.filter((product) => !mappedSkus.has(product.sku));
  if (!unresolved.length || family.length < 3) continue;
  const familyPages = pages.filter((page) => page.imageUrl && hasToken(modelTitle(page.title), family) && (/Dragino Documentation Center$/i.test(page.title) || /\/products\/[^?#]+\/item\//i.test(page.url)));
  const assetGroups = Map.groupBy(familyPages, (page) => canonicalAsset(page.imageUrl!));

  for (const [assetPath, assetPages] of assetGroups) {
    const distinctPages = [...new Map(assetPages.map((page) => [canonicalPage(page.url), page])).values()];
    if (distinctPages.length < 2) continue;
    candidates.push({
      family,
      unresolvedSkus: unresolved.map((product) => product.sku.trim()),
      mappedFamilyProducts: members.length - unresolved.length,
      assetPath,
      officialPages: distinctPages.map((page) => ({ url: page.url, title: page.title, imageUrl: page.imageUrl }))
    });
  }
}

candidates.sort((a, b) => b.unresolvedSkus.length - a.unresolvedSkus.length || a.family.localeCompare(b.family));
const report = {
  generatedAt: new Date().toISOString(),
  rule: "Candidate assets are byte-address-equivalent official image paths published on at least two distinct Dragino model-documentation paths for the same catalogue family.",
  candidateFamilies: candidates.length,
  candidates
};
await writeFile(join(root, "reports", "official-shared-family-image-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ candidateFamilies: candidates.length, candidates: candidates.map(({ family, unresolvedSkus, officialPages }) => ({ family, unresolvedProducts: unresolvedSkus.length, officialPages: officialPages.length })) }, null, 2));
