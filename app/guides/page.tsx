import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { buyingGuides, getGuideProducts } from "@/lib/discovery";

export const metadata: Metadata = { title: "IoT Hardware Buying Guides", description: "Concise guides for comparing IoT hardware and ZAR prices in South Africa.", alternates: { canonical: "/guides" } };

export default function GuidesPage() {
  return <><section className="page-hero"><div className="shell page-hero-grid"><div><h1>Buying guides</h1></div><div className="page-hero-aside"><p>Compare products by application, connectivity, specifications and price.</p><strong>{buyingGuides.length} focused guides</strong></div></div></section><section className="section shell guide-grid">{buyingGuides.map((guide) => <article className="guide-card" key={guide.slug}><p className="guide-meta">{getGuideProducts(guide).length} relevant products</p><h2>{guide.title}</h2><p>{guide.question}</p><Link href={`/guides/${guide.slug}`} className="text-link">Read the guide <ArrowIcon /></Link></article>)}</section></>;
}
