import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

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
const publicRoot = join(root, "public", "products");
const sharedRoot = join(publicRoot, "_official");
const userAgent = "LoRaNetworkSA-OfficialImageReconciliation/2.0";
const officialHosts = new Set(["dragino.com", "www.dragino.com"]);
const commercialSuffixes = new Set(["GE", "1T"]);

function decodeHtml(value: string) { return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;|&#160;/gi, " "); }
function normal(value: string) { return decodeHtml(value).replace(/[‐‑‒–—−]/g, "-").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toUpperCase(); }
function tokenPattern(value: string) { return new RegExp(`(^|[^A-Z0-9])${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Z0-9]|$)`, "i"); }
function hasToken(text: string, value: string) { return tokenPattern(normal(value)).test(normal(text)); }
function visibleText(html: string) { return decodeHtml(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")); }
function titleFromHtml(html: string) { const og = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]; const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]; return decodeHtml((og ?? title ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
function officialUrl(candidate: string, base: string) { try { const url = new URL(decodeHtml(candidate), base); if (!officialHosts.has(url.hostname.toLowerCase())) return null; url.protocol = "https:"; url.hash = ""; return url.toString(); } catch { return null; } }
function itemLinks(html: string, base: string) { const links = new Set<string>(); for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) { const url = officialUrl(match[1], base); if (url && /\/products\/[^?#]+\/item\/[^?#]+\.html(?:\?|$)/i.test(url)) links.add(url.split("?")[0]); } return [...links]; }
function selectImage(html: string, pageUrl: string) {
  const candidates: string[] = [];
  for (const match of html.matchAll(/<(?:img|a)\b[^>]*?(?:src|href)=["']([^"']+)["'][^>]*>/gi)) candidates.push(match[1]);
  const avoid = /(?:diagram|dimension|install|wiring|application|network|topology|packing|package|logo|banner|screenshot|interface)/i;
  const gallery = candidates.map((value) => officialUrl(value, pageUrl)).filter((value): value is string => Boolean(value && /\/media\/k2\/galleries\/[^?#]+\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(value)));
  const clean = gallery.find((value) => !avoid.test(new URL(value).pathname));
  if (clean) return clean;
  if (gallery[0]) return gallery[0];
  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:image|image)["'][^>]*content=["']([^"']+)["'][^>]*>/gi)) { const value = officialUrl(match[1], pageUrl); if (value && /\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(value)) return value; }
  return null;
}
function familyName(sku: string) { const clean = normal(sku); const parts = clean.split("-").filter(Boolean); if (parts.length > 1 && /^(?:SDI|MR)$/.test(parts[0]) && /^\d|XX$/.test(parts[1])) return `${parts[0]}-${parts[1]}`; return parts[0] || clean; }
function commercialBase(sku: string) { const parts = normal(sku).split("-"); return commercialSuffixes.has(parts.at(-1) ?? "") ? parts.slice(0, -1).join("-") : ""; }
function sameUrl(a: string, b: string) { try { return decodeURIComponent(new URL(a).pathname).toLowerCase() === decodeURIComponent(new URL(b).pathname).toLowerCase(); } catch { return false; } }
function extensionFor(url: string, contentType: string | null) { const ext = extname(new URL(url).pathname).toLowerCase(); if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return ext === ".jpeg" ? ".jpg" : ext; if (contentType?.includes("png")) return ".png"; if (contentType?.includes("webp")) return ".webp"; return ".jpg"; }
function imageIdentifiesSku(imageUrl: string | null, sku: string) { if (!imageUrl) return false; try { const filename = decodeURIComponent(new URL(imageUrl).pathname.split("/").at(-1) ?? "").replace(/_/g, "-"); return hasToken(filename, sku); } catch { return false; } }
async function fetchOfficial(url: string) { const response = await fetch(url, { headers: { "user-agent": userAgent }, signal: AbortSignal.timeout(35_000), redirect: "follow" }); if (!response.ok) throw new Error(`HTTP ${response.status}`); if (!officialHosts.has(new URL(response.url).hostname.toLowerCase())) throw new Error("redirected outside official domain"); return response; }
async function mapConcurrent<T, R>(items: T[], limit: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> { const results = new Array<R>(items.length); let cursor = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (true) { const index = cursor++; if (index >= items.length) break; results[index] = await task(items[index], index); } })); return results; }

async function main() {
  const catalogue = JSON.parse(await readFile(cataloguePath, "utf8")) as Catalogue;
  const products = catalogue.products;
  const pageUrls = new Set<string>();
  const brokenWorkbookUrls = new Set<string>();

  for (const product of products) if (product.productUrl.trim()) { const url = officialUrl(product.productUrl.trim(), "https://www.dragino.com/"); if (url) pageUrls.add(url.split("?")[0]); }

  const listingUrls = ["https://www.dragino.com/products/products-list.html", "https://www.dragino.com/products/products-list.html?start=100", "https://www.dragino.com/products/products-list.html?start=200"];
  for (const url of listingUrls) { const response = await fetchOfficial(url); for (const link of itemLinks(await response.text(), response.url)) pageUrls.add(link); }

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
    try { const response = await fetchOfficial(url); const html = await response.text(); return { url: response.url.split("?")[0], title: titleFromHtml(html), text: visibleText(html), imageUrl: selectImage(html, response.url) } satisfies OfficialPage; }
    catch { if (products.some((product) => product.productUrl && sameUrl(product.productUrl, url))) brokenWorkbookUrls.add(url); return null; }
    finally { checked += 1; if (checked % 50 === 0 || checked === urls.length) console.log(`Inspected ${checked}/${urls.length} official pages`); }
  });
  const pages = pageResults.filter((page): page is OfficialPage => page !== null);

  const downloadCache = new Map<string, Promise<{ path: string; size: number }>>();
  await mkdir(sharedRoot, { recursive: true });
  async function localize(imageUrl: string) {
    let pending = downloadCache.get(imageUrl);
    if (!pending) { pending = (async () => { const response = await fetchOfficial(imageUrl); const contentType = response.headers.get("content-type"); if (!contentType?.startsWith("image/")) throw new Error("official asset is not an image"); const bytes = Buffer.from(await response.arrayBuffer()); const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16); const ext = extensionFor(imageUrl, contentType); const file = `${hash}${ext}`; await writeFile(join(sharedRoot, file), bytes); return { path: `/products/_official/${file}`, size: bytes.length }; })(); downloadCache.set(imageUrl, pending); }
    return pending;
  }

  const manifest: ImageRecord[] = [];
  const auditProducts: AuditProduct[] = [];
  const recoveredBroken = new Set<string>();

  for (const product of products) {
    const sku = normal(product.sku); const family = familyName(sku); const workbookUrl = product.productUrl.trim();
    const exactPages = pages.filter((page) => page.imageUrl && hasToken(page.text, sku) && (hasToken(page.title, sku) || imageIdentifiesSku(page.imageUrl, sku)));
    exactPages.sort((a, b) => Number(workbookUrl && sameUrl(b.url, workbookUrl)) - Number(workbookUrl && sameUrl(a.url, workbookUrl)) || Number(hasToken(b.title, sku)) - Number(hasToken(a.title, sku)));
    let chosen = exactPages[0] ?? null; let confidence: Confidence = chosen ? "EXACT" : "NO_MATCH"; let method = chosen ? (workbookUrl && sameUrl(chosen.url, workbookUrl) ? "workbook-url+exact-sku" : "official-index-search+exact-sku") : ""; let notes = chosen ? "Official page text explicitly identifies the exact catalogue SKU." : "";

    if (!chosen && workbookUrl) {
      const linkedPage = pages.find((page) => sameUrl(page.url, workbookUrl) && page.imageUrl);
      if (linkedPage && hasToken(linkedPage.title || linkedPage.text, family)) { chosen = linkedPage; confidence = "FAMILY_CONFIRMED"; method = "workbook-url+official-family-page"; notes = `The workbook links this SKU to an official Dragino page whose title identifies the ${family} family.`; }
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

    if (chosen?.imageUrl && (confidence === "EXACT" || confidence === "FAMILY_CONFIRMED")) {
      try { const localized = await localize(chosen.imageUrl); manifest.push({ sku: product.sku, slug: product.slug, localPath: localized.path, sourcePage: chosen.url, originalImageUrl: chosen.imageUrl, sourceDomain: new URL(chosen.url).hostname, matchConfidence: confidence, matchMethod: method, productFamily: family, licenceClassification: "MANUFACTURER_OWNED", licenceName: "Manufacturer-owned image", licenceUrl: "", attributionRequired: false, attributionText: "", retrievedAt: new Date().toISOString(), notes: "Official manufacturer image retained after product-match review. No broader commercial reuse permission has been established." }); auditProducts.push({ sku: product.sku, status: "MAPPED", confidence, officialSourcePage: chosen.url, originalImageUrl: chosen.imageUrl, localImage: localized.path, matchMethod: method, family, notes }); if (workbookUrl && [...brokenWorkbookUrls].some((url) => sameUrl(url, workbookUrl)) && !sameUrl(chosen.url, workbookUrl)) recoveredBroken.add(product.sku); continue; }
      catch (error) { notes = `Official mapping found but image download failed: ${error instanceof Error ? error.message : "unknown error"}`; }
    }

    const ambiguousPage = pages.find((page) => page.imageUrl && family.length >= 3 && hasToken(page.title, family));
    if (ambiguousPage) auditProducts.push({ sku: product.sku, status: "PLACEHOLDER", confidence: "AMBIGUOUS", officialSourcePage: ambiguousPage.url, originalImageUrl: ambiguousPage.imageUrl ?? "", localImage: "", matchMethod: "family-name-candidate-rejected", family, notes: notes || "An official family candidate exists, but the source does not establish that its image accurately represents this catalogue variant." });
    else auditProducts.push({ sku: product.sku, status: "PLACEHOLDER", confidence: "NO_MATCH", officialSourcePage: "", originalImageUrl: "", localImage: "", matchMethod: "no-reliable-official-match", family, notes: notes || "No reliable official Dragino image could be established after product-list, family, and official-site searches." });
  }

  manifest.sort((a, b) => a.sku.localeCompare(b.sku, "en-ZA"));
  const referencedPaths = new Set(manifest.map((record) => record.localPath));
  for (const entry of await readdir(sharedRoot)) if (!referencedPaths.has(`/products/_official/${entry}`)) await rm(join(sharedRoot, entry), { force: true });
  // Licensed and shared assets are managed by separate provenance-aware passes.

  let totalSize = 0; for (const path of referencedPaths) totalSize += (await stat(join(root, "public", path.replace(/^\//, "")))).size;
  const exact = auditProducts.filter((item) => item.confidence === "EXACT").length;
  const familyConfirmed = auditProducts.filter((item) => item.confidence === "FAMILY_CONFIRMED").length;
  const ambiguous = auditProducts.filter((item) => item.confidence === "AMBIGUOUS").length;
  const noMatch = auditProducts.filter((item) => item.confidence === "NO_MATCH").length;
  const sharedGroups = [...Map.groupBy(manifest, (item) => item.localPath).values()].filter((items) => items.length > 1);
  const summary = { totalProducts: products.length, exactImageMatches: exact, familyConfirmedImageMatches: familyConfirmed, totalProductsWithOfficialImages: exact + familyConfirmed, placeholdersRemaining: ambiguous + noMatch, ambiguousMatchesRejected: ambiguous, noMatchFound: noMatch, brokenOfficialUrlsRecovered: recoveredBroken.size, sharedFamilyImages: sharedGroups.reduce((sum, items) => sum + items.length, 0), sharedImageGroups: sharedGroups.length, distinctLocalImageFiles: referencedPaths.size, totalImageAssetSizeBytes: totalSize, totalImageAssetSizeMiB: Number((totalSize / 1024 / 1024).toFixed(2)), imageCoveragePercentage: Number((((exact + familyConfirmed) / products.length) * 100).toFixed(2)), officialCandidatePagesInspected: pages.length, officialSearchTerms: terms.length, sourceDomains: ["www.dragino.com"] };

  await writeFile(manifestPath, `${JSON.stringify({ images: manifest }, null, 2)}\n`, "utf8");
  await writeFile(pageIndexPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), pages: pages.map(({ url, title, imageUrl }) => ({ url, title, imageUrl })) }, null, 2)}\n`, "utf8");
  await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), policy: "Only EXACT and FAMILY_CONFIRMED mappings from official Dragino-controlled pages are published.", summary, products: auditProducts }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

await main();
