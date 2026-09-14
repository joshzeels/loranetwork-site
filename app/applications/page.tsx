import type { Metadata } from "next";
import { FacetIndex } from "@/components/facet-page";
import { publicProducts } from "@/lib/catalogue";
import { indexableApplicationFacets } from "@/lib/discovery";
export const metadata: Metadata = { title: "IoT Products by Application", description: "Browse IoT products for monitoring, metering, agriculture, buildings and connected infrastructure.", alternates: { canonical: "/applications" } };
export default function ApplicationsPage() { return <FacetIndex title="Browse by application" description="Explore sensors, gateways and connected devices grouped by application." basePath="/applications" facets={indexableApplicationFacets} products={publicProducts} kind="application" />; }
