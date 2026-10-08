"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { ANALYTICS_BROWSER_EVENT } from "@/lib/analytics/client";
import { forwardToGa4, initialiseGa4, isGa4MeasurementId, trackGa4PageView, type Gtag } from "@/lib/analytics/ga4";
import type { AnalyticsEvent } from "@/lib/analytics/events";

declare global {
  interface Window { gtag?: Gtag }
}

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  const pathname = usePathname();
  const lastPagePath = useRef<string | null>(null);
  const enabled = isGa4MeasurementId(measurementId);

  useLayoutEffect(() => {
    if (!enabled || !measurementId) return;
    initialiseGa4(window, measurementId);
    const onAnalyticsEvent = (event: CustomEvent<AnalyticsEvent>) => forwardToGa4(event.detail, window.gtag);
    window.addEventListener(ANALYTICS_BROWSER_EVENT, onAnalyticsEvent);
    return () => window.removeEventListener(ANALYTICS_BROWSER_EVENT, onAnalyticsEvent);
  }, [enabled, measurementId]);

  useEffect(() => {
    if (!enabled || !measurementId || !pathname || lastPagePath.current === pathname) return;
    lastPagePath.current = pathname;
    trackGa4PageView(pathname, window.gtag);
  }, [enabled, measurementId, pathname]);

  if (!enabled || !measurementId) return null;
  return <Script id="google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} strategy="afterInteractive" />;
}
