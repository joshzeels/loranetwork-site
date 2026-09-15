import type { NextConfig } from "next";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
let productionUrlProblem = "";
try {
  const parsed = configuredSiteUrl ? new URL(configuredSiteUrl) : null;
  if (!parsed) productionUrlProblem = "NEXT_PUBLIC_SITE_URL is missing";
  else if (!/^https?:$/.test(parsed.protocol)) productionUrlProblem = "NEXT_PUBLIC_SITE_URL must use http or https";
  else if (/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(parsed.hostname)) productionUrlProblem = "NEXT_PUBLIC_SITE_URL points to a local hostname";
} catch {
  productionUrlProblem = "NEXT_PUBLIC_SITE_URL is not a valid absolute URL";
}

if (process.env.NODE_ENV === "production" && productionUrlProblem) {
  const message = `[production-url] ${productionUrlProblem}. Canonical URLs, Open Graph URLs, sitemap.xml, robots.txt and structured data will use the development fallback.`;
  if (process.env.CI === "true" || process.env.VERCEL) throw new Error(message);
  console.warn(`WARNING ${message}`);
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ] }];
  },
};

export default nextConfig;
