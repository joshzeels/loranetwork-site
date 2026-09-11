import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { ProductImage } from "@/components/product-image";
import type { CatalogueFacet } from "@/lib/catalogue";
import { facetValue, type PublicDraginoProduct } from "@/lib/product-presentation";

export function FacetIndex({ eyebrow, title, description, basePath, facets, products, kind }: { eyebrow: string; title: string; description: string; basePath: string; facets: CatalogueFacet[]; products: PublicDraginoProduct[]; kind: "application" | "iotInterface" }) {
  return <><section className="page-hero"><div className="shell page-hero-grid"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="page-hero-aside"><p>{description}</p><strong>{facets.length} groups</strong></div></div></section><section className="section shell facet-list">{facets.map((facet) => { const representative = products.find((product) => product.imagePath && facetValue(product[kind]) === facetValue(facet.value)); return <Link href={`${basePath}/${facet.slug}`} key={facet.slug} className="facet-row"><span className="facet-row-media">{representative ? <ProductImage sku={representative.sku} application={representative.application} imagePath={representative.imagePath} sizes="120px" /> : <span className="interface-node" aria-hidden="true" />}</span><span><strong>{facet.value}</strong><small>{facet.count} {facet.count === 1 ? "product" : "products"}</small></span><ArrowIcon /></Link>; })}</section></>;
}
