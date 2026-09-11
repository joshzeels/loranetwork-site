import type { Metadata } from "next";
import { FacetIndex } from "@/components/facet-page";
import { publicProducts } from "@/lib/catalogue";
import { indexableApplicationFacets } from "@/lib/discovery";
export const metadata: Metadata = { title: "IoT Products by Application", description: "Browse products by application labels supplied in the authoritative catalogue.", alternates: { canonical: "/applications" } };
export default function ApplicationsPage() { return <FacetIndex eyebrow="Applications" title="Browse by application." description="These substantial application groups are derived directly from the supplied catalogue. Thin and duplicate groups are not promoted as landing pages." basePath="/applications" facets={indexableApplicationFacets} products={publicProducts} kind="application" />; }
