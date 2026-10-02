import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FacetDetail } from "@/components/facet-detail";
import { getFacetBySlug, getPublicProductsByFacet } from "@/lib/catalogue";
import { indexableApplicationFacets } from "@/lib/discovery";
import { productApplicationLabel } from "@/lib/product-presentation";
export const dynamicParams = false;
export function generateStaticParams() { return indexableApplicationFacets.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: PageProps<"/applications/[slug]">): Promise<Metadata> { const { slug } = await params; const facet = getFacetBySlug("application", slug); const label = facet ? productApplicationLabel(facet.value) : ""; return facet ? { title: `${label} Products`, description: `Browse ${facet.count} products for ${label}.`, alternates: { canonical: `/applications/${slug}` } } : {}; }
export default async function ApplicationDetail({ params }: PageProps<"/applications/[slug]">) { const { slug } = await params; const facet = indexableApplicationFacets.find((item) => item.slug === slug) ?? getFacetBySlug("application", slug); if (!facet || !indexableApplicationFacets.some((item) => item.slug === facet.slug)) notFound(); return <FacetDetail facet={facet} products={getPublicProductsByFacet("application", facet.value)} basePath="/applications" label="Applications" kind="application" />; }
