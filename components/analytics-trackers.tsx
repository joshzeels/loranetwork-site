"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";

function useTrackOnce(track: () => void) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    track();
  }, [track]);
}

export function ProductViewTracker({ sku, productName, slug }: { sku: string; productName: string; slug: string }) {
  useTrackOnce(() => trackEvent("product_view", { sku, productName, slug }));
  return null;
}

export function ApplicationViewTracker({ applicationName, slug }: { applicationName: string; slug: string }) {
  useTrackOnce(() => trackEvent("application_view", { applicationName, slug }));
  return null;
}

export function ComparisonTracker({ products }: { products: { sku: string; productName: string }[] }) {
  useTrackOnce(() => {
    trackEvent("comparison_open", { productCount: products.length });
    products.forEach((product) => trackEvent("comparison_product_added", { ...product, productCount: products.length }));
  });
  return null;
}

export function TrackedContactLink({ href, kind, children }: { href: string; kind: "email" | "phone"; children: React.ReactNode }) {
  return <a href={href} onClick={() => trackEvent(kind === "email" ? "contact_email_click" : "contact_phone_click", { pathname: window.location.pathname })}>{children}</a>;
}
