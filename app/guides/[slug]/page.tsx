import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductComparison } from "@/components/product-comparison";
import { StructuredData } from "@/components/structured-data";
import { getSiteUrl } from "@/lib/catalogue";
import { buyingGuides, getFamilyBySlug, getGuideBySlug, getGuideProducts, getIndexableApplicationsForProducts, getIndexableInterfacesForProducts } from "@/lib/discovery";
import { sentenceAwareDescription } from "@/lib/product-presentation";

export const dynamicParams = false;
export function generateStaticParams() { return buyingGuides.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> { const { slug } = await params; const guide = getGuideBySlug(slug); return guide ? { title: guide.title, description: sentenceAwareDescription([guide.answerTemplate.replace("{count}", String(getGuideProducts(guide).length))]), alternates: { canonical: `/guides/${slug}` } } : {}; }

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params; const guide = getGuideBySlug(slug); if (!guide) notFound();
  const guideProducts = getGuideProducts(guide); const answer = guide.answerTemplate.replace("{count}", String(guideProducts.length)); const siteUrl = getSiteUrl();
  const applications = getIndexableApplicationsForProducts(guideProducts); const interfaces = getIndexableInterfacesForProducts(guideProducts);
  const families = guide.relatedFamilySlugs.map(getFamilyBySlug).filter((family): family is NonNullable<typeof family> => Boolean(family));
  return <>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: answer, mainEntityOfPage: `${siteUrl}/guides/${guide.slug}` }} />
    <StructuredData data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Buying guides", item: `${siteUrl}/guides` }, { "@type": "ListItem", position: 3, name: guide.title, item: `${siteUrl}/guides/${guide.slug}` }] }} />
    <article><header className="page-hero"><div className="shell"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/guides">Buying guides</Link><span>/</span><span>{guide.title}</span></nav><div className="facet-detail-heading"><div><h1>{guide.title}</h1></div><p>Compare IoT hardware for South African projects.</p></div></div></header>
      <section className="section shell answer-section"><div><h2>{guide.question}</h2><p className="lead-copy">{answer}</p></div></section>
      <section className="section section-tint"><div className="shell"><div className="section-heading"><h2>What should I compare?</h2></div><ol className="criteria-list">{guide.considerations.map((item) => <li key={item}>{item}</li>)}</ol></div></section>
      <section className="section shell"><div className="section-heading"><h2>How do the options differ?</h2><p>{guide.differenceSummary}</p></div><div className="section-heading"><h2>A practical decision path</h2></div><ol className="criteria-list">{guide.decisionPath.map((item) => <li key={item}>{item}</li>)}</ol></section>
      <section className="section shell"><div className="section-heading split-heading"><div><h2>Compare products</h2></div><p>View up to {Math.min(guideProducts.length, 16)} products for this guide.</p></div><ProductComparison products={guideProducts.slice(0, 16)} caption={`Product comparison for ${guide.title}.`} /></section>
      {(applications.length || interfaces.length || families.length) ? <section className="section section-tint"><div className="shell"><div className="section-heading"><h2>Explore relevant catalogue sections</h2><p>The linked application, connectivity and family pages provide the full product lists behind this guide.</p></div><div className="link-cluster">{applications.map((facet) => <Link href={`/applications/${facet.slug}`} key={`a-${facet.slug}`}>{facet.value}</Link>)}{interfaces.map((facet) => <Link href={`/connectivity/${facet.slug}`} key={`i-${facet.slug}`}>{facet.value}</Link>)}{families.map((family) => <Link href={`/families/${family.slug}`} key={`f-${family.slug}`}>{family.name} family</Link>)}</div></div></section> : null}
    </article>
  </>;
}
