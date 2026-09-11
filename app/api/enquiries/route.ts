import { products } from "@/lib/catalogue";
import { deliverEnquiry } from "@/lib/enquiries/delivery";
import { validateEnquiry } from "@/lib/enquiries/validation";
import { getPublicPrice } from "@/lib/pricing";
import { BUSINESS_CONFIG } from "@/config/business";

export const runtime = "nodejs";
const windows = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

function clientKey(request: Request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"; }
function limited(key: string) { const now = Date.now(); const current = windows.get(key); if (!current || current.resetAt <= now) { windows.set(key, { count: 1, resetAt: now + WINDOW_MS }); return false; } current.count += 1; return current.count > MAX_REQUESTS; }
function json(body: object, status: number) { return Response.json(body, { status, headers: { "Cache-Control": "no-store" } }); }

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 32768) return json({ ok: false, message: "The enquiry is too large." }, 413);
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin && origin !== BUSINESS_CONFIG.site.url) return json({ ok: false, message: "This enquiry origin is not allowed." }, 403);
  if (limited(clientKey(request))) return json({ ok: false, message: "Too many enquiries were submitted. Please try again later." }, 429);
  let payload: Record<string, unknown>;
  try { const parsed: unknown = await request.json(); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid payload"); payload = parsed as Record<string, unknown>; } catch { return json({ ok: false, message: "The enquiry could not be read." }, 400); }
  if (typeof payload.website === "string" && payload.website) return json({ ok: true, message: "Thank you." }, 200);
  const startedAt = typeof payload.startedAt === "number" ? payload.startedAt : Number(payload.startedAt);
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || elapsed < 2000 || elapsed > 86400000) return json({ ok: false, message: "Please reload the form and try again." }, 400);
  const validated = validateEnquiry(payload);
  if (!validated.ok) return json({ ok: false, message: "Please correct the highlighted fields.", errors: validated.errors }, 400);
  const product = validated.value.sku ? products.find((item) => item.sku.toLocaleLowerCase("en-ZA") === validated.value.sku.toLocaleLowerCase("en-ZA")) : undefined;
  if (validated.value.sku && !product) return json({ ok: false, message: "Select a valid catalogue SKU.", errors: { sku: "This SKU is not in the catalogue." } }, 400);
  const referrer = request.headers.get("referer") ?? "";
  const enquiry = { ...validated.value, sku: product?.sku ?? "", pageUrl: referrer, submittedAt: new Date().toISOString() };
  const delivery = await deliverEnquiry(enquiry, product ? { name: product.sku, displayedPrice: getPublicPrice(product.priceUsd).formatted } : null);
  if (!delivery.delivered) {
    const developmentDetail = process.env.NODE_ENV === "development" && delivery.reason === "not-configured" ? " Enquiry delivery is not configured; set the documented private email environment variables." : "";
    return json({ ok: false, message: `Enquiry delivery is currently unavailable. Your message was not sent.${developmentDetail}` }, 503);
  }
  return json({ ok: true, message: "Your enquiry was sent successfully." }, 200);
}
