import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "About LoRa Network South Africa",
  description: "Learn how LoRa Network helps South African customers find and compare LoRaWAN and IoT hardware.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section className="page-hero about-hero">
        <div className="shell page-hero-grid">
          <div><h1>About LoRa Network</h1></div>
          <div className="page-hero-aside"><p>We help South African customers find and compare LoRaWAN and IoT hardware for sensing, monitoring, tracking and connected projects.</p></div>
        </div>
      </section>

      <section className="section shell editorial-grid">
        <div><h2>What can I find here?</h2></div>
        <div className="editorial-copy">
          <p>LoRa Network is the reseller and website brand. Dragino is the manufacturer identified for the products in this catalogue.</p>
          <p>Browse sensors, gateways, trackers, nodes and accessories in one searchable product range.</p>
          <p>Each product page brings together its SKU, application, specification, connectivity, price and available package information so you can compare models more easily.</p>
        </div>
      </section>

      <section className="principles-section">
        <div className="shell">
          <div className="section-heading"><h2>How do I choose a product?</h2></div>
          <div className="principles-grid">
            <article><span>01</span><h3>Search your way</h3><p>Look up a known SKU or browse by application, connectivity or product family.</p></article>
            <article><span>02</span><h3>Compare models</h3><p>Review specifications and prices side by side before narrowing your choice.</p></article>
            <article><span>03</span><h3>Ask before ordering</h3><p>Send us the product SKU, quantity and project details so availability and delivery can be confirmed.</p></article>
          </div>
        </div>
      </section>

      <section className="section shell source-field-section">
        <div className="section-heading split-heading">
          <div><h2>Ready to find a product?</h2></div>
          <p>Start with the full range or contact us if you already know what your project needs.</p>
        </div>
        <div className="hero-actions">
          <Link href="/products" className="button button-dark">Browse products <ArrowIcon /></Link>
          <Link href="/contact" className="button button-outline">Contact us <ArrowIcon /></Link>
        </div>
      </section>
    </>
  );
}
