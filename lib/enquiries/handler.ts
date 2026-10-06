import type { DeliveryResult, Enquiry } from "./types.ts";
import { validateEnquiry } from "./validation.ts";

type Product = { sku: string; name: string; displayedPrice: string };
type HandlerDependencies = {
  siteUrl: string;
  findProduct: (sku: string) => Product | undefined;
  deliver: (enquiry: Enquiry, product: { name: string; displayedPrice: string } | null) => Promise<DeliveryResult>;
  verifyRecaptcha: (token: string, expectedHostname: string) => Promise<boolean>;
  now?: () => number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_REQUEST_BYTES = 32768;
const GENERIC_FAILURE = "The enquiry could not be sent. Please try again later.";

function json(body: object, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function createEnquiryHandler(dependencies: HandlerDependencies) {
  const windows = new Map<string, { count: number; resetAt: number }>();
  const configuredOrigin = new URL(dependencies.siteUrl).origin;
  const expectedHostname = new URL(configuredOrigin).hostname;
  const now = dependencies.now ?? Date.now;

  function limited(key: string) {
    const currentTime = now();
    const current = windows.get(key);
    if (!current || current.resetAt <= currentTime) {
      windows.set(key, { count: 1, resetAt: currentTime + WINDOW_MS });
      return false;
    }
    current.count += 1;
    return current.count > MAX_REQUESTS;
  }

  return async function handleEnquiry(request: Request) {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) return json({ ok: false, message: "The enquiry is too large." }, 413);

    const origin = request.headers.get("origin");
    const requestOrigin = new URL(request.url).origin;
    if (origin && origin !== requestOrigin && origin !== configuredOrigin) return json({ ok: false, message: "This enquiry origin is not allowed." }, 403);
    if (limited(clientKey(request))) return json({ ok: false, message: "Too many enquiries were submitted. Please try again later." }, 429);

    let payload: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid payload");
      payload = parsed as Record<string, unknown>;
    } catch {
      return json({ ok: false, message: "The enquiry could not be read." }, 400);
    }

    if (typeof payload.website === "string" && payload.website) return json({ ok: true, message: "Thank you." }, 200);

    const startedAt = typeof payload.startedAt === "number" ? payload.startedAt : Number(payload.startedAt);
    const elapsed = now() - startedAt;
    if (!Number.isFinite(startedAt) || elapsed < 2000 || elapsed > 86400000) return json({ ok: false, message: "Please reload the form and try again." }, 400);

    const validated = validateEnquiry(payload);
    if (!validated.ok) return json({ ok: false, message: "Please correct the highlighted fields.", errors: validated.errors }, 400);

    const product = validated.value.sku ? dependencies.findProduct(validated.value.sku) : undefined;
    if (validated.value.sku && !product) return json({ ok: false, message: "Select a valid catalogue SKU.", errors: { sku: "This SKU is not in the catalogue." } }, 400);

    const recaptchaToken = typeof payload.recaptchaToken === "string" ? payload.recaptchaToken : "";
    if (!await dependencies.verifyRecaptcha(recaptchaToken, expectedHostname)) return json({ ok: false, message: GENERIC_FAILURE }, 403);

    const enquiry = {
      ...validated.value,
      sku: product?.sku ?? "",
      pageUrl: request.headers.get("referer") ?? "",
      submittedAt: new Date(now()).toISOString(),
    };
    const delivery = await dependencies.deliver(enquiry, product ? { name: product.name, displayedPrice: product.displayedPrice } : null);
    if (!delivery.delivered) return json({ ok: false, message: "Enquiry delivery is currently unavailable. Your message was not sent." }, 503);
    return json({ ok: true, message: "Your enquiry was sent successfully." }, 200);
  };
}
