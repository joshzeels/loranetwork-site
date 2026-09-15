import type { Metadata } from "next";
import Link from "next/link";
import { FacetIndex } from "@/components/facet-page";
import { publicProducts } from "@/lib/catalogue";
import { getConnectivityGuidance, indexableInterfaceFacets } from "@/lib/discovery";
export const metadata: Metadata = { title: "Products by IoT Interface", description: "Browse products by LoRaWAN, NB-IoT, LTE-M, LTE CAT 1 and other IoT connectivity options.", alternates: { canonical: "/connectivity" } };
export default function ConnectivityPage() {
  const lorawan = indexableInterfaceFacets.find((facet) => facet.value === "LoRaWAN");
  const nbIot = indexableInterfaceFacets.find((facet) => facet.value === "NB-IoT");
  const lorawanGuidance = getConnectivityGuidance("LoRaWAN");
  const nbIotGuidance = getConnectivityGuidance("NB-IoT");

  return <>
    <FacetIndex title="Browse by IoT interface" description="Explore connected hardware by connectivity type." basePath="/connectivity" facets={indexableInterfaceFacets} products={publicProducts} kind="iotInterface" />
    {lorawan && nbIot ? <section className="section section-tint"><div className="shell"><div className="section-heading"><h2>What is the difference between LoRaWAN and NB-IoT devices?</h2><p>LoRaWAN devices use a suitable LoRaWAN gateway and public, private or community network. NB-IoT devices use a 3GPP cellular low-power wide-area technology in licensed spectrum and depend on supported mobile-operator service. Neither label alone confirms coverage or fitness for a project.</p></div><div className="criteria-grid"><article><h3>LoRaWAN network model</h3><p>{lorawanGuidance.definition} This catalogue currently lists <Link href={`/connectivity/${lorawan.slug}`}>{lorawan.count} LoRaWAN products</Link>.</p></article><article><h3>NB-IoT network model</h3><p>{nbIotGuidance.definition} This catalogue currently lists <Link href={`/connectivity/${nbIot.slug}`}>{nbIot.count} NB-IoT products</Link>.</p></article><article><h3>Infrastructure to confirm</h3><p>For LoRaWAN, confirm a suitable network and regional configuration. For NB-IoT, confirm operator availability and supported device features at the deployment location.</p></article><article><h3>Practical selection</h3><p>Start with the network that can be supported at the project location. Then compare the exact application, specification and connectivity stated for each SKU. Do not assume that one technology is universally better.</p></article></div><p className="source-note">Technical references: <a href={lorawanGuidance.sourceUrl} target="_blank" rel="noreferrer">{lorawanGuidance.sourceLabel}</a> and <a href={nbIotGuidance.sourceUrl} target="_blank" rel="noreferrer">{nbIotGuidance.sourceLabel}</a>.</p></div></section> : null}
  </>;
}
