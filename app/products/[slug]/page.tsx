import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon, ExternalIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { StructuredData } from "@/components/structured-data";
import { getImageForProduct, getProductBySlug, getSiteUrl, products, publicProducts } from "@/lib/catalogue";
import { getPublicPrice } from "@/lib/pricing";
import { displayValue, facetValue, productDisplayName, productSummary } from "@/lib/product-presentation";
import { getFamilyProducts, getIndexableApplicationFacet, getIndexableInterfaceFacet, getProductFamily, getRelevantGuides } from "@/lib/discovery";

export const dynamicParams = false;
export function generateStaticParams() { return products.map((product) => ({ slug: product.slug })); }

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params; const product = getProductBySlug(slug); if (!product) return {};
  const name = productDisplayName(product.sku);
  const description = `${productSummary(product)} ${displayValue(product.specification)}`.slice(0, 155);
  const image = getImageForProduct(product.sku);
  return { title: `${name} — ${displayValue(product.application)}`, description, alternates: { canonical: `/products/${product.slug}` }, openGraph: { type: "website", title: `${name} | LoRa Network`, description, url: `/products/${product.slug}`, images: image ? [{ url: image.localPath, alt: name }] : undefined } };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params; const product = getProductBySlug(slug); if (!product) notFound();
  const siteUrl = getSiteUrl(); const publicPrice = getPublicPrice(product.priceUsd); const image = getImageForProduct(product.sku);
  const name = productDisplayName(product.sku); const application = displayValue(product.application); const iotInterface = displayValue(product.iotInterface); const specification = displayValue(product.specification); const summary = productSummary(product);
  const family = getProductFamily(product); const familyProducts = family ? getFamilyProducts(family) : [];
  const relatedSkuSet = new Set(familyProducts.map((item) => item.sku));
  const related = publicProducts.filter((item) => item.slug !== product.slug && (family ? relatedSkuSet.has(item.sku) : facetValue(item.application) === facetValue(product.application))).sort((a, b) => Number(Boolean(b.imagePath)) - Number(Boolean(a.imagePath))).slice(0, 4);
  const applicationFacet = getIndexableApplicationFacet(product.application); const interfaceFacet = getIndexableInterfaceFacet(product.iotInterface); const guides = getRelevantGuides(product);
  const comparisonProducts = [product, ...familyProducts.filter((item) => item.sku !== product.sku)].slice(0, 4);
  const compareHref = comparisonProducts.length > 1 ? `/compare?products=${comparisonProducts.map((item) => item.slug).join(",")}` : "";
  const packageFields = [{ label: "Package dimensions (mm)", value: product.packageDimensionMm }, { label: "Package weight (g)", value: product.packageWeightG }].filter((field) => displayValue(field.value));
  const productSchema: Record<string, unknown> = { "@context": "https://schema.org", "@type": "Product", name, sku: product.sku, description: specification || summary, brand: { "@type": "Brand", name: "Dragino" }, category: application || undefined, url: `${siteUrl}/products/${product.slug}`, image: image ? `${siteUrl}${image.localPath}` : undefined, additionalProperty: [{ "@type": "PropertyValue", name: "Application", value: application || undefined }, { "@type": "PropertyValue", name: "IoT interface", value: iotInterface || undefined }, { "@type": "PropertyValue", name: "Package dimensions (mm)", value: displayValue(product.packageDimensionMm) || undefined }, { "@type": "PropertyValue", name: "Package weight (g)", value: displayValue(product.packageWeightG) || undefined }].filter((property) => property.value) };
  if (publicPrice.schemaAmount !== null) productSchema.offers = { "@type": "Offer", priceCurrency: "ZAR", price: publicPrice.schemaAmount, url: `${siteUrl}/products/${product.slug}` };

  return <>
    <StructuredData data={productSchema} />
    <StructuredData data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Products", item: `${siteUrl}/products` }, { "@type": "ListItem", position: 3, name, item: `${siteUrl}/products/${product.slug}` }] }} />
    <section className="product-detail-hero"><div className="shell"><nav className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href="/products">Products</Link><span>/</span><span>{name}</span></nav><div className="product-buy-grid">
      <div className="product-detail-media"><ProductImage sku={name} application={application} imagePath={image?.localPath ?? ""} priority sizes="(max-width: 800px) 100vw, 50vw" /></div>
      <div className="product-buy-copy"><h1>{name}</h1><p className="product-detail-summary">{summary}</p><dl className="quick-facts">{application ? <div><dt>Application</dt><dd>{application}</dd></div> : null}{iotInterface ? <div><dt>IoT interface</dt><dd>{iotInterface}</dd></div> : null}</dl><aside className="price-panel"><span>Price</span><strong>{publicPrice.formatted}</strong><small>South African rand. {publicPrice.vatNotice}</small></aside><div className="buy-actions"><Link href={`/contact?sku=${encodeURIComponent(product.sku)}`} className="button button-primary">Enquire about {name} <ArrowIcon /></Link>{product.productUrl ? <a href={product.productUrl} target="_blank" rel="noreferrer" className="button button-secondary">Official product page <ExternalIcon /></a> : null}</div></div>
    </div></div></section>
    <section className="section shell product-content-grid"><aside className="product-section-nav"><span>On this page</span><a href="#overview">Overview</a><a href="#specifications">Specifications</a>{packageFields.length ? <a href="#package">Package</a> : null}<a href="#questions">Questions</a>{family || guides.length || compareHref ? <a href="#related-guidance">Related guidance</a> : null}</aside><div className="product-sections">
      <section id="overview"><h2>Product overview</h2><dl className="source-facts"><div><dt>SKU</dt><dd>{name}</dd></div><div><dt>Manufacturer</dt><dd>Dragino</dd></div>{application ? <div><dt>Application</dt><dd>{applicationFacet ? <Link href={`/applications/${applicationFacet.slug}`}>{application}</Link> : application}</dd></div> : null}{iotInterface ? <div><dt>IoT interface</dt><dd>{interfaceFacet ? <Link href={`/connectivity/${interfaceFacet.slug}`}>{iotInterface}</Link> : iotInterface}</dd></div> : null}</dl></section>
      {specification ? <section id="specifications"><h2>Specifications</h2><p className="lead-copy">{specification}</p></section> : null}
      {packageFields.length ? <section id="package"><h2>Package information</h2><dl className="source-facts">{packageFields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></section> : null}
      <section id="questions"><h2>Questions about {name}</h2><div className="faq-list"><details open><summary>What is {name}?<i /></summary><p>{summary}</p></details>{application ? <details><summary>What is {name} used for?<i /></summary><p>The supplied catalogue lists its application as {application}.</p></details> : null}{iotInterface ? <details><summary>What connectivity does {name} use?<i /></summary><p>The supplied catalogue lists its IoT interface as {iotInterface}.</p></details> : null}<details><summary>How much does {name} cost in South Africa?<i /></summary><p>{publicPrice.amountZar === null ? "Contact us for current pricing." : `The listed price is ${publicPrice.formatted}. ${publicPrice.vatNotice}`}</p></details>{product.packageDimensionMm ? <details><summary>What are the package dimensions?<i /></summary><p>Package dimensions: {displayValue(product.packageDimensionMm)} mm.</p></details> : null}{product.packageWeightG ? <details><summary>How much does {name} weigh when packaged?<i /></summary><p>Package weight: {displayValue(product.packageWeightG)} g.</p></details> : null}</div></section>
      {family || guides.length || compareHref ? <section id="related-guidance"><h2>Compare and continue researching.</h2><div className="link-cluster">{family ? <Link href={`/families/${family.slug}`}>Compare the {family.name} product family</Link> : null}{compareHref ? <Link href={compareHref}>Compare related models side by side</Link> : null}{guides.map((guide) => <Link href={`/guides/${guide.slug}`} key={guide.slug}>{guide.title}</Link>)}</div></section> : null}
    </div></section>
    {related.length ? <section className="section section-tint"><div className="shell"><div className="section-heading split-heading"><div><h2>{family ? `More ${family.name} models.` : `Also listed for ${application}.`}</h2></div><p>{family ? `Explore other products in the ${family.name} family.` : `Explore other products for ${application}.`}</p></div><div className="product-grid featured-grid">{related.map((item) => <ProductCard key={item.slug} product={item} />)}</div></div></section> : null}
  </>;
}
