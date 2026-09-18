import type { Metadata } from "next";
import Link from "next/link";
import { FacetIndex } from "@/components/facet-page";
import { publicProducts } from "@/lib/catalogue";
import { getConnectivityGuidance, indexableInterfaceFacets } from "@/lib/discovery";
export const metadata: Metadata = { title: "Products by IoT Interface", description: "Browse products by LoRaWAN and LTE CAT 1 connectivity options.", alternates: { canonical: "/connectivity" } };
export default function ConnectivityPage() {
  const lorawan = indexableInterfaceFacets.find((facet) => facet.value === "LoRaWAN");
  const lteCat1 = indexableInterfaceFacets.find((facet) => facet.value === "LTE CAT 1");
  const lorawanGuidance = getConnectivityGuidance("LoRaWAN");
  const lteCat1Guidance = getConnectivityGuidance("LTE CAT 1");

  return <>
    <FacetIndex title="Browse by IoT interface" description="Explore connected hardware by connectivity type." basePath="/connectivity" facets={indexableInterfaceFacets} products={publicProducts} kind="iotInterface" />
    {lorawan && lteCat1 ? <section className="section section-tint"><div className="shell"><div className="section-heading"><h2>What is the difference between LoRaWAN and LTE CAT 1 devices?</h2><p>LoRaWAN devices use a suitable LoRaWAN gateway and public, private or community network. LTE CAT 1 devices use 4G LTE cellular connectivity and depend on supported mobile-operator service. Neither label alone confirms coverage or fitness for a project.</p></div><div className="criteria-grid"><article><h3>LoRaWAN network model</h3><p>{lorawanGuidance.definition} This catalogue currently lists <Link href={`/connectivity/${lorawan.slug}`}>{lorawan.count} LoRaWAN products</Link>.</p></article><article><h3>LTE CAT 1 network model</h3><p>{lteCat1Guidance.definition} This catalogue currently lists <Link href={`/connectivity/${lteCat1.slug}`}>{lteCat1.count} LTE CAT 1 products</Link>.</p></article><article><h3>Infrastructure to confirm</h3><p>For LoRaWAN, confirm a suitable network and regional configuration. For LTE CAT 1, confirm operator availability and supported device features at the deployment location.</p></article><article><h3>Practical selection</h3><p>Start with the network that can be supported at the project location. Then compare the exact application, specification and connectivity stated for each SKU. Do not assume that one technology is universally better.</p></article></div><p className="source-note">Technical references: <a href={lorawanGuidance.sourceUrl} target="_blank" rel="noreferrer">{lorawanGuidance.sourceLabel}</a> and <a href={lteCat1Guidance.sourceUrl} target="_blank" rel="noreferrer">{lteCat1Guidance.sourceLabel}</a>.</p></div></section> : null}
  </>;
}
