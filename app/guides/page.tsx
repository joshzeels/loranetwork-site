import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { buyingGuides, getGuideProducts } from "@/lib/discovery";

export const metadata: Metadata = { title: "IoT Hardware Buying Guides", description: "Concise, catalogue-grounded guides for comparing IoT hardware and ZAR prices in South Africa.", alternates: { canonical: "/guides" } };

export default function GuidesPage() {
  return <><section className="page-hero"><div className="shell page-hero-grid"><div><p className="eyebrow">Buying guides</p><h1>Choose from catalogue facts.</h1></div><div className="page-hero-aside"><p>Each guide answers one buying question using the supplied product records. Technical details not present in the workbook are left to the linked official source.</p><strong>{buyingGuides.length} focused guides</strong></div></div></section><section className="section shell guide-grid">{buyingGuides.map((guide) => <article className="guide-card" key={guide.slug}><p className="eyebrow">{getGuideProducts(guide).length} relevant products</p><h2>{guide.title}</h2><p>{guide.question}</p><Link href={`/guides/${guide.slug}`} className="text-link">Read the guide <ArrowIcon /></Link></article>)}</section></>;
}
