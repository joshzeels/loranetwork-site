import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { ProductComparison } from "@/components/product-comparison";
import { StructuredData } from "@/components/structured-data";
import { getSiteUrl, products as catalogueProducts, type CatalogueFacet } from "@/lib/catalogue";
import { buyingGuides, getConnectivityGuidance, getGuideProducts, getIndexableApplicationsForProducts, getIndexableInterfacesForProducts } from "@/lib/discovery";
import { productDisplayName, type PublicDraginoProduct } from "@/lib/product-presentation";

export function FacetDetail({ facet, products, basePath, label, kind }: { facet: CatalogueFacet; products: PublicDraginoProduct[]; basePath: string; label: string; kind: "application" | "iotInterface" }) {
  const siteUrl = getSiteUrl();
  const skuSet = new Set(products.map((product) => product.sku));
  const sourceProducts = catalogueProducts.filter((product) => skuSet.has(product.sku));
  const applications = kind === "iotInterface" ? getIndexableApplicationsForProducts(sourceProducts) : [];
  const interfaces = kind === "application" ? getIndexableInterfacesForProducts(sourceProducts) : [];
  const guides = buyingGuides.filter((guide) => getGuideProducts(guide).some((product) => skuSet.has(product.sku)));
  const connectivityGuidance = kind === "iotInterface" ? getConnectivityGuidance(facet.value) : undefined;
  const question = kind === "application" ? `Which products are listed for ${facet.value}?` : `Which products use ${facet.value}?`;
  const answer = kind === "application" ? `LoRa Network lists ${facet.count} products for ${facet.value}.` : `LoRa Network lists ${facet.count} products with ${facet.value}.`;
  return <>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: `${facet.value} products`, url: `${siteUrl}${basePath}/${facet.slug}`, mainEntity: { "@type": "ItemList", numberOfItems: products.length, itemListElement: products.slice(0, 50).map((product, index) => ({ "@type": "ListItem", position: index + 1, name: productDisplayName(product.sku), url: `${siteUrl}/products/${product.slug}` })) } }} />
    <section className="page-hero"><div className="shell"><nav className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href={basePath}>{label}</Link><span>/</span><span>{facet.value}</span></nav><div className="facet-detail-heading"><div><h1>{facet.value}</h1></div><p>{facet.count} {facet.count === 1 ? "product" : "products"} available to explore.</p></div></div></section>
    <section className="section shell answer-section"><div><h2>{question}</h2><p className="lead-copy">{answer} Compare SKUs, specifications, connectivity and public ZAR prices below.</p></div><aside className="evidence-note"><strong>What should buyers compare?</strong><p>Review the application, specification, IoT interface, package information and price for each model.</p></aside></section>
    {connectivityGuidance ? <section className="section shell"><div className="section-heading"><h2>What is {facet.value}?</h2></div><div className="criteria-grid"><article><h3>Definition</h3><p>{connectivityGuidance.definition}</p></article><article><h3>Deployment fit</h3><p>{connectivityGuidance.deploymentFit}</p></article><article><h3>Relevant advantage</h3><p>{connectivityGuidance.advantage}</p></article><article><h3>Limitation to check</h3><p>{connectivityGuidance.limitation}</p></article></div><p className="source-note">Technical reference: <a href={connectivityGuidance.sourceUrl} target="_blank" rel="noreferrer">{connectivityGuidance.sourceLabel}</a>.</p></section> : null}
    <section className="section section-tint"><div className="shell"><div className="section-heading split-heading"><div><h2>Compare products</h2></div><p>Review up to {Math.min(sourceProducts.length, 12)} models side by side.</p></div><ProductComparison products={sourceProducts.slice(0, 12)} caption={`${facet.value} product comparison.`} /></div></section>
    {(applications.length || interfaces.length || guides.length) ? <section className="section shell"><div className="section-heading"><h2>Continue your product research.</h2></div><div className="link-cluster">{applications.map((item) => <Link href={`/applications/${item.slug}`} key={`a-${item.slug}`}>{item.value}</Link>)}{interfaces.map((item) => <Link href={`/connectivity/${item.slug}`} key={`i-${item.slug}`}>{item.value}</Link>)}{guides.map((guide) => <Link href={`/guides/${guide.slug}`} key={`g-${guide.slug}`}>{guide.title}</Link>)}</div></section> : null}
    <section className="section shell"><div className="product-grid">{products.map((product) => <ProductCard key={product.slug} product={product} />)}</div><div className="back-row"><Link href={basePath} className="text-link back-link"><ArrowIcon /> All {label.toLocaleLowerCase("en-ZA")}</Link></div></section>
  </>;
}
