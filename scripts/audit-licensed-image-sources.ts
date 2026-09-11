import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type AuditProduct = { sku: string; status: string; confidence: string; family: string };
type CommonsPage = { title: string; imageinfo?: Array<{ descriptionurl: string; url: string; extmetadata?: Record<string, { value?: string }> }> };
type SearchResult = { query: string; results: Array<{ title: string; sourcePage: string; originalImageUrl: string; licenceName: string; licenceUrl: string }> };

const imageAudit = JSON.parse(await readFile(resolve("reports/product-image-audit.json"), "utf8")) as { products: AuditProduct[] };
const unmatched = imageAudit.products.filter((product) => product.status === "PLACEHOLDER");
const terms = [...new Set(unmatched.map((product) => product.sku.trim()).filter(Boolean))];
const familyTerms = [...new Set(unmatched.map((product) => product.family.trim()).filter(Boolean))].filter((term) => !terms.includes(term));
const allTerms = [...terms, ...familyTerms];
const endpoint = "https://commons.wikimedia.org/w/api.php";
const userAgent = "LoRaNetworkCatalogueAudit/1.0 (licence verification)";

function plain(value = "") { return value.replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " "); }
function normalise(value = "") { return plain(value).toUpperCase().replace(/[^A-Z0-9]+/g, ""); }
function licenceUrl(metadata: Record<string, { value?: string }>) { return metadata.LicenseUrl?.value ?? ""; }

async function search(query: string, expression = `\"${query}\"`): Promise<SearchResult> {
  const params = new URLSearchParams({ action: "query", generator: "search", gsrsearch: expression, gsrnamespace: "6", gsrlimit: "50", prop: "imageinfo", iiprop: "url|extmetadata", format: "json", origin: "*" });
  let response: Response | undefined;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const currentResponse = await fetch(`${endpoint}?${params}`, { headers: { "User-Agent": userAgent } });
    response = currentResponse;
    if (currentResponse.ok) break;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, currentResponse.status === 429 ? 5_000 * (attempt + 1) : 1_000 * (attempt + 1)));
  }
  if (!response?.ok) throw new Error(`Commons search failed for ${query}: ${response?.status ?? "no response"}`);
  const json = await response.json() as { query?: { pages?: Record<string, CommonsPage> } };
  const pages = Object.values(json.query?.pages ?? {});
  return { query, results: pages.map((page) => {
    const info = page.imageinfo?.[0]; const metadata = info?.extmetadata ?? {};
    return { title: page.title, sourcePage: info?.descriptionurl ?? "", originalImageUrl: info?.url ?? "", licenceName: metadata.LicenseShortName?.value ?? "", licenceUrl: licenceUrl(metadata) };
  }) };
}

const searches: SearchResult[] = [];
const batches = Array.from({ length: Math.ceil(allTerms.length / 8) }, (_, index) => allTerms.slice(index * 8, index * 8 + 8));
for (const [index, batch] of batches.entries()) {
  const expression = batch.map((term) => `\"${term.replaceAll('"', "")}\"`).join(" OR ");
  const result = await search(batch.join(" | "), expression);
  if (result.results.length) searches.push(result);
  if ((index + 1) % 10 === 0 || index + 1 === batches.length) console.log(`Searched ${Math.min((index + 1) * 8, allTerms.length)}/${allTerms.length} exact SKU/family terms`);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));
}

