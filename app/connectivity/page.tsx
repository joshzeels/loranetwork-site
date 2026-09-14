import type { Metadata } from "next";
import { FacetIndex } from "@/components/facet-page";
import { publicProducts } from "@/lib/catalogue";
import { indexableInterfaceFacets } from "@/lib/discovery";
export const metadata: Metadata = { title: "Products by IoT Interface", description: "Browse products by LoRaWAN, NB-IoT, LTE-M, LTE CAT 1 and other listed IoT interfaces.", alternates: { canonical: "/connectivity" } };
export default function ConnectivityPage() { return <FacetIndex title="Browse by IoT interface" description="Explore connected hardware by its listed IoT interface." basePath="/connectivity" facets={indexableInterfaceFacets} products={publicProducts} kind="iotInterface" />; }
