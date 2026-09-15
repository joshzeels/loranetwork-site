import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { displayValue, productDisplayName } from "../lib/product-presentation.ts";

const root = resolve(import.meta.dirname, "..");
for (const file of [".env", ".env.local"]) {
  const path = resolve(root, file);
  if (existsSync(path)) process.loadEnvFile(path);
}
const { BUSINESS_CONFIG } = await import("../config/business.ts");

type Check = { name: string; passed: boolean; detail: string };
const checks: Check[] = [];
const check = (name: string, passed: boolean, detail: string) => checks.push({ name, passed, detail });
const configured = (name: string) => Boolean(process.env[name]?.trim());

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
let validSiteUrl = false;
try {
  const parsed = new URL(siteUrl);
  validSiteUrl = parsed.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
} catch {}
check("Production site URL", validSiteUrl, validSiteUrl ? "Configured with a public HTTPS origin." : "Set NEXT_PUBLIC_SITE_URL to the final public HTTPS origin.");

const rate = BUSINESS_CONFIG.pricing.usdZarRate;
check("Approved USD/ZAR rate", Number.isFinite(rate) && rate > 0, "The central approved rate must be a positive number.");

const rateDateText = BUSINESS_CONFIG.commerce.pricingRateUpdatedAt ?? "";
const rateDate = /^\d{4}-\d{2}-\d{2}$/.test(rateDateText) ? new Date(`${rateDateText}T00:00:00Z`) : null;
const rateAgeDays = rateDate && Number.isFinite(rateDate.valueOf()) ? Math.floor((Date.now() - rateDate.valueOf()) / 86_400_000) : null;
check("Pricing rate date", rateAgeDays !== null && rateAgeDays >= 0 && rateAgeDays <= 14, rateAgeDays === null ? "Set PRICING_RATE_UPDATED_AT as YYYY-MM-DD." : `Configured rate is ${rateAgeDays} day(s) old; launch requires 14 days or less.`);

const vatMode = process.env.VAT_DISPLAY_MODE?.trim();
check("VAT treatment", vatMode === "none" || vatMode === "inclusive" || vatMode === "exclusive", "Set VAT_DISPLAY_MODE to none, inclusive or exclusive after confirming the business treatment. \"none\" is a valid final choice for a business that does not charge VAT, not only a placeholder.");

const deliveryVariables = ["CONTACT_RECIPIENT_EMAIL", "EMAIL_PROVIDER", "EMAIL_API_KEY", "EMAIL_FROM_ADDRESS"];
const deliveryReady = deliveryVariables.every(configured) && process.env.EMAIL_PROVIDER?.trim().toLowerCase() === "resend";
check("Enquiry delivery", deliveryReady, "Configure the documented Resend recipient, provider, API key and verified sender values.");

const publicContactReady = configured("BUSINESS_EMAIL") || configured("BUSINESS_PHONE");
check("Public contact route", publicContactReady, "Set at least BUSINESS_EMAIL or BUSINESS_PHONE so customers have a fallback contact route.");

check("Legal-content approval", process.env.LEGAL_CONTENT_APPROVED?.trim().toLowerCase() === "true", "Set LEGAL_CONTENT_APPROVED=true only after the privacy notice and website terms have been reviewed for the operating business.");

const catalogue = JSON.parse(await readFile(resolve(root, "data", "dragino-products.json"), "utf8")) as { products: Array<{ sku: string; application: string; iotInterface: string }> };
check("Catalogue integrity", catalogue.products.length === 981 && new Set(catalogue.products.map((product) => product.sku)).size === 981, `${catalogue.products.length} products; ${new Set(catalogue.products.map((product) => product.sku)).size} unique source SKUs.`);

const presentationIssues = catalogue.products.filter((product) => /Â|Ã|\bemperature\b|Radation|NB-loT/.test([productDisplayName(product.sku), displayValue(product.application), displayValue(product.iotInterface)].join(" ")));
check("Public catalogue presentation", presentationIssues.length === 0, presentationIssues.length === 0 ? "Confirmed source encoding and taxonomy artefacts are cleaned only at presentation time." : `${presentationIssues.length} public presentation values still require review.`);

const pricing = JSON.parse(await readFile(resolve(root, "reports", "pricing-reconciliation.json"), "utf8")) as Record<string, number>;
const pricingReady = pricing.totalProducts === 981 && pricing.pricingCalculationErrors === 0 && pricing.schemaVisiblePriceMismatches === 0 && pricing.usdPricesPubliclyExposed === 0 && pricing.euroPricesPubliclyExposed === 0 && pricing.pricingConfigurationPubliclyExposed === 0 && pricing.missingProducts === 0;
check("Pricing reconciliation", pricingReady, pricingReady ? "All price, privacy and schema checks pass." : "Run the production build and pricing reconciliation, then resolve its reported errors.");

const images = JSON.parse(await readFile(resolve(root, "reports", "dragino-image-evidence-audit.json"), "utf8")) as { summary: { mappedProducts: number; placeholders: number }; products: Array<{ decision: string }> };
const unresolvedImageReviews = images.products.filter((product) => product.decision.startsWith("REVIEW_")).length;
check("Product image evidence", images.summary.mappedProducts === 833 && images.summary.placeholders === 148 && unresolvedImageReviews === 0, `${images.summary.mappedProducts} verified mappings, ${images.summary.placeholders} deliberate no-image states, ${unresolvedImageReviews} unresolved reviews.`);

const imageQuality = JSON.parse(await readFile(resolve(root, "reports", "product-image-quality-audit.json"), "utf8")) as { summary: { distinctLocalImageFiles: number; belowThreshold: number } };
check("Product image quality", imageQuality.summary.distinctLocalImageFiles === 212 && imageQuality.summary.belowThreshold === 0, `${imageQuality.summary.distinctLocalImageFiles} distinct assets; ${imageQuality.summary.belowThreshold} below the quality threshold.`);

const blockers = checks.filter((item) => !item.passed);
const report = { generatedAt: new Date().toISOString(), ready: blockers.length === 0, checks, blockers: blockers.map((item) => item.name) };
await mkdir(resolve(root, "reports"), { recursive: true });
await writeFile(resolve(root, "reports", "launch-readiness.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

for (const item of checks) console.log(`${item.passed ? "PASS" : "BLOCK"}: ${item.name} — ${item.detail}`);
console.log(`LAUNCH READY: ${report.ready ? "YES" : "NO"}`);
if (!report.ready) process.exitCode = 1;
