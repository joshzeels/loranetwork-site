import type { Metadata } from "next";
import Link from "next/link";
import { ProductComparison } from "@/components/product-comparison";
import { products } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Compare Products", description: "Compare selected catalogue products using their supplied fields and public ZAR prices.", robots: { index: false, follow: true }, alternates: { canonical: "/compare" } };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ products?: string | string[] }> }) {
  const query = await searchParams; const value = Array.isArray(query.products) ? query.products[0] : query.products ?? "";
  const slugs = [...new Set(value.split(",").map((slug) => slug.trim()).filter(Boolean))].slice(0, 4);
  const selected = slugs.map((slug) => products.find((product) => product.slug === slug)).filter((product): product is NonNullable<typeof product> => Boolean(product));
  return <><section className="page-hero"><div className="shell page-hero-grid"><div><p className="eyebrow">Product comparison</p><h1>Compare catalogue facts.</h1></div><div className="page-hero-aside"><p>Compare up to four related products. Blank source fields remain blank and every price uses the central ZAR pricing utility.</p><strong>{selected.length} selected</strong></div></div></section><section className="section shell">{selected.length ? <ProductComparison products={selected} caption="Selected products and their supplied catalogue fields." /> : <div className="empty-state"><p className="eyebrow">No products selected</p><h2>Start from a product family.</h2><p>Choose a verified family to compare related models.</p><Link href="/families" className="button button-dark">Browse product families</Link></div>}</section></>;
}
