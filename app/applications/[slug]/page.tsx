import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FacetDetail } from "@/components/facet-detail";
import { ApplicationViewTracker } from "@/components/analytics-trackers";
import { getFacetBySlug, getPublicProductsByFacet, getSiteUrl } from "@/lib/catalogue";
import { indexableApplicationFacets } from "@/lib/discovery";
import { productApplicationLabel } from "@/lib/product-presentation";
import { buildRouteMetadata } from "@/lib/route-metadata";
export const dynamicParams = false;
export function generateStaticParams() { return indexableApplicationFacets.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: PageProps<"/applications/[slug]">): Promise<Metadata> { const { slug } = await params; const facet = getFacetBySlug("application", slug); const label = facet ? productApplicationLabel(facet.value) : ""; return facet ? buildRouteMetadata(getSiteUrl(), `/applications/${facet.slug}`, `${label} Products`, `Browse ${facet.count} products for ${label}.`) : {}; }
export default async function ApplicationDetail({ params }: PageProps<"/applications/[slug]">) { const { slug } = await params; const facet = indexableApplicationFacets.find((item) => item.slug === slug) ?? getFacetBySlug("application", slug); if (!facet || !indexableApplicationFacets.some((item) => item.slug === facet.slug)) notFound(); return <><ApplicationViewTracker applicationName={productApplicationLabel(facet.value)} slug={facet.slug} /><FacetDetail facet={facet} products={getPublicProductsByFacet("application", facet.value)} basePath="/applications" label="Applications" kind="application" /></>; }
