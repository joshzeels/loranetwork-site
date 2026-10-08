export const ANALYTICS_EVENT_NAMES = [
  "product_view",
  "application_view",
  "enquiry_open",
  "enquiry_product_selected",
  "enquiry_submit_success",
  "enquiry_submit_failure",
  "comparison_open",
  "comparison_product_added",
  "contact_email_click",
  "contact_phone_click",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type AnalyticsEventProperties = {
  product_view: { sku: string; productName: string; slug: string };
  application_view: { applicationName: string; slug: string };
  enquiry_open: { sourcePathname: string; preselectedSku?: string };
  enquiry_product_selected: { sku: string; productName: string; sourcePathname: string };
  enquiry_submit_success: { sku: string; sourcePathname: string };
  enquiry_submit_failure: { reason: "client_validation" | "server_validation" | "network" | "unknown"; sourcePathname: string };
  comparison_open: { productCount: number };
  comparison_product_added: { sku: string; productName: string; productCount: number };
  contact_email_click: { pathname: string };
  contact_phone_click: { pathname: string };
};

export type AnalyticsEvent = { [Name in AnalyticsEventName]: { name: Name; properties: AnalyticsEventProperties[Name] } }[AnalyticsEventName];
