import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { getFamilyProducts, productFamilies } from "@/lib/discovery";

export const metadata: Metadata = {
  title: "Product Families",
  description: "Compare IoT product families by SKU, specification, connectivity and ZAR price.",
  alternates: { canonical: "/families" },
};

export default function FamiliesPage() {
  return <>
    <section className="page-hero"><div className="shell page-hero-grid"><div><h1>Compare related models</h1></div><div className="page-hero-aside"><p>Explore related products and compare their specifications, connectivity and prices.</p><strong>{productFamilies.length} product families</strong></div></div></section>
    <section className="section shell facet-list">{productFamilies.map((family) => <Link href={`/families/${family.slug}`} className="facet-row" key={family.slug}><span className="facet-row-media"><span className="interface-node" aria-hidden="true" /></span><span><strong>{family.name}</strong><small>{getFamilyProducts(family).length} related models</small></span><ArrowIcon /></Link>)}</section>
  </>;
}
