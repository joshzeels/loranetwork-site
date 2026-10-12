import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon } from "@/components/icons";
import { ProductViewTracker } from "@/components/analytics-trackers";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { StructuredData } from "@/components/structured-data";
import { getDisplayImagePath, getImageForProduct, getProductBySlug, getProductDocumentationStatus, getSiteUrl, products, publicProducts } from "@/lib/catalogue";
import { getFamilyComparisonSummary, getFamilyProducts, getIndexableApplicationFacet, getIndexableInterfaceFacet, getProductFamily, getRelevantGuides } from "@/lib/discovery";
import { getPublicPriceForProduct } from "@/lib/pricing";
import { getProductGuidance } from "@/lib/product-guidance";
import { displayValue, productApplicationLabel, productConnectivityLabel, productDisplayName, productFullName, sentenceAwareDescription, specificationItems } from "@/lib/product-presentation";
import { buildProductAnswers, selectRelatedProducts } from "@/lib/product-answers";
import { buildProductManufacturer, buildProductOffer } from "@/lib/structured-data";

export const dynamicParams = false;
export function generateStaticParams() { return products.map((product) => ({ slug: product.slug })); }

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  const name = productDisplayName(product.sku);
  const definition = buildProductAnswers(product, getProductGuidance(product.sku), getProductDocumentationStatus(product.sku)).opening;
  const specification = specificationItems(product.specification).slice(0, 2).join("; ");
  const description = sentenceAwareDescription([definition, specification ? `Key details: ${specification}.` : "", "View public pricing in ZAR."]);
  const image = getImageForProduct(product.sku);
  const displayImagePath = getDisplayImagePath(product, image ?? undefined);
  return { title: `${name}: ${productApplicationLabel(product.application)}`, description, alternates: { canonical: `/products/${product.slug}` }, openGraph: { type: "website", title: `${name} | LoRa Network`, description, url: `/products/${product.slug}`, images: displayImagePath ? [{ url: displayImagePath, alt: name }] : undefined } };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const siteUrl = getSiteUrl();
  const publicPrice = getPublicPriceForProduct(product.sku, product.priceUsd);
  const image = getImageForProduct(product.sku);
  const name = productDisplayName(product.sku);
  const fullName = productFullName(product.sku);
  const guidance = getProductGuidance(product.sku);
  const application = displayValue(product.application);
  const iotInterface = displayValue(product.iotInterface);
  const applicationLabel = productApplicationLabel(product.application);
  const iotInterfaceLabel = productConnectivityLabel(product.iotInterface);
  const specification = displayValue(product.specification);
  const structuredSpecifications = specificationItems(product.specification);
  const family = getProductFamily(product);
  const familyProducts = family ? getFamilyProducts(family) : [];
  const answers = buildProductAnswers(product, guidance, getProductDocumentationStatus(product.sku), { familyName: family?.name, familyProducts });
  const summary = answers.opening;
  const familyComparison = family ? getFamilyComparisonSummary(family, product) : "";
  const related = selectRelatedProducts(product, publicProducts, familyProducts.map((item) => item.sku));
  const applicationFacet = getIndexableApplicationFacet(product.application);
  const interfaceFacet = getIndexableInterfaceFacet(product.iotInterface);
  const guides = getRelevantGuides(product);
  const comparisonProducts = [product, ...familyProducts.filter((item) => item.sku !== product.sku)].slice(0, 4);
  const compareHref = comparisonProducts.length > 1 ? `/compare?products=${comparisonProducts.map((item) => item.slug).join(",")}` : "";
  const hasRelatedGuidance = Boolean(family || applicationFacet || guides.length || compareHref);
  const packageFields = [{ label: "Package dimensions (mm)", value: product.packageDimensionMm }, { label: "Package weight (g)", value: product.packageWeightG }].filter((field) => displayValue(field.value));
  const displayImagePath = getDisplayImagePath(product, image ?? undefined);
  const productSchema: Record<string, unknown> = { "@context": "https://schema.org", "@type": "Product", name, sku: product.sku, description: specification || summary, ...buildProductManufacturer(product.sku), category: applicationLabel || undefined, url: `${siteUrl}/products/${product.slug}`, image: displayImagePath ? `${siteUrl}${displayImagePath}` : undefined, additionalProperty: [{ "@type": "PropertyValue", name: "Application", value: applicationLabel || undefined }, { "@type": "PropertyValue", name: "IoT interface", value: iotInterfaceLabel || undefined }, { "@type": "PropertyValue", name: "Package dimensions (mm)", value: displayValue(product.packageDimensionMm) || undefined }, { "@type": "PropertyValue", name: "Package weight (g)", value: displayValue(product.packageWeightG) || undefined }].filter((property) => property.value) };
  if (publicPrice.schemaAmount !== null) productSchema.offers = buildProductOffer(siteUrl, `${siteUrl}/products/${product.slug}`, publicPrice.schemaAmount);

  return <>
    <ProductViewTracker sku={product.sku} productName={name} slug={product.slug} />
    <StructuredData data={productSchema} />
    <StructuredData data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Products", item: `${siteUrl}/products` }, { "@type": "ListItem", position: 3, name, item: `${siteUrl}/products/${product.slug}` }] }} />
    <section className="product-detail-hero"><div className="shell"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/products">Products</Link><span>/</span><span>{name}</span></nav><div className="product-buy-grid">
      <div className="product-detail-media"><ProductImage sku={name} application={applicationLabel} imagePath={getDisplayImagePath(product, image ?? undefined)} priority sizes="(max-width: 800px) 100vw, 50vw" /></div>
      <div className="product-buy-copy"><h1>{name}</h1>{fullName !== name ? <p className="product-detail-subtext">{fullName}</p> : null}<p className="product-detail-summary">{summary}</p><dl className="quick-facts">{application ? <div><dt>Application</dt><dd>{applicationFacet ? <Link href={`/applications/${applicationFacet.slug}`}>{applicationLabel}</Link> : applicationLabel}</dd></div> : null}{iotInterface ? <div><dt>Connectivity</dt><dd>{interfaceFacet ? <Link href={`/connectivity/${interfaceFacet.slug}`}>{iotInterfaceLabel}</Link> : iotInterfaceLabel}</dd></div> : null}</dl><aside className="price-panel"><span>Price</span><strong>{publicPrice.formatted}</strong><small>South African rand. {publicPrice.vatNotice}</small></aside><div className="buy-actions"><Link href={`/contact?sku=${encodeURIComponent(product.sku)}`} className="button button-primary">Ask about {name} <ArrowIcon /></Link></div></div>
    </div></div></section>
    <section className="section shell product-content-grid"><aside className="product-section-nav"><span>On this page</span><a href="#overview">Overview</a><a href="#specifications">Specifications</a>{answers.functionAnswer ? <a href="#function">What it does</a> : null}{answers.connectivity ? <a href="#connectivity">Connectivity</a> : null}{answers.power ? <a href="#power">Power</a> : null}{answers.sensorOrProbe ? <a href="#sensor-arrangement">Sensor or probe</a> : null}{answers.modelOrVariant ? <a href="#model-variant">Model or variant</a> : null}{answers.suitability ? <a href="#suitability">Where it fits</a> : null}{answers.beforeOrdering.length ? <a href="#buyer-checks">Before ordering</a> : null}{packageFields.length ? <a href="#package">Package</a> : null}{hasRelatedGuidance ? <a href="#related-guidance">Related research</a> : null}</aside><div className="product-sections">
      <section id="overview"><h2>Product overview</h2><dl className="source-facts"><div><dt>SKU</dt><dd>{name}</dd></div><div><dt>Manufacturer</dt><dd>{buildProductManufacturer(product.sku).manufacturer.name}</dd></div></dl></section>
      {specification ? <section id="specifications"><h2>Specifications</h2>{structuredSpecifications.length ? <ul className="specification-list">{structuredSpecifications.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="lead-copy">{specification}</p>}</section> : null}
      {answers.functionAnswer ? <section id="function"><h2>What does it do?</h2><p>{answers.functionAnswer}</p></section> : null}
      {answers.connectivity ? <section id="connectivity"><h2>How does it connect?</h2><p>{answers.connectivity}</p></section> : null}
      {answers.power ? <section id="power"><h2>How is it powered?</h2><p>{answers.power}</p></section> : null}
      {answers.sensorOrProbe ? <section id="sensor-arrangement"><h2>Sensor or probe arrangement</h2><p>{answers.sensorOrProbe}</p></section> : null}
      {answers.modelOrVariant ? <section id="model-variant"><h2>Which model or variant is this?</h2><p>{answers.modelOrVariant}</p></section> : null}
      {answers.suitability ? <section id="suitability"><h2>Where this product fits</h2><p>{answers.suitability}</p></section> : null}
      {answers.beforeOrdering.length ? <section id="buyer-checks"><h2>Before ordering</h2><ul className="check-list">{answers.beforeOrdering.map((check) => <li key={check}>{check}</li>)}</ul></section> : null}
      {packageFields.length ? <section id="package"><h2>Package information</h2><dl className="source-facts">{packageFields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></section> : null}
      {hasRelatedGuidance ? <section id="related-guidance"><h2>Related product research</h2>{familyComparison ? <p className="lead-copy">{familyComparison}</p> : null}<div className="link-cluster">{family ? <Link href={`/families/${family.slug}`}>Other {family.name} variants</Link> : null}{applicationFacet ? <Link href={`/applications/${applicationFacet.slug}`}>Related products for {applicationLabel}</Link> : null}{compareHref ? <Link href={compareHref}>Compare related products</Link> : null}{guides.map((guide) => <Link href={`/guides/${guide.slug}`} key={guide.slug}>{guide.title}</Link>)}</div></section> : null}
    </div></section>
    {related.length ? <section className="section section-tint"><div className="shell"><div className="section-heading split-heading"><div><h2>{family ? `More ${family.name} models` : `More products for ${applicationLabel}`}</h2></div><p>{family ? `Explore other products in the ${family.name} family.` : `Explore other products for ${applicationLabel}.`}</p></div><div className="product-grid featured-grid">{related.map((item) => <ProductCard key={item.slug} product={item} />)}</div></div></section> : null}
  </>;
}
