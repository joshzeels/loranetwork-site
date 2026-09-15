import Image from "next/image";
import Link from "next/link";
import { ApplicationIcon, ArrowIcon, SearchIcon } from "@/components/icons";
import { HomeCable, WhySensorCable } from "@/components/home-cable";
import { ProductCard } from "@/components/product-card";
import { StructuredData } from "@/components/structured-data";
import { applicationFacets, catalogue, getSiteUrl, interfaceFacets, publicProducts } from "@/lib/catalogue";
import { buildOrganizationSchema, buildWebsiteSchema } from "@/lib/structured-data";

const featuredApplications = applicationFacets.slice(0, 6);
const featuredInterfaces = interfaceFacets.slice(0, 6);
const representativeProducts = publicProducts.filter((product) => product.imagePath).slice(0, 4);

export default function Home() {
  const siteUrl = getSiteUrl();
  // The single site-level Organization node is declared here, in full, once. Every other page
  // that needs to identify LoRa Network as seller/publisher references its @id instead of
  // redeclaring these fields, so there is one entity, not several conflicting ones.
  const organization = buildOrganizationSchema(siteUrl);
  const website = buildWebsiteSchema(siteUrl);

  return (
    <>
      <StructuredData data={{ "@context": "https://schema.org", "@graph": [organization, website] }} />
      <div className="home-page">
      <HomeCable />
      <section className="hero"><div className="shell hero-inner">
        <div className="hero-copy">
          <h1>LoRaWAN &amp; IoT Solutions for South Africa.</h1>
          <p className="hero-lede">Explore {catalogue.source.productCount.toLocaleString("en-ZA")} sensors, gateways, trackers and connected devices. Compare specifications, connectivity and prices in rand.</p>
          <div className="hero-actions"><Link href="/products#catalogue" className="button button-primary"><SearchIcon /> Search products</Link><Link href="/applications" className="button button-secondary">Browse applications <ArrowIcon /></Link></div>
          <div className="hero-proof"><div><strong>{catalogue.source.productCount}</strong><span>Products</span></div><div><strong>{applicationFacets.length}</strong><span>Applications</span></div><div><strong>{interfaceFacets.length}</strong><span>Connectivity options</span></div></div>
        </div>
        <div className="hero-image-wrap">
          <Image className="hero-image" src="/images/Header.png" alt="Dragino LoRa IoT sensor" width={358} height={815} priority sizes="(max-width: 820px) 70vw, 358px" />
        </div>
      </div></section>
      <section className="section shell">
        <div className="section-heading"><h2>Browse by application</h2></div>
        <div className="browse-grid">{featuredApplications.map((item) => <Link href={`/applications/${item.slug}`} className="browse-card" key={item.slug}><div className="browse-card-top"><span className="application-symbol"><ApplicationIcon application={item.value} /></span><span className="browse-card-count">{item.count} products</span></div><h3>{item.value}</h3><ArrowIcon /></Link>)}</div>
        <div className="section-action"><Link href="/applications" className="text-link">All applications <ArrowIcon /></Link></div>
      </section>
      <section className="section section-tint"><div className="shell">
        <div className="section-heading"><h2>Browse by connectivity</h2></div>
        <div className="interface-grid">{featuredInterfaces.map((item) => <Link href={`/connectivity/${item.slug}`} className="interface-card" key={item.slug}><div><h3>{item.value}</h3><p>{item.count} products</p></div><ArrowIcon /></Link>)}</div>
      </div></section>
      <section className="section shell">
        <div className="section-heading"><h2>Featured products</h2></div>
        <div className="product-grid featured-grid">{representativeProducts.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
      </section>
      <section className="why-section"><div className="shell why-grid">
        <div><h2>How do I choose the right IoT product?</h2></div>
        <div className="why-list"><article><span>01</span><div><h3>Start with your application</h3><p>Browse products for temperature, water, agriculture, tracking and other monitoring needs.</p></div></article><article><span>02</span><div><h3>Compare connectivity</h3><p>Check whether each model uses LoRaWAN, NB-IoT, LTE-M or another connectivity option.</p></div></article><article><span>03</span><div><h3>Check the model and price</h3><p>Compare specifications and prices in rand, then enquire about availability and delivery.</p></div></article></div>
      </div><WhySensorCable /></section>
      <section className="cta-band"><div className="shell cta-inner"><div><h2>Need help choosing?</h2></div><Link href="/contact" className="button button-light">Ask about a product <ArrowIcon /></Link></div></section>
      </div>
    </>
  );
}
