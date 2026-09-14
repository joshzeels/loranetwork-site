import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";

type Product = { slug: string; sku: string; application: string; specification: string; iotInterface: string; productUrl: string };
type Catalogue = { products: Product[] };
type Confidence = "EXACT" | "FAMILY_CONFIRMED" | "AMBIGUOUS" | "NO_MATCH";
type OfficialPage = { url: string; title: string; text: string; imageUrl: string | null };
type AuditProduct = { sku: string; status: "MAPPED" | "PLACEHOLDER"; confidence: Confidence; officialSourcePage: string; originalImageUrl: string; localImage: string; matchMethod: string; family: string; notes: string };
type ImageRecord = { sku: string; slug: string; localPath: string; sourcePage: string; originalImageUrl: string; sourceDomain: string; matchConfidence: "EXACT" | "FAMILY_CONFIRMED"; matchMethod: string; productFamily: string; licenceClassification: "MANUFACTURER_OWNED"; licenceName: string; licenceUrl: string; attributionRequired: boolean; attributionText: string; retrievedAt: string; notes: string };

const root = process.cwd();
const cataloguePath = join(root, "data", "dragino-products.json");
const manifestPath = join(root, "data", "product-images.json");
const pageIndexPath = join(root, "data", "dragino-official-page-index.json");
const reportPath = join(root, "reports", "product-image-audit.json");
const publicRoot = join(root, "public", "images", "products");
const sharedRoot = join(publicRoot, "_official");
const userAgent = "LoRaNetworkSA-OfficialImageReconciliation/2.0";
const officialHosts = new Set(["dragino.com", "www.dragino.com", "wiki.dragino.com", "www.wiki.dragino.com", "docs.dragino.com", "www.docs.dragino.com"]);
const commercialSuffixes = new Set(["GE", "1T"]);
const visuallyEquivalentModelTokens = new Map([["LB2", "LB"], ["NB2", "NB"], ["CB2", "CB"], ["FB2", "FB"]]);
const reviewedGalleryOverrides = new Map<string, string>([
  ["D20-LS", "https://www.dragino.com/media/k2/galleries/259/D20-LS_20.jpg"],
  ["D20S-LB", "https://www.dragino.com/media/k2/galleries/259/D20S-LB_00.JPG"],
  ["D20S-LB2", "https://www.dragino.com/media/k2/galleries/259/D20S-LB_00.JPG"],
  ["D20S-LS", "https://www.dragino.com/media/k2/galleries/259/D20S-LS_20.jpg"],
  ["D20S-NB-GE", "https://www.dragino.com/media/k2/galleries/292/D20S-NB_10.jpg"],
  ["D20S-NB2-GE", "https://www.dragino.com/media/k2/galleries/292/D20S-NB_10.jpg"],
  ["D20S-NB-1T", "https://www.dragino.com/media/k2/galleries/292/D20S-NB_10.jpg"],
  ["D20S-NB2-1T", "https://www.dragino.com/media/k2/galleries/292/D20S-NB_10.jpg"],
  ["LTC1-LS", "https://www.dragino.com/media/k2/galleries/343/ltc1-ls-12.png"],
  ["LTC1-NS-GE", "https://www.dragino.com/media/k2/galleries/368/ltc1-ns-12.png"],
  ["LTC1-NS-1T", "https://www.dragino.com/media/k2/galleries/368/ltc1-ns-12.png"],
  ["LTC2-LB", "https://www.dragino.com/media/k2/galleries/343/ltc2-lb-1.jpg"],
  ["LTC2-LB2", "https://www.dragino.com/media/k2/galleries/343/ltc2-lb-1.jpg"],
  ["LTC2-LS", "https://www.dragino.com/media/k2/galleries/343/ltc2-ls-2.jpg"],
  ["LTC2-NB-GE", "https://www.dragino.com/media/k2/galleries/368/ltc2-nb-1.jpg"],
  ["LTC2-NB2-GE", "https://www.dragino.com/media/k2/galleries/368/ltc2-nb-1.jpg"],
  ["LTC2-NB-1T", "https://www.dragino.com/media/k2/galleries/368/ltc2-nb-1.jpg"],
  ["LTC2-NB2-1T", "https://www.dragino.com/media/k2/galleries/368/ltc2-nb-1.jpg"],
  ["LTC2-NS-GE", "https://www.dragino.com/media/k2/galleries/368/ltc2-ns-3.jpg"],
  ["LTC2-NS-1T", "https://www.dragino.com/media/k2/galleries/368/ltc2-ns-3.jpg"],
  ["TC11-LB", "https://www.dragino.com/media/k2/galleries/321/tc11_1.jpg"],
  ["SDI-12-CS-GE", "https://www.dragino.com/media/k2/galleries/380/SDI-12-CS.png"],
  ["SDI-12-CS-1T", "https://www.dragino.com/media/k2/galleries/380/SDI-12-CS.png"],
  ["SE01-LS", "https://www.dragino.com/media/k2/galleries/277/SE01-LS_30.jpg"],
  ["LMS01-LS", "https://www.dragino.com/media/k2/galleries/281/LMS01-LS_30.jpg"],
  ["SPH01-LS", "https://www.dragino.com/media/k2/galleries/279/SPH01-LS_30.jpg"],
  ["DDS75-LS", "https://www.dragino.com/media/k2/galleries/271/DDS75-LS_30.jpg"],
  ["DDS45-LS", "https://www.dragino.com/media/k2/galleries/272/DDS45-LS_3.jpg"],
  ["DDS20-LS", "https://www.dragino.com/media/k2/galleries/273/DDS20-LS_40.jpg"],
  ["DDS04-LS", "https://www.dragino.com/media/k2/galleries/280/DDS04-LS_30.jpg"],
  ["LDS12-LS", "https://www.dragino.com/media/k2/galleries/276/LDS12-LS_30.jpg"],
  ["LDS40-LS", "https://www.dragino.com/media/k2/galleries/283/LDS40-LS_30.jpg"],
  ["MDS200-LS", "https://www.dragino.com/media/k2/galleries/275/MDS200-LS_30.jpg"],
  ["MDS120-LS", "https://www.dragino.com/media/k2/galleries/274/MDS120-LS_30.jpg"],
  ["PS-LS-NA", "https://www.dragino.com/media/k2/galleries/258/PS-LS-NA.jpg"],
  ["DS03A-LS", "https://www.dragino.com/media/k2/galleries/285/DS03A-LS_30.jpg"],
  ["CPL03-LS", "https://www.dragino.com/media/k2/galleries/278/CPL03-LS_30.jpg"],
  ["SW3L-LS-004", "https://www.dragino.com/media/k2/galleries/269/SW3L-LS_30.jpg"],
  ["SW3L-LS-006", "https://www.dragino.com/media/k2/galleries/269/SW3L-LS_30.jpg"],
  ["SW3L-LS-010", "https://www.dragino.com/media/k2/galleries/269/SW3L-LS_30.jpg"],
  ["SW3L-LS-020", "https://www.dragino.com/media/k2/galleries/269/SW3L-LS_30.jpg"],
  ["WL03A-LB", "https://www.dragino.com/media/k2/galleries/270/WL03A-LB_10.jpg"],
  ["WL03A-LB2", "https://www.dragino.com/media/k2/galleries/270/WL03A-LB_10.jpg"],
  ["WL03A-LS", "https://www.dragino.com/media/k2/galleries/270/WL03A-LS_30.jpg"]
]);

