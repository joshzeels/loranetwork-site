import type { Metadata } from "next";
import Link from "next/link";
import { ProductComparison } from "@/components/product-comparison";
import { products } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Compare Products", description: "Compare selected products by specification, connectivity, package information and price in rand.", robots: { index: false, follow: true }, alternates: { canonical: "/compare" } };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ products?: string | string[] }> }) {
  const query = await searchParams; const value = Array.isArray(query.products) ? query.products[0] : query.products ?? "";
  const slugs = [...new Set(value.split(",").map((slug) => slug.trim()).filter(Boolean))].slice(0, 4);
  const selected = slugs.map((slug) => products.find((product) => product.slug === slug)).filter((product): product is NonNullable<typeof product> => Boolean(product));
  return <><section className="page-hero"><div className="shell page-hero-grid"><div><h1>Compare products.</h1></div><div className="page-hero-aside"><p>Compare the specifications, interfaces, package information and ZAR prices of up to four products.</p><strong>{selected.length} selected</strong></div></div></section><section className="section shell">{selected.length ? <ProductComparison products={selected} caption="Selected product comparison." /> : <div className="empty-state"><h2>Start from a product family.</h2><p>Choose a family to compare related models.</p><Link href="/families" className="button button-dark">Browse product families</Link></div>}</section></>;
}
