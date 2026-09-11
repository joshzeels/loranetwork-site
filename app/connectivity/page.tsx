import type { Metadata } from "next";
import { FacetIndex } from "@/components/facet-page";
import { publicProducts } from "@/lib/catalogue";
import { indexableInterfaceFacets } from "@/lib/discovery";
export const metadata: Metadata = { title: "Products by IoT Interface", description: "Browse products by IoT interface labels supplied in the authoritative catalogue.", alternates: { canonical: "/connectivity" } };
export default function ConnectivityPage() { return <FacetIndex eyebrow="Connectivity" title="Browse by IoT interface." description="These substantial connectivity groups reproduce the source labels exactly. No additional compatibility is implied." basePath="/connectivity" facets={indexableInterfaceFacets} products={publicProducts} kind="iotInterface" />; }
