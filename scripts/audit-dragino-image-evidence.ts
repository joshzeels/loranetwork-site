import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

type Product = { sku: string; slug: string; productUrl: string; iotInterface: string };
type ImageRecord = { sku: string; localPath: string; sourcePage: string; originalImageUrl: string; matchConfidence: string; matchMethod: string; productFamily: string };
type AuditRecord = { sku: string; status: string; confidence: string; officialSourcePage: string };
type PageCandidate = { url: string; title: string; text: string; images: ImageCandidate[]; pdfs: string[] };
type ImageCandidate = { url: string; context: string; classification: "PRODUCT_CANDIDATE" | "TECHNICAL_OR_CHROME"; reasons: string[] };

const root = process.cwd();
const catalogue = JSON.parse(await readFile(join(root, "data", "dragino-products.json"), "utf8")) as { products: Product[] };
const manifest = JSON.parse(await readFile(join(root, "data", "product-images.json"), "utf8")) as { images: ImageRecord[] };
const currentAudit = JSON.parse(await readFile(join(root, "reports", "product-image-audit.json"), "utf8")) as { products: AuditRecord[] };
const pageIndex = JSON.parse(await readFile(join(root, "data", "dragino-official-page-index.json"), "utf8")) as { pages: Array<{ url: string }> };
const reportPath = join(root, "reports", "dragino-image-evidence-audit.json");
const officialHosts = new Set(["dragino.com", "www.dragino.com", "wiki.dragino.com", "www.wiki.dragino.com", "docs.dragino.com", "www.docs.dragino.com"]);
const userAgent = "LoRaNetworkSA-ExhaustiveImageEvidenceAudit/1.0";
const commercialSuffixes = new Set(["GE", "1T"]);
const visuallyEquivalentModelTokens = new Map([["LB2", "LB"], ["NB2", "NB"], ["CB2", "CB"], ["FB2", "FB"]]);

