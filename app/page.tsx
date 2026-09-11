import Link from "next/link";
import { ArrowIcon, SearchIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { StructuredData } from "@/components/structured-data";
import { applicationFacets, catalogue, interfaceFacets, publicProducts } from "@/lib/catalogue";

const featuredApplications = applicationFacets.slice(0, 6);
const featuredInterfaces = interfaceFacets.slice(0, 6);
const representativeProducts = publicProducts.filter((product) => product.imagePath).slice(0, 4);

export default function Home() {
  return (
    <>
      <StructuredData data={{ "@context": "https://schema.org", "@type": "WebSite", name: "LoRa Network South Africa", inLanguage: "en-ZA", description: "A South African catalogue of LoRaWAN and IoT products with ZAR pricing." }} />
      <section className="hero"><div className="shell hero-inner">
        <div className="hero-copy">
          <p className="eyebrow">LoRa Network · South Africa</p>
          <h1>LoRaWAN &amp; IoT Solutions for South Africa.</h1>
          <p className="hero-lede">Explore {catalogue.source.productCount.toLocaleString("en-ZA")} sensors, gateways, trackers and connected devices by exact SKU, application or IoT interface, with public pricing in South African rand.</p>
          <div className="hero-actions"><Link href="/products#catalogue" className="button button-primary"><SearchIcon /> Search products</Link><Link href="/applications" className="button button-secondary">Browse applications <ArrowIcon /></Link></div>
          <div className="hero-proof"><div><strong>{catalogue.source.productCount}</strong><span>Products indexed</span></div><div><strong>{applicationFacets.length}</strong><span>Application groups</span></div><div><strong>{interfaceFacets.length}</strong><span>Interface groups</span></div></div>
        </div>
        <div className="hero-product-stack" aria-label="Representative catalogue products">{representativeProducts.slice(0, 3).map((product, index) => <div className={`hero-product hero-product-${index + 1}`} key={product.sku}><ProductCard product={product} /></div>)}</div>
      </div></section>
      <section className="trust-strip"><div className="shell trust-strip-inner"><span>Exact source SKUs</span><span>Official matched imagery</span><span>ZAR public pricing</span><span>Blank fields preserved</span></div></section>
      <section className="section shell">
        <div className="section-heading split-heading"><div><p className="eyebrow">Browse by application</p><h2>Start with the job at hand.</h2></div><p>Group names and counts come directly from the supplied product catalogue.</p></div>
        <div className="browse-grid">{featuredApplications.map((item) => <Link href={`/applications/${item.slug}`} className="browse-card" key={item.slug}><span>{item.count} products</span><h3>{item.value}</h3><ArrowIcon /></Link>)}</div>
        <div className="section-action"><Link href="/applications" className="text-link">All applications <ArrowIcon /></Link></div>
      </section>
      <section className="section section-tint"><div className="shell">
        <div className="section-heading split-heading"><div><p className="eyebrow">Connectivity &amp; IoT interfaces</p><h2>Browse by the listed interface.</h2></div><p>Every label is reproduced from the workbook; no compatibility is inferred.</p></div>
        <div className="interface-grid">{featuredInterfaces.map((item) => <Link href={`/connectivity/${item.slug}`} className="interface-card" key={item.slug}><span className="interface-node" aria-hidden="true" /><div><h3>{item.value}</h3><p>{item.count} products</p></div><ArrowIcon /></Link>)}</div>
      </div></section>
      <section className="section shell">
        <div className="section-heading split-heading"><div><p className="eyebrow">Representative products</p><h2>Explore the catalogue.</h2></div><p>Products shown here use imagery that passed the catalogue&apos;s product-match review.</p></div>
        <div className="product-grid featured-grid">{representativeProducts.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
      </section>
      <section className="why-section"><div className="shell why-grid">
        <div><p className="eyebrow">Why use this catalogue</p><h2>Commercial clarity without invented claims.</h2></div>
        <div className="why-list"><article><span>01</span><div><h3>Source-led product facts</h3><p>SKUs, applications, specifications and interfaces remain tied to the supplied workbook.</p></div></article><article><span>02</span><div><h3>Consistent ZAR pricing</h3><p>Customer-facing catalogue prices use the verified central pricing calculation.</p></div></article><article><span>03</span><div><h3>Traceable product imagery</h3><p>Images are shown only after a documented exact-SKU or confirmed-family match.</p></div></article></div>
      </div></section>
      <section className="cta-band"><div className="shell cta-inner"><div><p className="eyebrow">Need a specific SKU?</p><h2>Prepare a product enquiry.</h2></div><Link href="/contact" className="button button-light">Start an enquiry <ArrowIcon /></Link></div></section>
    </>
  );
}
