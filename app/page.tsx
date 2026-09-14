import Image from "next/image";
import Link from "next/link";
import { ArrowIcon, SearchIcon } from "@/components/icons";
import { HomeCable } from "@/components/home-cable";
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
      <div className="home-page">
      <HomeCable />
      <section className="hero"><div className="shell hero-inner">
        <div className="hero-copy">
          <h1>LoRaWAN &amp; IoT Solutions for South Africa.</h1>
          <p className="hero-lede">Explore {catalogue.source.productCount.toLocaleString("en-ZA")} sensors, gateways, trackers and connected devices by exact SKU, application or IoT interface, with public pricing in South African rand.</p>
          <div className="hero-actions"><Link href="/products#catalogue" className="button button-primary"><SearchIcon /> Search products</Link><Link href="/applications" className="button button-secondary">Browse applications <ArrowIcon /></Link></div>
          <div className="hero-proof"><div><strong>{catalogue.source.productCount}</strong><span>Products indexed</span></div><div><strong>{applicationFacets.length}</strong><span>Application groups</span></div><div><strong>{interfaceFacets.length}</strong><span>Interface groups</span></div></div>
        </div>
        <div className="hero-image-wrap">
          <Image className="hero-image" src="/images/Header.png" alt="Dragino LoRa IoT sensor" width={358} height={815} priority sizes="(max-width: 820px) 70vw, 358px" />
        </div>
      </div></section>
      <section className="section shell">
        <div className="section-heading"><h2>Browse by application</h2></div>
        <div className="browse-grid">{featuredApplications.map((item) => <Link href={`/applications/${item.slug}`} className="browse-card" key={item.slug}><span>{item.count} products</span><h3>{item.value}</h3><ArrowIcon /></Link>)}</div>
        <div className="section-action"><Link href="/applications" className="text-link">All applications <ArrowIcon /></Link></div>
      </section>
      <section className="section section-tint"><div className="shell">
        <div className="section-heading"><h2>Browse by connectivity</h2></div>
        <div className="interface-grid">{featuredInterfaces.map((item) => <Link href={`/connectivity/${item.slug}`} className="interface-card" key={item.slug}><span className="interface-node" aria-hidden="true" /><div><h3>{item.value}</h3><p>{item.count} products</p></div><ArrowIcon /></Link>)}</div>
      </div></section>
      <section className="section shell">
        <div className="section-heading"><h2>Featured products</h2></div>
        <div className="product-grid featured-grid">{representativeProducts.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
      </section>
      <section className="why-section"><div className="shell why-grid">
        <div><h2>Choose and compare IoT hardware</h2></div>
        <div className="why-list"><article><span>01</span><div><h3>Search by exact SKU</h3><p>Find a known model or explore products by application and connectivity.</p></div></article><article><span>02</span><div><h3>Compare product details</h3><p>Review specifications, interfaces, package information and related models.</p></div></article><article><span>03</span><div><h3>View prices in rand</h3><p>See public ZAR pricing or enquire when a product requires a quotation.</p></div></article></div>
      </div></section>
      <section className="cta-band"><div className="shell cta-inner"><div><h2>Product enquiries</h2></div><Link href="/contact" className="button button-light">Start an enquiry <ArrowIcon /></Link></div></section>
      </div>
    </>
  );
}
