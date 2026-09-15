import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { ProductComparison } from "@/components/product-comparison";
import { StructuredData } from "@/components/structured-data";
import { getSiteUrl, products as catalogueProducts, type CatalogueFacet } from "@/lib/catalogue";
import { buyingGuides, getApplicationGuidance, getConnectivityGuidance, getFamilyProducts, getGuideProducts, getIndexableApplicationsForProducts, getIndexableInterfacesForProducts, productFamilies } from "@/lib/discovery";
import { productDisplayName, summariseFamilyOverlap, type PublicDraginoProduct } from "@/lib/product-presentation";

export function FacetDetail({ facet, products, basePath, label, kind }: { facet: CatalogueFacet; products: PublicDraginoProduct[]; basePath: string; label: string; kind: "application" | "iotInterface" }) {
  const siteUrl = getSiteUrl();
  const skuSet = new Set(products.map((product) => product.sku));
  const sourceProducts = catalogueProducts.filter((product) => skuSet.has(product.sku));
  const applications = kind === "iotInterface" ? getIndexableApplicationsForProducts(sourceProducts) : [];
  const interfaces = kind === "application" ? getIndexableInterfacesForProducts(sourceProducts) : [];
  const guides = buyingGuides.filter((guide) => getGuideProducts(guide).some((product) => skuSet.has(product.sku)));
  const families = productFamilies.filter((family) => getFamilyProducts(family).some((product) => skuSet.has(product.sku)));
  const applicationGuidance = kind === "application" ? getApplicationGuidance(facet.value) : undefined;
  const connectivityGuidance = kind === "iotInterface" ? getConnectivityGuidance(facet.value) : undefined;
  // Which verified product families actually fall inside this facet, and how much of each —
  // computed live from the current catalogue so it can never drift out of date with static copy.
  const familyOverlap = applicationGuidance ? summariseFamilyOverlap(families.map((family) => ({ slug: family.slug, name: family.name, memberSkus: getFamilyProducts(family).map((product) => product.sku) })), skuSet) : [];
  const unclusteredCount = products.length - familyOverlap.reduce((sum, entry) => sum + entry.matched, 0);
  // Families already cited in the "Product families in this group" article above shouldn't repeat in the link list below.
  const bottomFamilies = applicationGuidance && familyOverlap.length ? [] : families;
  const question = kind === "application" ? `Which products are available for ${facet.value}?` : `Which products use ${facet.value}?`;
  const answer = applicationGuidance
    ? applicationGuidance.directAnswer.replace("{count}", String(facet.count))
    : kind === "application" ? `Browse ${facet.count} products for ${facet.value}.` : `Browse ${facet.count} products that use ${facet.value}.`;
  const structuredProducts = products.slice(0, 50);
  return <>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: `${facet.value} products`, url: `${siteUrl}${basePath}/${facet.slug}`, mainEntity: { "@type": "ItemList", name: `First ${structuredProducts.length} products shown for ${facet.value}`, numberOfItems: structuredProducts.length, itemListElement: structuredProducts.map((product, index) => ({ "@type": "ListItem", position: index + 1, name: productDisplayName(product.sku), url: `${siteUrl}/products/${product.slug}` })) } }} />
    <StructuredData data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: label, item: `${siteUrl}${basePath}` }, { "@type": "ListItem", position: 3, name: facet.value, item: `${siteUrl}${basePath}/${facet.slug}` }] }} />
    <section className="page-hero"><div className="shell"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href={basePath}>{label}</Link><span>/</span><span>{facet.value}</span></nav><div className="facet-detail-heading"><div><h1>{facet.value}</h1></div><p>{facet.count} {facet.count === 1 ? "product" : "products"} available to explore.</p></div></div></section>
    <section className="section shell answer-section"><div><h2>{question}</h2><p className="lead-copy">{answer}{applicationGuidance ? "" : " Compare models, specifications, connectivity and prices below."}</p></div><aside className="evidence-note"><strong>What should I compare?</strong><p>Check the model, specification, connectivity, package information and price.</p></aside></section>
    {applicationGuidance ? <section className="section shell"><div className="section-heading"><h2>How can I narrow the options?</h2></div><div className="criteria-grid"><article><h3>Product types in this group</h3><p>{applicationGuidance.hardwareSummary}</p></article><article><h3>Product families in this group</h3>{familyOverlap.length ? <><ul>{familyOverlap.map((entry) => <li key={entry.slug}><Link href={`/families/${entry.slug}`}>{entry.name}</Link>, {entry.matched} of {entry.total} family models are in this group.</li>)}</ul>{unclusteredCount > 0 ? <p>The remaining {unclusteredCount} {unclusteredCount === 1 ? "model is" : "models are"} not part of a verified product family; compare connectivity and the exact specification for each SKU.</p> : null}</> : <p>None of the {facet.count} {facet.count === 1 ? "model" : "models"} in this group belong to a verified product family; compare connectivity and the exact specification for each SKU.</p>}</article><article><h3>Connectivity represented</h3><p>{interfaces.length ? interfaces.map((item, index) => <span key={item.slug}>{index ? ", " : ""}<Link href={`/connectivity/${item.slug}`}>{item.value}</Link></span>) : "No connectivity value is available for this group."}</p></article><article><h3>What to compare</h3><ul>{applicationGuidance.considerations.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h3>Selection path</h3><p>{applicationGuidance.selectionPath}</p></article></div></section> : null}
    {connectivityGuidance ? <section className="section shell"><div className="section-heading"><h2>What is {facet.value}?</h2></div><div className="criteria-grid"><article><h3>What it is</h3><p>{connectivityGuidance.definition}</p></article><article><h3>When to consider it</h3><p>{connectivityGuidance.deploymentFit}</p></article><article><h3>Why choose it</h3><p>{connectivityGuidance.advantage}</p></article><article><h3>What to confirm</h3><p>{connectivityGuidance.limitation}</p></article></div><p className="source-note">Learn more: <a href={connectivityGuidance.sourceUrl} target="_blank" rel="noreferrer">{connectivityGuidance.sourceLabel}</a>.</p></section> : null}
    <section className="section section-tint"><div className="shell"><div className="section-heading split-heading"><div><h2>Compare products</h2></div><p>Review up to {Math.min(sourceProducts.length, 12)} models side by side.</p></div><ProductComparison products={sourceProducts.slice(0, 12)} caption={`${facet.value} product comparison.`} /></div></section>
    {(applications.length || interfaces.length || guides.length || bottomFamilies.length) ? <section className="section shell"><div className="section-heading"><h2>Continue your product research</h2></div><div className="link-cluster">{applications.map((item) => <Link href={`/applications/${item.slug}`} key={`a-${item.slug}`}>{item.value}</Link>)}{interfaces.map((item) => <Link href={`/connectivity/${item.slug}`} key={`i-${item.slug}`}>{item.value}</Link>)}{bottomFamilies.map((family) => <Link href={`/families/${family.slug}`} key={`f-${family.slug}`}>{family.name} family</Link>)}{guides.map((guide) => <Link href={`/guides/${guide.slug}`} key={`g-${guide.slug}`}>{guide.title}</Link>)}</div></section> : null}
    <section className="section shell"><div className="product-grid">{products.map((product) => <ProductCard key={product.slug} product={product} />)}</div><div className="back-row"><Link href={basePath} className="text-link back-link"><ArrowIcon /> All {label.toLocaleLowerCase("en-ZA")}</Link></div></section>
  </>;
}
