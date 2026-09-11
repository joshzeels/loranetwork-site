import type { MetadataRoute } from "next";
import { getSiteUrl, products } from "@/lib/catalogue";
import { buyingGuides, indexableApplicationFacets, indexableInterfaceFacets, productFamilies } from "@/lib/discovery";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const catalogueDate = new Date("2026-09-07T00:00:00+02:00");

  return [
    { url: siteUrl, lastModified: catalogueDate, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/products`, lastModified: catalogueDate, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/applications`, lastModified: catalogueDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/connectivity`, lastModified: catalogueDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/families`, lastModified: catalogueDate, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/guides`, lastModified: catalogueDate, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/contact`, lastModified: catalogueDate, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/about`, lastModified: catalogueDate, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/privacy`, lastModified: catalogueDate, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: catalogueDate, changeFrequency: "yearly", priority: 0.3 },
    ...indexableApplicationFacets.map((facet) => ({ url: `${siteUrl}/applications/${facet.slug}`, lastModified: catalogueDate, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...indexableInterfaceFacets.map((facet) => ({ url: `${siteUrl}/connectivity/${facet.slug}`, lastModified: catalogueDate, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...productFamilies.map((family) => ({ url: `${siteUrl}/families/${family.slug}`, lastModified: catalogueDate, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...buyingGuides.map((guide) => ({ url: `${siteUrl}/guides/${guide.slug}`, lastModified: catalogueDate, changeFrequency: "monthly" as const, priority: 0.75 })),
    ...products.map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
