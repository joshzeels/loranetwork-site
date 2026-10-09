import type { Metadata } from "next";

// Dynamic route pages use this shared builder so their canonical and social URLs
// always come from the configured site origin rather than a deployment hostname.
export function buildRouteMetadata(siteUrl: string, pathname: string, title: string, description: string): Metadata {
  const canonicalUrl = new URL(pathname, siteUrl).toString();
  const socialTitle = `${title} | LoRa Network`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      title: socialTitle,
      description,
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
    },
  };
}
