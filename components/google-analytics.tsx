"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { ANALYTICS_BROWSER_EVENT } from "@/lib/analytics/client";
import { createGa4PageViewTracker, forwardToGa4, initialiseGa4, isGa4MeasurementId, type Gtag } from "@/lib/analytics/ga4";
import type { AnalyticsEvent } from "@/lib/analytics/events";

declare global {
  interface Window { gtag?: Gtag }
}

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  const pathname = usePathname();
  const pageViewTracker = useRef(createGa4PageViewTracker());
  const enabled = isGa4MeasurementId(measurementId);

  useLayoutEffect(() => {
    if (!enabled || !measurementId) return;
    initialiseGa4(window, measurementId);
    const onAnalyticsEvent = (event: CustomEvent<AnalyticsEvent>) => forwardToGa4(event.detail, window.gtag);
    window.addEventListener(ANALYTICS_BROWSER_EVENT, onAnalyticsEvent);
    return () => window.removeEventListener(ANALYTICS_BROWSER_EVENT, onAnalyticsEvent);
  }, [enabled, measurementId]);

  useEffect(() => {
    if (!enabled || !measurementId) return;
    pageViewTracker.current(pathname, window.gtag, window.location.origin);
  }, [enabled, measurementId, pathname]);

  if (!enabled || !measurementId) return null;
  return <Script id="google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} strategy="afterInteractive" />;
}