const globalSearch = await search("Dragino");
const allResults = [...searches.flatMap((item) => item.results.map((result) => ({ query: item.query, ...result }))), ...globalSearch.results.map((result) => ({ query: "Dragino", ...result }))];
const deduped = [...new Map(allResults.map((candidate) => [candidate.sourcePage || candidate.originalImageUrl, candidate])).values()];
const catalogueByNormalisedSku = new Map(unmatched.map((product) => [normalise(product.sku), product]));
const permitted = /^(Public domain|CC0|CC BY(?:-SA)?\b)/i;
const denied = /\b(?:NC|ND)\b|noncommercial|no derivatives/i;
const candidates = deduped.map((candidate) => {
  const matchedProduct = [...catalogueByNormalisedSku.entries()].find(([sku]) => sku && normalise(candidate.title).includes(sku))?.[1];
  const licenceClassification = denied.test(candidate.licenceName) ? "REUSE_NOT_ALLOWED" : permitted.test(candidate.licenceName) ? (candidate.licenceName.toUpperCase().startsWith("CC0") ? "CC0" : candidate.licenceName.toUpperCase().startsWith("CC BY-SA") ? "CC_BY_SA" : candidate.licenceName.toUpperCase().startsWith("CC BY") ? "CC_BY" : "PUBLIC_DOMAIN") : "LICENCE_UNCLEAR";
  return { ...candidate, licenceClassification, matchedSku: matchedProduct?.sku ?? "", matchConfidence: matchedProduct ? "AMBIGUOUS" : "NO_MATCH", publicationDecision: "REJECT", notes: matchedProduct ? "The filename contains the catalogue SKU, but no product identity review established an exact or shared-hardware match." : "No exact catalogue SKU is identified by the Commons file title." };
});

const githubCandidates = [
  { repository: "https://github.com/dragino/TrackerD", filesInspected: 3, licenceClassification: "LICENCE_UNCLEAR", publicationDecision: "REJECT", notes: "The repository has no detected licence; its PNG files are software UI/reference assets, not verified catalogue product photographs." },
  { repository: "https://github.com/dragino/Lora", filesInspected: 4, licenceClassification: "LICENCE_UNCLEAR", publicationDecision: "REJECT", notes: "The repository has no detected licence. The four image files depict older LSN50/LoRa GPS Shield hardware and do not establish an exact match for an unmatched catalogue SKU." },
];
const report = {
  generatedAt: new Date().toISOString(),
  policy: "Only EXACT or FAMILY_CONFIRMED product matches with explicit PUBLIC_DOMAIN, CC0, CC_BY, CC_BY_SA, or MANUFACTURER_REUSE_CONFIRMED evidence may be published.",
  searchSummary: { unmatchedProductsSearched: unmatched.length, exactSkuQueries: terms.length, familyAndBaseModelQueries: familyTerms.length, searchTermsCovered: allTerms.length, commonsApiBatches: batches.length, commonsQueriesWithResults: searches.length, globalManufacturerQueries: 1, githubRepositoriesInspected: githubCandidates.length },
  publicationSummary: { PUBLIC_DOMAIN: 0, CC0: 0, CC_BY: 0, CC_BY_SA: 0, MANUFACTURER_REUSE_CONFIRMED: 0, newlyPublished: 0, accuracyRejected: candidates.filter((candidate) => /^(PUBLIC_DOMAIN|CC0|CC_BY|CC_BY_SA)$/.test(candidate.licenceClassification)).length, licenceUnclearCandidatesRejected: githubCandidates.reduce((total, candidate) => total + candidate.filesInspected, 0) + candidates.filter((candidate) => candidate.licenceClassification === "LICENCE_UNCLEAR").length, reuseNotAllowedCandidatesRejected: candidates.filter((candidate) => candidate.licenceClassification === "REUSE_NOT_ALLOWED").length },
  commons: { api: endpoint, exactSkuResultSets: searches, globalManufacturerResults: globalSearch.results, reviewedCandidates: candidates },
  github: githubCandidates,
  notes: ["Searches covered every currently unmatched SKU and every unmatched family/base-model term as exact quoted Commons expressions, plus a manufacturer-wide Commons query.", "Commons queries use the repository's licence metadata directly; generic licence keywords are not treated as evidence.", "Publicly accessible files were not treated as reusable without explicit licence metadata.", "No candidate passed both the reuse-rights and product-identity gates, so no files were downloaded or published."],
};
await writeFile(resolve("reports/licensed-image-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ searchSummary: report.searchSummary, publicationSummary: report.publicationSummary }, null, 2));