function decodeHtml(value: string) { return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;|&#160;/gi, " "); }
function normal(value: string) { return decodeHtml(value).replace(/[‐‑‒–—−]/g, "-").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toUpperCase(); }
function tokenPattern(value: string) { return new RegExp(`(^|[^A-Z0-9])${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Z0-9]|$)`, "i"); }
function hasToken(text: string, value: string) { return Boolean(value) && tokenPattern(normal(value)).test(normal(text)); }
function familyName(sku: string) { const clean = normal(sku); const parts = clean.split("-").filter(Boolean); if (parts.length > 1 && /^(?:SDI|MR)$/.test(parts[0]) && /^\d|XX$/.test(parts[1])) return `${parts[0]}-${parts[1]}`; return parts[0] || clean; }
function commercialBase(sku: string) { const parts = normal(sku).split("-"); return commercialSuffixes.has(parts.at(-1) ?? "") ? parts.slice(0, -1).join("-") : normal(sku); }
function aliases(sku: string) {
  const parts = normal(sku).split("-").filter((part) => part && !commercialSuffixes.has(part));
  const exact = parts.join("-");
  const equivalent = parts.map((part) => visuallyEquivalentModelTokens.get(part) ?? part).join("-");
  const values = new Set([normal(sku), exact, equivalent, commercialBase(sku)]);
  const sw3l = equivalent.match(/^(SW3L-(?:LB|LS|NB|NS|CB|CS|KS|KN))-\d{3}$/)?.[1];
  if (sw3l) values.add(sw3l);
  return [...values].filter((value) => value.length >= 3).sort((a, b) => b.length - a.length);
}
function canonicalPath(url: string) { try { return decodeURIComponent(new URL(url).pathname).replace(/\/$/, "").toLowerCase(); } catch { return ""; } }
function canonicalAsset(url: string) { try { return decodeURIComponent(new URL(url).pathname).toLowerCase(); } catch { return ""; } }
function renditionStem(url: string) { return canonicalAsset(url).replace(/_(?:xs|s|m|l|xl)(?=\.(?:jpe?g|png|webp)$)/i, ""); }
function officialUrl(candidate: string, base: string) { try { const url = new URL(decodeHtml(candidate), base); if (!officialHosts.has(url.hostname.toLowerCase())) return null; url.protocol = "https:"; url.hash = ""; return url.toString(); } catch { return null; } }
function visibleText(html: string) { const content = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html; return decodeHtml(content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")); }
function titleFromHtml(html: string) { const og = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]; const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]; return decodeHtml((og ?? title ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
function classifyImage(url: string, context: string) {
  const value = `${decodeURIComponent(new URL(url).pathname)} ${decodeHtml(context)}`;
  const reasons = [];
  if (/(?:logo|favicon|icon|avatar|banner|social|loading|spinner|arrow|button|badge)/i.test(value)) reasons.push("site-chrome");
  if (/(?:diagram|dimension|mechanical|install|wiring|application|network|topology|packing|package|payload|frame|byte|command|console|pin.?map|jumper|circuit|chart|graph|screen.?shot|interface|register|firmware|flow.?chart|应用|安装实例)/i.test(value)) reasons.push("technical-content");
  if (/\.(?:svg|gif)(?:[?#]|$)/i.test(url)) reasons.push("non-product-format");
  if (/\/(?:template|theme|media\/system|plugins?|modules?)\//i.test(url)) reasons.push("site-asset");
  return { classification: reasons.length ? "TECHNICAL_OR_CHROME" as const : "PRODUCT_CANDIDATE" as const, reasons };
}
function imageCandidates(html: string, pageUrl: string) {
  const images = new Map<string, ImageCandidate>();
  for (const match of html.matchAll(/<(?:img|a)\b[^>]*?(?:src|href)=(?:"([^"]+)"|'([^']+)'|([^\s"'<>`]+))[^>]*>/gi)) {
    const raw = match[1] ?? match[2] ?? match[3];
    const url = raw && officialUrl(raw, pageUrl);
    if (!url || !/\.(?:jpe?g|png|webp|gif|svg)(?:[?#]|$)/i.test(url)) continue;
    const context = match[0].slice(0, 1_000);
    const classified = classifyImage(url, context);
    const key = canonicalAsset(url);
    const prior = images.get(key);
    if (!prior || (prior.classification === "TECHNICAL_OR_CHROME" && classified.classification === "PRODUCT_CANDIDATE")) images.set(key, { url, context, ...classified });
  }
  return [...images.values()];
}
function pdfLinks(html: string, pageUrl: string) { const links = new Set<string>(); for (const match of html.matchAll(/href=(?:"([^"]+\.pdf(?:\?[^"']*)?)"|'([^']+\.pdf(?:\?[^"']*)?)')/gi)) { const url = officialUrl(match[1] ?? match[2], pageUrl); if (url) links.add(url); } return [...links]; }
function scoreImage(image: ImageCandidate, product: Product) {
  if (image.classification !== "PRODUCT_CANDIDATE") return -1_000;
  const sku = normal(product.sku);
  const family = familyName(sku);
  const filename = normal(basename(canonicalAsset(image.url)).replace(/[_+.]/g, "-"));
  const context = normal(image.context);
  let score = 0;
  if (hasToken(filename, sku)) score += 160;
  else if (aliases(sku).some((alias) => hasToken(filename, alias))) score += 120;
  else if (hasToken(filename, family)) score += 35;
  if (hasToken(context, sku)) score += 100;
  else if (aliases(sku).some((alias) => hasToken(context, alias))) score += 70;
  else if (hasToken(context, family)) score += 20;
  if (/_(?:XL|L)\.(?:JPE?G|PNG|WEBP)$/i.test(image.url)) score += 10;
  if (/_(?:XS|S)\.(?:JPE?G|PNG|WEBP)$/i.test(image.url)) score -= 20;
  return score;
}
function reviewedGroupedVariantEvidence(product: Product, mapping: ImageRecord, sourceHasCurrentImage: boolean) {
  if (!sourceHasCurrentImage) return false;
  const sku = normal(product.sku);
  const sourcePath = canonicalPath(mapping.sourcePage);
  if (familyName(sku) === "PS" && /PS-(?:LB|LS|NB|NS|CB|CS|KS|KN)2?-/.test(sku) && /\/flow-pressure-weight-sensors\/ps-(?:lb-ps-ls|nb|cb|ks|kn)$/.test(sourcePath)) return true;
  if (/^SW3L-(?:004|006|010|020)$/.test(sku) && sourcePath.endsWith("/item/222-sw3l.html")) return true;
  if (sku === "BLG-AN-040 OR BLG-AN-040-R" && sourcePath.endsWith("/item/162-blg-an-040.html") && /BLG-AN-040/i.test(mapping.originalImageUrl)) return true;
  return false;
}
async function fetchOfficial(url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": userAgent }, signal: AbortSignal.timeout(35_000), redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!officialHosts.has(new URL(response.url).hostname.toLowerCase())) throw new Error("redirected outside official domain");
      return response;
    } catch (error) { lastError = error; if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1))); }
  }
  throw lastError instanceof Error ? lastError : new Error("official request failed");
}
async function mapConcurrent<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> { const results = new Array<R>(items.length); let cursor = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (true) { const index = cursor++; if (index >= items.length) break; results[index] = await task(items[index]); } })); return results; }

const pageUrls = [...new Map(pageIndex.pages.map((page) => [canonicalPath(page.url), page.url])).values()].sort();
let checked = 0;
const fetchedPages = await mapConcurrent(pageUrls, 8, async (url): Promise<PageCandidate | null> => {
  try {
    const response = await fetchOfficial(url);
    const html = await response.text();
    return { url: response.url.split("?")[0], title: titleFromHtml(html), text: visibleText(html).slice(0, 250_000), images: imageCandidates(html, response.url), pdfs: pdfLinks(html, response.url) };
  } catch { return null; }
  finally { checked += 1; if (checked % 50 === 0 || checked === pageUrls.length) console.log(`Audited ${checked}/${pageUrls.length} official pages`); }
});
const pages = fetchedPages.filter((page): page is PageCandidate => Boolean(page));
const pagesByPath = new Map(pages.map((page) => [canonicalPath(page.url), page]));
const imagesBySku = new Map(manifest.images.map((image) => [normal(image.sku), image]));
const auditBySku = new Map(currentAudit.products.map((record) => [normal(record.sku), record]));

const productReviews = catalogue.products.map((product) => {
  const sku = normal(product.sku);
  const family = familyName(sku);
  const mapping = imagesBySku.get(sku);
  const prior = auditBySku.get(sku);
  if (!mapping) {
    const candidatePages = pages.filter((page) => aliases(sku).some((alias) => hasToken(page.title, alias)) || (hasToken(page.title, family) && aliases(sku).some((alias) => hasToken(page.text, alias))));
    const candidates = candidatePages.flatMap((page) => page.images.map((image) => ({ page: page.url, image: image.url, score: scoreImage(image, product), classification: image.classification }))).filter((candidate) => candidate.classification === "PRODUCT_CANDIDATE" && candidate.score >= 35).sort((a, b) => b.score - a.score).slice(0, 5);
    return { sku: product.sku, slug: product.slug, status: "PLACEHOLDER", priorConfidence: prior?.confidence ?? "NO_MATCH", family, workbookUrl: product.productUrl, candidateCount: candidates.length, candidates, decision: candidates.length ? "REVIEW_NEW_CANDIDATE" : "NO_RELIABLE_OFFICIAL_CANDIDATE" };
  }

  const sourcePage = pagesByPath.get(canonicalPath(mapping.sourcePage));
  const currentAsset = canonicalAsset(mapping.originalImageUrl);
  const currentCandidate = sourcePage?.images.find((image) => canonicalAsset(image.url) === currentAsset);
  const scored = (sourcePage?.images ?? []).map((image) => ({ image: image.url, score: scoreImage(image, product), classification: image.classification })).filter((candidate) => candidate.classification === "PRODUCT_CANDIDATE").sort((a, b) => b.score - a.score);
  const currentScore = currentCandidate ? scoreImage(currentCandidate, product) : -1;
  const betterAlternatives = scored.filter((candidate) => canonicalAsset(candidate.image) !== currentAsset && renditionStem(candidate.image) !== renditionStem(mapping.originalImageUrl) && candidate.score >= Math.max(35, currentScore + 25)).slice(0, 5);
  const sourceHasCurrentImage = Boolean(currentCandidate);
  const exactEvidence = Boolean(sourcePage && (hasToken(sourcePage.title, sku) || hasToken(sourcePage.text, sku) || hasToken(basename(currentAsset), sku)));
  const aliasEvidence = Boolean(sourcePage && aliases(sku).some((alias) => hasToken(sourcePage.title, alias) || hasToken(sourcePage.text, alias) || hasToken(basename(currentAsset), alias)));
  const directWorkbookSource = Boolean(product.productUrl && canonicalPath(product.productUrl) === canonicalPath(mapping.sourcePage));
  const repeatedFamilyMethod = mapping.matchMethod.startsWith("official-repeated-shared-family-image");
  const groupedVariantEvidence = reviewedGroupedVariantEvidence(product, mapping, sourceHasCurrentImage);
  const decision = !sourceHasCurrentImage ? "REVIEW_SOURCE_IMAGE_NOT_FOUND" : betterAlternatives.length ? "REVIEW_BETTER_GALLERY_CANDIDATE" : mapping.matchConfidence === "EXACT" && exactEvidence ? "EXACT_VERIFIED" : directWorkbookSource && aliasEvidence ? "WORKBOOK_SOURCE_VERIFIED" : repeatedFamilyMethod && sourcePage && hasToken(sourcePage.title, family) ? "OFFICIAL_SHARED_HERO_VERIFIED" : aliasEvidence ? "MODEL_EVIDENCE_VERIFIED" : groupedVariantEvidence ? "MANUALLY_VERIFIED_GROUPED_VARIANT" : "REVIEW_INSUFFICIENT_MODEL_EVIDENCE";
  return { sku: product.sku, slug: product.slug, status: "MAPPED", family, workbookUrl: product.productUrl, localPath: mapping.localPath, sourcePage: mapping.sourcePage, originalImageUrl: mapping.originalImageUrl, matchConfidence: mapping.matchConfidence, matchMethod: mapping.matchMethod, sourceHasCurrentImage, directWorkbookSource, exactEvidence, aliasEvidence, currentScore, betterAlternatives, decision };
});

const decisionCounts = Object.fromEntries([...Map.groupBy(productReviews, (review) => review.decision).entries()].map(([decision, records]) => [decision, records.length]));
const allPdfs = [...new Set(pages.flatMap((page) => page.pdfs))].sort();
const summary = {
  totalProducts: catalogue.products.length,
  mappedProducts: productReviews.filter((review) => review.status === "MAPPED").length,
  placeholders: productReviews.filter((review) => review.status === "PLACEHOLDER").length,
  officialPagesRequested: pageUrls.length,
  officialPagesFetched: pages.length,
  totalImageReferencesInspected: pages.reduce((sum, page) => sum + page.images.length, 0),
  distinctOfficialImageAssets: new Set(pages.flatMap((page) => page.images.map((image) => canonicalAsset(image.url)))).size,
  distinctPdfLinksDiscovered: allPdfs.length,
  decisions: decisionCounts
};

await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), policy: "Every catalogue row is reconciled against every image reference extracted from its official source page and all indexed official Dragino product/documentation pages. Technical images and site chrome remain recorded but are not eligible product candidates.", summary, pdfs: allPdfs, pages: pages.map((page) => ({ url: page.url, title: page.title, imageCount: page.images.length, productImageCount: page.images.filter((image) => image.classification === "PRODUCT_CANDIDATE").length, pdfCount: page.pdfs.length })), products: productReviews }, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
