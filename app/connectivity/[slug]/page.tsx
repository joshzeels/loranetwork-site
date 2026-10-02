import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FacetDetail } from "@/components/facet-detail";
import { getFacetBySlug, getPublicProductsByFacet } from "@/lib/catalogue";
import { indexableInterfaceFacets } from "@/lib/discovery";
import { productConnectivityLabel } from "@/lib/product-presentation";
export const dynamicParams = false;
export function generateStaticParams() { return indexableInterfaceFacets.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: PageProps<"/connectivity/[slug]">): Promise<Metadata> { const { slug } = await params; const facet = getFacetBySlug("iotInterface", slug); const label = facet ? productConnectivityLabel(facet.value) : ""; return facet ? { title: `${label} Products`, description: `Browse ${facet.count} products with ${label}.`, alternates: { canonical: `/connectivity/${slug}` } } : {}; }
export default async function ConnectivityDetail({ params }: PageProps<"/connectivity/[slug]">) { const { slug } = await params; const facet = indexableInterfaceFacets.find((item) => item.slug === slug) ?? getFacetBySlug("iotInterface", slug); if (!facet || !indexableInterfaceFacets.some((item) => item.slug === facet.slug)) notFound(); return <FacetDetail facet={facet} products={getPublicProductsByFacet("iotInterface", facet.value)} basePath="/connectivity" label="Connectivity" kind="iotInterface" />; }
