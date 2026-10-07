import type { DeliveryResult, Enquiry } from "./types.ts";

type MauticDeliveryOptions = {
  baseUrl?: string;
  formId?: string;
  formName?: string;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
};

export function createMauticDelivery(options: MauticDeliveryOptions) {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const timeoutMs = options.timeoutMs ?? 9000;

  return async function deliverToMautic(enquiry: Enquiry): Promise<DeliveryResult> {
    const baseUrl = options.baseUrl?.trim();
    const formId = options.formId?.trim();
    const formName = options.formName?.trim();
    if (!baseUrl || !formId || !formName) return { delivered: false, reason: "not-configured" };

    let endpoint: URL;
    try {
      endpoint = new URL("/form/submit", baseUrl);
      if (endpoint.protocol !== "https:" && endpoint.protocol !== "http:") return { delivered: false, reason: "not-configured" };
      endpoint.searchParams.set("formId", formId);
    } catch {
      return { delivered: false, reason: "not-configured" };
    }

    const body = new URLSearchParams({
      "mauticform[first_name]": enquiry.firstName,
      "mauticform[last_name]": enquiry.lastName,
      "mauticform[email]": enquiry.email,
      "mauticform[phone]": enquiry.phone,
      "mauticform[product__sku]": enquiry.productSku,
      "mauticform[f_message]": enquiry.message,
      "mauticform[formId]": formId,
      "mauticform[formName]": formName,
      "mauticform[return]": "",
    });

    try {
      const response = await fetchImplementation(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) return { delivered: false, reason: "provider-error" };
      if (response.url) {
        const responseUrl = new URL(response.url);
        if (responseUrl.searchParams.has("mauticError")) return { delivered: false, reason: "provider-error" };
      }
      return { delivered: true };
    } catch {
      return { delivered: false, reason: "provider-error" };
    }
  };
}