function decodeHtml(value: string) { return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;|&#160;/gi, " "); }
function normal(value: string) { return decodeHtml(value).replace(/[‐‑‒–—−]/g, "-").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toUpperCase(); }
function tokenPattern(value: string) { return new RegExp(`(^|[^A-Z0-9])${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Z0-9]|$)`, "i"); }
function hasToken(text: string, value: string) { return tokenPattern(normal(value)).test(normal(text)); }
function titleIdentifiesModel(title: string, model: string) {
  if (hasToken(title, model)) return true;
  const parts = normal(model).split("-").filter(Boolean);
  if (parts.length < 2) return false;
  const variant = parts.at(-1) ?? "";
  if (!/^[A-Z0-9]+$/.test(variant)) return false;
  const prefix = parts.slice(0, -1).join("-").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const groupedVariants = new RegExp(`(^|[^A-Z0-9])${prefix}-([A-Z0-9]+(?:\\s*[/&]\\s*[A-Z0-9]+)+)([^A-Z0-9]|$)`, "gi");
  for (const match of normal(title).matchAll(groupedVariants)) {
    if ((match[2] ?? "").split(/\s*[/&]\s*/).includes(variant)) return true;
  }
  return false;
}
function visibleText(html: string) { const content = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html; return decodeHtml(content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")); }
function titleFromHtml(html: string) { const og = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]; const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]; return decodeHtml((og ?? title ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
function officialUrl(candidate: string, base: string) { try { const url = new URL(decodeHtml(candidate), base); if (!officialHosts.has(url.hostname.toLowerCase())) return null; url.protocol = "https:"; url.hash = ""; return url.toString(); } catch { return null; } }
function itemLinks(html: string, base: string) { const links = new Set<string>(); for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) { const url = officialUrl(match[1], base); if (url && /\/products\/[^?#]+\/item\/[^?#]+\.html(?:\?|$)/i.test(url)) links.add(url.split("?")[0]); } return [...links]; }
function documentationLinks(html: string, base: string) { const links = new Set<string>(); const excluded = /\/(?:general-configuration|firmware-update|network-communication|faqs?|certification|for-developer|changelog|product-list)\/?$/i; for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) { const url = officialUrl(match[1], base); if (!url) continue; const parsed = new URL(url); const segments = parsed.pathname.split("/").filter(Boolean); if (/(?:wiki|docs)\.dragino\.com$/i.test(parsed.hostname) && segments[0]?.toLowerCase() === "docs" && segments.length >= 4 && !excluded.test(parsed.pathname)) links.add(`${parsed.origin}${parsed.pathname}`); } return [...links]; }
function documentationSitemapLinks(xml: string, base: string) { const links = new Set<string>(); const productCategory = /\/(?:ai-image-recognition|flow-pressure-weight-sensors|door-water-leak-contact-sensors|temperature-humidity-sensors|distance-level-detection|soil-agriculture-sensors|current-tilting-power-monitoring|rs485-sdi-12-sensor-nodes|io-controllers-sensor-nodes|air-water-quality-sensors|weather-stations|ble-hub|tracker|smart-home-controls|vibration-sensors?|lora-modules-accessories)\//i; for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) { let candidate = decodeHtml(match[1]).trim(); try { const published = new URL(candidate); if (published.hostname === "10.130.2.25") candidate = new URL(`${published.pathname}${published.search}`, base).toString(); } catch { continue; } const url = officialUrl(candidate, base); if (!url) continue; const parsed = new URL(url); if (/(?:wiki|docs)\.dragino\.com$/i.test(parsed.hostname) && /^\/docs\/(?:LoRaWAN-End-Node|NB-IoT|CAT-1)\//i.test(parsed.pathname) && productCategory.test(parsed.pathname)) links.add(`${parsed.origin}${parsed.pathname}`); } return [...links]; }
function selectImage(html: string, pageUrl: string) {
  const candidates: Array<{ value: string; context: string }> = [];
  for (const match of html.matchAll(/<(?:img|a)\b[^>]*?(?:src|href)=(?:"([^"]+)"|'([^']+)'|([^\s"'<>`]+))[^>]*>/gi)) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value) candidates.push({ value, context: match[0] });
  }
  const avoid = /(?:diagram|dimension|mechanical|install|wiring|application|network|topology|packing|package|order|part.?number|\bsize\b|payload|frame|byte|command|console|pin.?map|jumper|circuit|chart|graph|logo|banner|screenshot|screen.?shot|interface)/i;
  const lowResolutionUrl = /_(?:XS|S)\.(?:jpe?g|png|webp)(?:[?#]|$)/i;
  const gallery = candidates.map(({ value, context }) => { const url = officialUrl(value, pageUrl); return url ? { url, context } : null; }).filter((value): value is { url: string; context: string } => Boolean(value && /\/media\/k2\/(?:galleries|items\/cache)\/[^?#]+\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(value.url)));
  const clean = gallery.find(({ url, context }) => !lowResolutionUrl.test(url) && !avoid.test(`${new URL(url).pathname} ${context}`));
  if (clean) return clean.url;
  const documentationImages = candidates.map(({ value, context }) => { const url = officialUrl(value, pageUrl); return url ? { url, context } : null; }).filter((value): value is { url: string; context: string } => Boolean(value && /(?:wiki|docs)\.dragino\.com$/i.test(new URL(value.url).hostname) && /\/assets\/images\/[^?#]+\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(value.url)));
  const cleanDocumentationImage = documentationImages.find(({ url, context }) => !lowResolutionUrl.test(url) && !avoid.test(`${new URL(url).pathname} ${context}`));
  if (cleanDocumentationImage) return cleanDocumentationImage.url;
  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:image|image)["'][^>]*content=["']([^"']+)["'][^>]*>/gi)) { const value = officialUrl(match[1], pageUrl); if (value && !lowResolutionUrl.test(value) && /\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(value)) return value; }
  return null;
}
function tableModelPages(html: string, pageUrl: string) {
  const pages: OfficialPage[] = [];
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/tbody|<\/table)/gi)) {
    const rowHtml = match[1];
    const rowText = visibleText(rowHtml).trim();
    if (!/[A-Z0-9]{2,}\s*[-/]\s*[A-Z0-9]/i.test(rowText)) continue;
    const imageUrl = selectImage(rowHtml, pageUrl);
    if (!imageUrl) continue;
    pages.push({ url: pageUrl.split("?")[0], title: rowText.slice(0, 500), text: rowText, imageUrl });
  }
  return pages;
}
function sectionModelPages(html: string, pageUrl: string) {
  const pages: OfficialPage[] = [];
  for (const match of html.matchAll(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[2-4]\b|$)/gi)) {
    const headingText = visibleText(match[2]).trim();
    if (!/[A-Z0-9]{2,}\s*[-/]\s*[A-Z0-9]/i.test(headingText)) continue;
    if (/(?:payload|pin definitions?|mechanical|wiring|installation|command|console|configuration|firmware|upgrade|connection mode)/i.test(headingText)) continue;
    const precedingHtml = html.slice(0, match.index ?? 0);
    const ancestorHeadings = [...precedingHtml.matchAll(/<h([2-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
    const nearestAncestor = ancestorHeadings.at(-1);
    const ancestorText = nearestAncestor ? visibleText(nearestAncestor[2]) : "";
    if (/(?:pin definitions?|mechanical|wiring|installation|payload|command|console|configuration)/i.test(ancestorText)) continue;
    const sectionHtml = match[3];
    const imageUrl = selectImage(sectionHtml, pageUrl);
    if (!imageUrl) continue;
    pages.push({ url: pageUrl.split("?")[0], title: headingText.slice(0, 500), text: `${headingText} ${visibleText(sectionHtml)}`.slice(0, 2_000), imageUrl });
  }
  return pages;
}
function familyName(sku: string) { const clean = normal(sku); const parts = clean.split("-").filter(Boolean); if (parts.length > 1 && /^(?:SDI|MR)$/.test(parts[0]) && /^\d|XX$/.test(parts[1])) return `${parts[0]}-${parts[1]}`; return parts[0] || clean; }
function commercialBase(sku: string) { const parts = normal(sku).split("-"); return commercialSuffixes.has(parts.at(-1) ?? "") ? parts.slice(0, -1).join("-") : ""; }
function visualVariantKey(sku: string) { return normal(sku).split("-").filter((part) => part && !commercialSuffixes.has(part)).map((part) => visuallyEquivalentModelTokens.get(part) ?? part).join("-"); }
function officialModelAliases(sku: string) {
  const parts = normal(sku).split("-").filter((part) => part && !commercialSuffixes.has(part));
  const exact = parts.join("-");
  const equivalent = parts.map((part) => visuallyEquivalentModelTokens.get(part) ?? part).join("-");
  const aliases = new Set([exact, equivalent]);
  const sw3lOptionBase = equivalent.match(/^(SW3L-(?:LB|LS|NB|NS|CB|CS|KS|KN))-\d{3}$/)?.[1];
  if (sw3lOptionBase) aliases.add(sw3lOptionBase);
  if (/^PS-(?:LB|LS|NB|NS|CB|CS|KS|KN)-.*(?:TXX|IXX|FXX)/.test(equivalent)) aliases.add(equivalent.split("-").slice(0, 2).join("-"));
  return [...aliases].filter((value) => value.includes("-")).sort((a, b) => b.length - a.length);
}
function protocolPageFits(page: OfficialPage, product: Product) {
  const interfaceName = normal(product.iotInterface);
  if (/\/CAT-1\//i.test(page.url)) return /CAT\s*-?\s*1/.test(interfaceName);
  if (/\/NB-IoT\//i.test(page.url)) return /NB-IOT|LTE-M/.test(interfaceName);
  if (/\/LoRaWAN-End-Node\//i.test(page.url)) return interfaceName.includes("LORAWAN");
  return true;
}
function sameUrl(a: string, b: string) { try { return decodeURIComponent(new URL(a).pathname).toLowerCase() === decodeURIComponent(new URL(b).pathname).toLowerCase(); } catch { return false; } }
function canonicalAssetPath(imageUrl: string) { try { return decodeURIComponent(new URL(imageUrl).pathname).toLowerCase(); } catch { return imageUrl; } }
function canonicalPagePath(pageUrl: string) { try { return decodeURIComponent(new URL(pageUrl).pathname).replace(/\/$/, "").toLowerCase(); } catch { return pageUrl; } }
function modelTitle(title: string) { return title.split(/\s(?:–|—|--)\s|\|/)[0]; }
function isProductHeroPage(page: OfficialPage) { return /Dragino Documentation Center$/i.test(page.title) || /\/products\/[^?#]+\/item\//i.test(page.url); }
function extensionFor(url: string, contentType: string | null) { const ext = extname(new URL(url).pathname).toLowerCase(); if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return ext === ".jpeg" ? ".jpg" : ext; if (contentType?.includes("png")) return ".png"; if (contentType?.includes("webp")) return ".webp"; return ".jpg"; }
function imageIdentifiesSku(imageUrl: string | null, sku: string) { if (!imageUrl) return false; try { const filename = decodeURIComponent(new URL(imageUrl).pathname.split("/").at(-1) ?? "").replace(/_/g, "-"); return hasToken(filename, sku); } catch { return false; } }
async function fetchOfficial(url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": userAgent }, signal: AbortSignal.timeout(35_000), redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!officialHosts.has(new URL(response.url).hostname.toLowerCase())) throw new Error("redirected outside official domain");
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolvePromise) => setTimeout(resolvePromise, 750 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("official request failed");
}
async function mapConcurrent<T, R>(items: T[], limit: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> { const results = new Array<R>(items.length); let cursor = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (true) { const index = cursor++; if (index >= items.length) break; results[index] = await task(items[index], index); } })); return results; }

async function main() {
  const catalogue = JSON.parse(await readFile(cataloguePath, "utf8")) as Catalogue;
  const products = catalogue.products;
  const pageUrls = new Set<string>();
  const brokenWorkbookUrls = new Set<string>();

  for (const product of products) if (product.productUrl.trim()) { const url = officialUrl(product.productUrl.trim(), "https://www.dragino.com/"); if (url) pageUrls.add(url.split("?")[0]); }

  const listingUrls = ["https://www.dragino.com/products/products-list.html", "https://www.dragino.com/products/products-list.html?start=100", "https://www.dragino.com/products/products-list.html?start=200"];
  for (const url of listingUrls) { const response = await fetchOfficial(url); for (const link of itemLinks(await response.text(), response.url)) pageUrls.add(link); }

  const documentationIndexes = ["https://wiki.dragino.com/docs/LoRaWAN-End-Node/", "https://wiki.dragino.com/docs/NB-IoT/", "https://wiki.dragino.com/docs/CAT-1/product-list/"];
  for (const url of documentationIndexes) { const response = await fetchOfficial(url); for (const link of documentationLinks(await response.text(), response.url)) pageUrls.add(link); }
  for (const sitemapUrl of ["https://wiki.dragino.com/sitemap.xml", "https://docs.dragino.com/sitemap.xml"]) {
    try { const response = await fetchOfficial(sitemapUrl); for (const link of documentationSitemapLinks(await response.text(), response.url)) pageUrls.add(link); }
    catch (error) { console.warn(`Official documentation sitemap unavailable (${sitemapUrl}): ${error instanceof Error ? error.message : "unknown error"}`); }
  }

  const familyGroups = Map.groupBy(products, (product) => familyName(product.sku));
  const searchTerms = new Set<string>();
  for (const [family, members] of familyGroups) { if (family.length >= 3) searchTerms.add(family); const unmatchedRepresentative = members.find((product) => !product.productUrl.trim()) ?? members[0]; if (unmatchedRepresentative) searchTerms.add(normal(unmatchedRepresentative.sku)); }
  const terms = [...searchTerms];
  const searchResults = await mapConcurrent(terms, 6, async (term) => {
    try { const url = `https://www.dragino.com/index.php?option=com_search&searchword=${encodeURIComponent(term)}&searchphrase=all`; const response = await fetchOfficial(url); return itemLinks(await response.text(), response.url); } catch { return []; }
  });
  for (const links of searchResults) for (const link of links) pageUrls.add(link);

  const urls = [...pageUrls].sort();
  console.log(`Official candidate pages discovered: ${urls.length}`);
  let checked = 0;
  const pageResults = await mapConcurrent(urls, 8, async (url) => {
    try { const response = await fetchOfficial(url); const html = await response.text(); const page = { url: response.url.split("?")[0], title: titleFromHtml(html), text: visibleText(html), imageUrl: selectImage(html, response.url) } satisfies OfficialPage; return [page, ...tableModelPages(html, response.url), ...sectionModelPages(html, response.url)]; }
    catch { if (products.some((product) => product.productUrl && sameUrl(product.productUrl, url))) brokenWorkbookUrls.add(url); return null; }
    finally { checked += 1; if (checked % 50 === 0 || checked === urls.length) console.log(`Inspected ${checked}/${urls.length} official pages`); }
  });
  const pages = pageResults.flatMap((result) => result ?? []);
  const sharedFamilyPages = new Map<string, { page: OfficialPage; sourceCount: number }>();
  for (const [family] of familyGroups) {
    if (family.length < 3) continue;
    const familyHeroPages = pages.filter((page) => page.imageUrl && isProductHeroPage(page) && hasToken(modelTitle(page.title), family));
    const assetGroups = Map.groupBy(familyHeroPages, (page) => canonicalAssetPath(page.imageUrl!));
    const repeatedAssets = [...assetGroups.values()].map((assetPages) => ({
      pages: assetPages,
      distinctSources: new Set(assetPages.map((page) => canonicalPagePath(page.url))).size
    })).filter((group) => group.distinctSources >= 2).sort((a, b) => b.distinctSources - a.distinctSources);
    const repeated = repeatedAssets[0];
    const preferredPage = repeated?.pages.find((page) => new URL(page.url).hostname === "docs.dragino.com") ?? repeated?.pages[0];
    if (preferredPage) sharedFamilyPages.set(family, { page: preferredPage, sourceCount: repeated.distinctSources });
  }

  const downloadCache = new Map<string, Promise<{ path: string; size: number }>>();
  await mkdir(sharedRoot, { recursive: true });
  async function localize(imageUrl: string) {
    let pending = downloadCache.get(imageUrl);
    if (!pending) { pending = (async () => { const response = await fetchOfficial(imageUrl); const contentType = response.headers.get("content-type"); if (!contentType?.startsWith("image/")) throw new Error("official asset is not an image"); const bytes = Buffer.from(await response.arrayBuffer()); const metadata = await sharp(bytes).metadata(); const width = metadata.width ?? 0; const height = metadata.height ?? 0; if (Math.min(width, height) < 180 || width * height < 90_000) throw new Error(`official asset is below the product-image quality threshold (${width}x${height})`); const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16); const ext = extensionFor(imageUrl, contentType); const file = `${hash}${ext}`; await writeFile(join(sharedRoot, file), bytes); return { path: `/images/products/_official/${file}`, size: bytes.length }; })(); downloadCache.set(imageUrl, pending); }
    return pending;
  }

  const manifest: ImageRecord[] = [];
  const auditProducts: AuditProduct[] = [];
  const recoveredBroken = new Set<string>();

  for (const product of products) {
    const sku = normal(product.sku); const family = familyName(sku); const workbookUrl = product.productUrl.trim();
    const exactPages = pages.filter((page) => page.imageUrl && hasToken(page.text, sku) && (hasToken(page.title, sku) || imageIdentifiesSku(page.imageUrl, sku)));
    exactPages.sort((a, b) => Number(workbookUrl && sameUrl(b.url, workbookUrl)) - Number(workbookUrl && sameUrl(a.url, workbookUrl)) || Number(/\/products\/[^?#]+\/item\//i.test(b.url)) - Number(/\/products\/[^?#]+\/item\//i.test(a.url)) || Number(hasToken(b.title, sku)) - Number(hasToken(a.title, sku)));
    let chosen = exactPages[0] ?? null; let confidence: Confidence = chosen ? "EXACT" : "NO_MATCH"; let method = chosen ? (workbookUrl && sameUrl(chosen.url, workbookUrl) ? "workbook-url+exact-sku" : "official-index-search+exact-sku") : ""; let notes = chosen ? "Official page text explicitly identifies the exact catalogue SKU." : "";

    if (!chosen && workbookUrl) {
      const linkedPage = pages.find((page) => sameUrl(page.url, workbookUrl) && page.imageUrl);
      if (linkedPage && hasToken(linkedPage.title || linkedPage.text, family)) { chosen = linkedPage; confidence = "FAMILY_CONFIRMED"; method = "workbook-url+official-family-page"; notes = `The workbook links this SKU to an official Dragino page whose title identifies the ${family} family.`; }
    }

    if (!chosen) {
      const visualKey = visualVariantKey(sku);
      const linkedSibling = products.find((candidate) => candidate.sku !== product.sku && candidate.productUrl.trim() && visualVariantKey(candidate.sku) === visualKey);
      const siblingPage = linkedSibling && pages.find((page) => page.imageUrl && sameUrl(page.url, linkedSibling.productUrl));
      if (linkedSibling && siblingPage && hasToken(siblingPage.title || siblingPage.text, family)) { chosen = siblingPage; confidence = "FAMILY_CONFIRMED"; method = "catalogue-sibling+same-visual-variant"; notes = `Catalogue SKU ${linkedSibling.sku.trim()} has the same normalized visual variant key (${visualKey}) and links directly to this official Dragino family page.`; }
    }

    if (!chosen) {
      const aliases = officialModelAliases(sku);
      const documentedPage = pages.find((page) => page.imageUrl && protocolPageFits(page, product) && aliases.some((alias) => titleIdentifiesModel(page.title, alias)));
      if (documentedPage) { const documentedAlias = aliases.find((alias) => titleIdentifiesModel(documentedPage.title, alias)) ?? family; chosen = documentedPage; confidence = "FAMILY_CONFIRMED"; method = "official-title+normalized-model-variant"; notes = `The official Dragino page title identifies normalized model ${documentedAlias}, either directly or in an explicit grouped-model title; only commercial-plan, documented second-generation, and explicit product-option suffixes were normalized.`; }
      else {
        const bodyDocumentedPage = pages.find((page) => page.imageUrl && protocolPageFits(page, product) && hasToken(page.title, family) && aliases.some((alias) => hasToken(page.text, alias)));
        if (bodyDocumentedPage) { const documentedAlias = aliases.find((alias) => hasToken(bodyDocumentedPage.text, alias)) ?? family; chosen = bodyDocumentedPage; confidence = "FAMILY_CONFIRMED"; method = "official-body+normalized-model-variant"; notes = `The main content of the official Dragino family page explicitly identifies normalized model ${documentedAlias}, and the documentation section matches the catalogue interface.`; }
      }
    }

    const base = commercialBase(sku);
    if (!chosen && base && workbookUrl) {
      const linkedPage = pages.find((page) => sameUrl(page.url, workbookUrl) && page.imageUrl && hasToken(page.text, base));
      if (linkedPage) { chosen = linkedPage; confidence = "FAMILY_CONFIRMED"; method = "workbook-url+commercial-variant-base"; notes = `The official workbook link identifies the family page and that page explicitly identifies base model ${base}; the authoritative SKU remains unchanged.`; }
    }

    if (!chosen && base) {
      const basePage = pages.find((page) => page.imageUrl && hasToken(page.title, base));
      const linkedSibling = basePage && products.find((candidate) => candidate.productUrl && commercialBase(candidate.sku) === base && sameUrl(candidate.productUrl, basePage.url));
      if (basePage && linkedSibling) { chosen = basePage; confidence = "FAMILY_CONFIRMED"; method = "official-title+catalogue-linked-commercial-family"; notes = `The official page title identifies base model ${base}, and another authoritative catalogue member of the same commercial family links to that page.`; }
    }

    if (!chosen) {
      const sharedFamily = sharedFamilyPages.get(family);
      if (sharedFamily) {
        chosen = sharedFamily.page;
        confidence = "FAMILY_CONFIRMED";
        method = "official-repeated-shared-family-image";
        notes = `Dragino publishes this identical ${family} hero image on ${sharedFamily.sourceCount} distinct official model pages, establishing it as shared family imagery.`;
      }
    }

    const reviewedGalleryImage = reviewedGalleryOverrides.get(sku);
    if (chosen && reviewedGalleryImage) {
      chosen = { ...chosen, imageUrl: reviewedGalleryImage };
      confidence = imageIdentifiesSku(reviewedGalleryImage, sku) ? "EXACT" : "FAMILY_CONFIRMED";
      method = "reviewed-official-gallery+exact-visual-variant";
      notes = "The full official Dragino gallery contains an image whose filename identifies this exact visual variant; commercial-plan and documented second-generation suffixes share that physical image only where the catalogue variant is visually equivalent.";
    }

    if (chosen?.imageUrl && (confidence === "EXACT" || confidence === "FAMILY_CONFIRMED")) {
      try { const localized = await localize(chosen.imageUrl); manifest.push({ sku: product.sku, slug: product.slug, localPath: localized.path, sourcePage: chosen.url, originalImageUrl: chosen.imageUrl, sourceDomain: new URL(chosen.url).hostname, matchConfidence: confidence, matchMethod: method, productFamily: family, licenceClassification: "MANUFACTURER_OWNED", licenceName: "Manufacturer-owned image", licenceUrl: "", attributionRequired: false, attributionText: "", retrievedAt: new Date().toISOString(), notes: "Official manufacturer image retained after product-match review. No broader commercial reuse permission has been established." }); auditProducts.push({ sku: product.sku, status: "MAPPED", confidence, officialSourcePage: chosen.url, originalImageUrl: chosen.imageUrl, localImage: localized.path, matchMethod: method, family, notes }); if (workbookUrl && [...brokenWorkbookUrls].some((url) => sameUrl(url, workbookUrl)) && !sameUrl(chosen.url, workbookUrl)) recoveredBroken.add(product.sku); continue; }
      catch (error) { notes = `Official mapping found but image download failed: ${error instanceof Error ? error.message : "unknown error"}`; }
    }

    const sharedFallback = sharedFamilyPages.get(family);
    if (chosen?.imageUrl && sharedFallback?.page.imageUrl && !sameUrl(chosen.imageUrl, sharedFallback.page.imageUrl)) {
      try {
        const localized = await localize(sharedFallback.page.imageUrl);
        const fallbackNotes = `The closer official variant image failed the quality gate. Dragino publishes this identical ${family} hero image on ${sharedFallback.sourceCount} distinct official model pages, so the higher-quality shared family image is used instead.`;
        manifest.push({ sku: product.sku, slug: product.slug, localPath: localized.path, sourcePage: sharedFallback.page.url, originalImageUrl: sharedFallback.page.imageUrl, sourceDomain: new URL(sharedFallback.page.url).hostname, matchConfidence: "FAMILY_CONFIRMED", matchMethod: "official-repeated-shared-family-image-quality-fallback", productFamily: family, licenceClassification: "MANUFACTURER_OWNED", licenceName: "Manufacturer-owned image", licenceUrl: "", attributionRequired: false, attributionText: "", retrievedAt: new Date().toISOString(), notes: "Official manufacturer image retained after product-match review. No broader commercial reuse permission has been established." });
        auditProducts.push({ sku: product.sku, status: "MAPPED", confidence: "FAMILY_CONFIRMED", officialSourcePage: sharedFallback.page.url, originalImageUrl: sharedFallback.page.imageUrl, localImage: localized.path, matchMethod: "official-repeated-shared-family-image-quality-fallback", family, notes: fallbackNotes });
        if (workbookUrl && [...brokenWorkbookUrls].some((url) => sameUrl(url, workbookUrl)) && !sameUrl(sharedFallback.page.url, workbookUrl)) recoveredBroken.add(product.sku);
        continue;
      } catch (error) {
        notes = `${notes} Shared family fallback also failed: ${error instanceof Error ? error.message : "unknown error"}`;
      }
    }

    const ambiguousPage = pages.find((page) => page.imageUrl && family.length >= 3 && hasToken(page.title, family));
    if (ambiguousPage) auditProducts.push({ sku: product.sku, status: "PLACEHOLDER", confidence: "AMBIGUOUS", officialSourcePage: ambiguousPage.url, originalImageUrl: ambiguousPage.imageUrl ?? "", localImage: "", matchMethod: "family-name-candidate-rejected", family, notes: notes || "An official family candidate exists, but the source does not establish that its image accurately represents this catalogue variant." });
    else auditProducts.push({ sku: product.sku, status: "PLACEHOLDER", confidence: "NO_MATCH", officialSourcePage: "", originalImageUrl: "", localImage: "", matchMethod: "no-reliable-official-match", family, notes: notes || "No reliable official Dragino image could be established after product-list, family, and official-site searches." });
  }

  manifest.sort((a, b) => a.sku.localeCompare(b.sku, "en-ZA"));
  const referencedPaths = new Set(manifest.map((record) => record.localPath));
  for (const entry of await readdir(sharedRoot)) if (!referencedPaths.has(`/images/products/_official/${entry}`)) await rm(join(sharedRoot, entry), { force: true });
  // Licensed and shared assets are managed by separate provenance-aware passes.

  let totalSize = 0; for (const path of referencedPaths) totalSize += (await stat(join(root, "public", path.replace(/^\//, "")))).size;
  const exact = auditProducts.filter((item) => item.confidence === "EXACT").length;
  const familyConfirmed = auditProducts.filter((item) => item.confidence === "FAMILY_CONFIRMED").length;
  const ambiguous = auditProducts.filter((item) => item.confidence === "AMBIGUOUS").length;
  const noMatch = auditProducts.filter((item) => item.confidence === "NO_MATCH").length;
  const sharedGroups = [...Map.groupBy(manifest, (item) => item.localPath).values()].filter((items) => items.length > 1);
  const summary = { totalProducts: products.length, exactImageMatches: exact, familyConfirmedImageMatches: familyConfirmed, totalProductsWithOfficialImages: exact + familyConfirmed, placeholdersRemaining: ambiguous + noMatch, ambiguousMatchesRejected: ambiguous, noMatchFound: noMatch, brokenOfficialUrlsRecovered: recoveredBroken.size, sharedFamilyImages: sharedGroups.reduce((sum, items) => sum + items.length, 0), sharedImageGroups: sharedGroups.length, distinctLocalImageFiles: referencedPaths.size, totalImageAssetSizeBytes: totalSize, totalImageAssetSizeMiB: Number((totalSize / 1024 / 1024).toFixed(2)), imageCoveragePercentage: Number((((exact + familyConfirmed) / products.length) * 100).toFixed(2)), officialCandidatePagesInspected: pages.length, officialSearchTerms: terms.length, sourceDomains: [...new Set(manifest.map((item) => item.sourceDomain))].sort() };

  await writeFile(manifestPath, `${JSON.stringify({ images: manifest }, null, 2)}\n`, "utf8");
  await writeFile(pageIndexPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), pages: pages.map(({ url, title, imageUrl }) => ({ url, title, imageUrl })) }, null, 2)}\n`, "utf8");
  await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), policy: "Only EXACT and FAMILY_CONFIRMED mappings from official Dragino-controlled pages are published.", summary, products: auditProducts }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

await main();
