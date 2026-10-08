import type { AnalyticsEvent, AnalyticsEventName, AnalyticsEventProperties } from "./events";

export const ANALYTICS_BROWSER_EVENT = "loranetwork:analytics";

declare global {
  interface WindowEventMap {
    "loranetwork:analytics": CustomEvent<AnalyticsEvent>;
  }
}

// Future analytics adapters can subscribe to this browser event and forward only this typed,
// public event data to their provider. No provider, storage, network request or cookie is used here.
export function trackEvent<Name extends AnalyticsEventName>(name: Name, properties: AnalyticsEventProperties[Name]) {
  if (typeof window === "undefined") return;

  try {
    window.dispatchEvent(new CustomEvent<AnalyticsEvent>(ANALYTICS_BROWSER_EVENT, { detail: { name, properties } as AnalyticsEvent }));
  } catch {
    // Analytics must never interrupt a visitor action.
  }
}
