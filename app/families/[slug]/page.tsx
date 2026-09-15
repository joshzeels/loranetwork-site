import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon } from "@/components/icons";
import { ProductComparison } from "@/components/product-comparison";
import { StructuredData } from "@/components/structured-data";
import { getSiteUrl } from "@/lib/catalogue";
import { getFamilyBySlug, getFamilyComparisonSummary, getFamilyProducts, getIndexableApplicationsForProducts, getIndexableInterfacesForProducts, productFamilies } from "@/lib/discovery";
import { productDisplayName } from "@/lib/product-presentation";

export const dynamicParams = false;
export function generateStaticParams() { return productFamilies.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: PageProps<"/families/[slug]">): Promise<Metadata> { const { slug } = await params; const family = getFamilyBySlug(slug); if (!family) return {}; const count = getFamilyProducts(family).length; return { title: `${family.name} Product Family`, description: `Compare ${count} ${family.name} models by specification, IoT interface, package information and ZAR price.`, alternates: { canonical: `/families/${slug}` } }; }

export default async function FamilyPage({ params }: PageProps<"/families/[slug]">) {
  const { slug } = await params; const family = getFamilyBySlug(slug); if (!family) notFound();
  const familyProducts = getFamilyProducts(family); const siteUrl = getSiteUrl();
  const applications = getIndexableApplicationsForProducts(familyProducts); const interfaces = getIndexableInterfacesForProducts(familyProducts);
  const compareHref = `/compare?products=${familyProducts.slice(0, 4).map((product) => product.slug).join(",")}`;
  const variantSummary = getFamilyComparisonSummary(family);
  return <>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: `${family.name} product family`, description: family.purpose, url: `${siteUrl}/families/${family.slug}`, mainEntity: { "@type": "ItemList", numberOfItems: familyProducts.length, itemListElement: familyProducts.map((product, index) => ({ "@type": "ListItem", position: index + 1, name: productDisplayName(product.sku), url: `${siteUrl}/products/${product.slug}` })) } }} />
    <StructuredData data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Product families", item: `${siteUrl}/families` }, { "@type": "ListItem", position: 3, name: family.name, item: `${siteUrl}/families/${family.slug}` }] }} />
    <section className="page-hero"><div className="shell"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/families">Product families</Link><span>/</span><span>{family.name}</span></nav><div className="facet-detail-heading"><div><h1>{family.name}</h1></div><p>{family.purpose}</p></div></div></section>
    <section className="section shell answer-section"><div><h2>Which {family.name} models are available?</h2><p className="lead-copy">{variantSummary}</p></div><aside className="evidence-note"><strong>How to choose</strong><p>Compare the exact specification and connectivity shown for each SKU. Package information appears only where the source catalogue supplies it.</p></aside></section>
    <section className="section section-tint"><div className="shell"><div className="section-heading split-heading"><div><h2>Compare {family.name} variants</h2></div><Link className="button button-dark" href={compareHref}>Compare four models <ArrowIcon /></Link></div><ProductComparison products={familyProducts} caption={`${familyProducts.length} related ${family.name} models.`} /></div></section>
    {(applications.length || interfaces.length) ? <section className="section shell"><div className="section-heading"><h2>Explore related products</h2></div><div className="link-cluster">{applications.map((facet) => <Link href={`/applications/${facet.slug}`} key={`a-${facet.slug}`}>{facet.value}</Link>)}{interfaces.map((facet) => <Link href={`/connectivity/${facet.slug}`} key={`i-${facet.slug}`}>{facet.value}</Link>)}</div></section> : null}
  </>;
}
