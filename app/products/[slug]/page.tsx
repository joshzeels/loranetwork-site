import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { StructuredData } from "@/components/structured-data";
import { getImageForProduct, getProductBySlug, getSiteUrl, products, publicProducts } from "@/lib/catalogue";
import { getFamilyComparisonSummary, getFamilyProducts, getIndexableApplicationFacet, getIndexableInterfaceFacet, getProductFamily, getRelevantGuides } from "@/lib/discovery";
import { getPublicPrice } from "@/lib/pricing";
import { getProductGuidance } from "@/lib/product-guidance";
import { displayValue, facetValue, productDefinition, productDisplayName, sentenceAwareDescription, specificationItems } from "@/lib/product-presentation";
import { buildProductManufacturer, buildProductOffer } from "@/lib/structured-data";

export const dynamicParams = false;
export function generateStaticParams() { return products.map((product) => ({ slug: product.slug })); }

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  const name = productDisplayName(product.sku);
  const definition = getProductGuidance(product.sku)?.definition ?? productDefinition(product);
  const specification = specificationItems(product.specification).slice(0, 2).join("; ");
  const description = sentenceAwareDescription([definition, specification ? `Key catalogue details: ${specification}.` : "", "View public pricing in ZAR."]);
  const image = getImageForProduct(product.sku);
  return { title: `${name}: ${displayValue(product.application)}`, description, alternates: { canonical: `/products/${product.slug}` }, openGraph: { type: "website", title: `${name} | LoRa Network`, description, url: `/products/${product.slug}`, images: image ? [{ url: image.localPath, alt: name }] : undefined } };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const siteUrl = getSiteUrl();
  const publicPrice = getPublicPrice(product.priceUsd);
  const image = getImageForProduct(product.sku);
  const name = productDisplayName(product.sku);
  const guidance = getProductGuidance(product.sku);
  const application = displayValue(product.application);
  const iotInterface = displayValue(product.iotInterface);
  const specification = displayValue(product.specification);
  const structuredSpecifications = specificationItems(product.specification);
  const summary = guidance?.definition ?? productDefinition(product);
  const family = getProductFamily(product);
  const familyProducts = family ? getFamilyProducts(family) : [];
  const familyComparison = family ? getFamilyComparisonSummary(family, product) : "";
  const relatedSkuSet = new Set(familyProducts.map((item) => item.sku));
  const related = publicProducts.filter((item) => item.slug !== product.slug && (family ? relatedSkuSet.has(item.sku) : facetValue(item.application) === facetValue(product.application))).sort((a, b) => Number(Boolean(b.imagePath)) - Number(Boolean(a.imagePath))).slice(0, 4);
  const applicationFacet = getIndexableApplicationFacet(product.application);
  const interfaceFacet = getIndexableInterfaceFacet(product.iotInterface);
  const guides = getRelevantGuides(product);
  const comparisonProducts = [product, ...familyProducts.filter((item) => item.sku !== product.sku)].slice(0, 4);
  const compareHref = comparisonProducts.length > 1 ? `/compare?products=${comparisonProducts.map((item) => item.slug).join(",")}` : "";
  const packageFields = [{ label: "Package dimensions (mm)", value: product.packageDimensionMm }, { label: "Package weight (g)", value: product.packageWeightG }].filter((field) => displayValue(field.value));
  const productSchema: Record<string, unknown> = { "@context": "https://schema.org", "@type": "Product", name, sku: product.sku, description: specification || summary, ...buildProductManufacturer(), category: application || undefined, url: `${siteUrl}/products/${product.slug}`, image: image ? `${siteUrl}${image.localPath}` : undefined, additionalProperty: [{ "@type": "PropertyValue", name: "Application", value: application || undefined }, { "@type": "PropertyValue", name: "IoT interface", value: iotInterface || undefined }, { "@type": "PropertyValue", name: "Package dimensions (mm)", value: displayValue(product.packageDimensionMm) || undefined }, { "@type": "PropertyValue", name: "Package weight (g)", value: displayValue(product.packageWeightG) || undefined }].filter((property) => property.value) };
  if (publicPrice.schemaAmount !== null) productSchema.offers = buildProductOffer(siteUrl, `${siteUrl}/products/${product.slug}`, publicPrice.schemaAmount);
  const questionItems = [
    { question: `What is ${name}?`, answer: summary },
    guidance?.uses ? { question: `What is ${name} used for?`, answer: guidance.uses } : application ? { question: `What is ${name} used for?`, answer: `The application shown for ${name} is ${application}.` } : null,
    iotInterface ? { question: `How does ${name} connect?`, answer: `${name} uses ${iotInterface}.` } : null,
    guidance?.suitability ? { question: `Who is ${name} suitable for?`, answer: guidance.suitability } : null,
    { question: `How much does ${name} cost in South Africa?`, answer: publicPrice.amountZar === null ? "Contact us for current pricing." : `The price is ${publicPrice.formatted}. ${publicPrice.vatNotice}` },
    product.packageDimensionMm ? { question: "What are the package dimensions?", answer: `Package dimensions: ${displayValue(product.packageDimensionMm)} mm.` } : null,
    product.packageWeightG ? { question: "What is the packaged weight?", answer: `Package weight: ${displayValue(product.packageWeightG)} g.` } : null,
  ].filter((item): item is { question: string; answer: string } => item !== null);

  return <>
    <StructuredData data={productSchema} />
    <StructuredData data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Products", item: `${siteUrl}/products` }, { "@type": "ListItem", position: 3, name, item: `${siteUrl}/products/${product.slug}` }] }} />
    <section className="product-detail-hero"><div className="shell"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/products">Products</Link><span>/</span><span>{name}</span></nav><div className="product-buy-grid">
      <div className="product-detail-media"><ProductImage sku={name} application={application} imagePath={image?.localPath ?? ""} priority sizes="(max-width: 800px) 100vw, 50vw" /></div>
      <div className="product-buy-copy"><h1>{name}</h1><p className="product-detail-summary">{summary}</p><dl className="quick-facts">{application ? <div><dt>Application</dt><dd>{application}</dd></div> : null}{iotInterface ? <div><dt>Connectivity</dt><dd>{iotInterface}</dd></div> : null}</dl><aside className="price-panel"><span>Price</span><strong>{publicPrice.formatted}</strong><small>South African rand. {publicPrice.vatNotice}</small></aside><div className="buy-actions"><Link href={`/contact?sku=${encodeURIComponent(product.sku)}`} className="button button-primary">Ask about {name} <ArrowIcon /></Link></div></div>
    </div></div></section>
    <section className="section shell product-content-grid"><aside className="product-section-nav"><span>On this page</span><a href="#overview">Overview</a><a href="#specifications">Specifications</a><a href="#suitability">Where it fits</a>{packageFields.length ? <a href="#package">Package</a> : null}<a href="#questions">Questions</a>{family || guides.length || compareHref ? <a href="#related-guidance">Related guidance</a> : null}</aside><div className="product-sections">
      <section id="overview"><h2>Product overview</h2><dl className="source-facts"><div><dt>SKU</dt><dd>{name}</dd></div><div><dt>Manufacturer</dt><dd>Dragino</dd></div><div><dt>Reseller</dt><dd>LoRa Network</dd></div>{application ? <div><dt>Application</dt><dd>{applicationFacet ? <Link href={`/applications/${applicationFacet.slug}`}>{application}</Link> : application}</dd></div> : null}{iotInterface ? <div><dt>Connectivity</dt><dd>{interfaceFacet ? <Link href={`/connectivity/${interfaceFacet.slug}`}>{iotInterface}</Link> : iotInterface}</dd></div> : null}</dl></section>
      {specification ? <section id="specifications"><h2>Specifications</h2>{structuredSpecifications.length ? <ul className="specification-list">{structuredSpecifications.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="lead-copy">{specification}</p>}</section> : null}
      <section id="suitability"><h2>Where this product fits</h2><p>{guidance?.suitability ?? (application ? `${name} is listed for ${application}.` : `${name} has no application value in the source catalogue.`)}{!guidance?.suitability && iotInterface ? ` Consider it where ${iotInterface} is an available project connectivity option.` : ""}{!guidance?.suitability ? " Confirm any requirement that is not stated in the specification before ordering." : ""}</p></section>
      {guidance?.buyerChecks?.length ? <section id="buyer-checks"><h2>Before choosing this model</h2><ul className="check-list">{guidance.buyerChecks.map((check) => <li key={check}>{check}</li>)}</ul></section> : null}
      {packageFields.length ? <section id="package"><h2>Package information</h2><dl className="source-facts">{packageFields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></section> : null}
      <section id="questions"><h2>Questions about {name}</h2><div className="faq-list">{questionItems.map((item, index) => <details open={index === 0} key={item.question}><summary>{item.question}<i /></summary><p>{item.answer}</p></details>)}</div></section>
      {family || guides.length || compareHref ? <section id="related-guidance"><h2>Compare your options</h2>{familyComparison ? <p className="lead-copy">{familyComparison}</p> : null}<div className="link-cluster">{family ? <Link href={`/families/${family.slug}`}>Explore {family.name} models</Link> : null}{compareHref ? <Link href={compareHref}>Compare related models</Link> : null}{guides.map((guide) => <Link href={`/guides/${guide.slug}`} key={guide.slug}>{guide.title}</Link>)}</div></section> : null}
    </div></section>
    {related.length ? <section className="section section-tint"><div className="shell"><div className="section-heading split-heading"><div><h2>{family ? `More ${family.name} models` : `More products for ${application}`}</h2></div><p>{family ? `Explore other products in the ${family.name} family.` : `Explore other products for ${application}.`}</p></div><div className="product-grid featured-grid">{related.map((item) => <ProductCard key={item.slug} product={item} />)}</div></div></section> : null}
  </>;
}
