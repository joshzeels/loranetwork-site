import type { AnalyticsEvent } from "./events";

export type Ga4Event = { name: string; parameters: Record<string, unknown> };
export type Gtag = (command: "config" | "event" | "js", target: string | Date, parameters?: Record<string, unknown>) => void;
export type Ga4PageViewTracker = (pathname: string | null | undefined, gtag: Gtag | undefined, origin?: string) => boolean;

type Ga4Window = Window & {
  dataLayer?: IArguments[];
  gtag?: Gtag;
  __loranetworkGa4MeasurementId?: string;
};

export function isGa4MeasurementId(value: string | undefined) {
  return /^G-[A-Z0-9]{10}$/.test(value?.trim() ?? "");
}

export function mapToGa4(event: AnalyticsEvent): Ga4Event {
  switch (event.name) {
    case "product_view": return { name: "view_item", parameters: { items: [{ item_id: event.properties.sku, item_name: event.properties.productName }], product_slug: event.properties.slug } };
    case "application_view": return { name: "application_view", parameters: { application_name: event.properties.applicationName, application_slug: event.properties.slug } };
    case "enquiry_open": return { name: "enquiry_open", parameters: { page_path: event.properties.sourcePathname, ...(event.properties.preselectedSku ? { preselected_sku: event.properties.preselectedSku } : {}) } };
    case "enquiry_product_selected": return { name: "select_item", parameters: { items: [{ item_id: event.properties.sku, item_name: event.properties.productName }], page_path: event.properties.sourcePathname } };
    case "enquiry_submit_success": return { name: "generate_lead", parameters: { product_sku: event.properties.sku, page_path: event.properties.sourcePathname } };
    case "enquiry_submit_failure": return { name: "enquiry_submit_failure", parameters: { reason: event.properties.reason, page_path: event.properties.sourcePathname } };
    case "comparison_open": return { name: "comparison_open", parameters: { product_count: event.properties.productCount } };
    case "comparison_product_added": return { name: "comparison_product_added", parameters: { product_sku: event.properties.sku, product_name: event.properties.productName, product_count: event.properties.productCount } };
    case "contact_email_click": return { name: "contact_email_click", parameters: { page_path: event.properties.pathname } };
    case "contact_phone_click": return { name: "contact_phone_click", parameters: { page_path: event.properties.pathname } };
  }
}

export function initialiseGa4(target: Ga4Window, measurementId: string) {
  if (!isGa4MeasurementId(measurementId) || target.__loranetworkGa4MeasurementId === measurementId) return false;

  target.dataLayer ??= [];
  target.gtag ??= function gtag() {
    // Google's loader reads the native Arguments object queued by its canonical snippet.
    // eslint-disable-next-line prefer-rest-params
    target.dataLayer?.push(arguments);
  } as Gtag;
  target.gtag("js", new Date());
  target.gtag("config", measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  target.__loranetworkGa4MeasurementId = measurementId;
  return true;
}

export function forwardToGa4(event: AnalyticsEvent, gtag: Gtag | undefined) {
  if (!gtag) return;
  try {
    const mapped = mapToGa4(event);
    gtag("event", mapped.name, mapped.parameters);
  } catch {
    // Provider failures must never interrupt a visitor action.
  }
}

export function createGa4PageViewTracker(): Ga4PageViewTracker {
  let lastPagePath: string | null = null;

  return (pathname, gtag, origin) => {
    const pagePath = pathname?.trim().split(/[?#]/, 1)[0];
    if (!gtag || !pagePath?.startsWith("/") || lastPagePath === pagePath) return false;

    try {
      const pageLocation = origin ? `${new URL(origin).origin}${pagePath}` : undefined;
      gtag("event", "page_view", { page_path: pagePath, ...(pageLocation ? { page_location: pageLocation } : {}) });
      lastPagePath = pagePath;
      return true;
    } catch {
      // Provider failures must never interrupt navigation.
      return false;
    }
  };
}
