import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { catalogue } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "About the Catalogue",
  description: "How LoRa Network South Africa handles the supplied Dragino product data, pricing and blank source fields.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section className="page-hero about-hero">
        <div className="shell page-hero-grid">
          <div><h1>About LoRa Network</h1></div>
          <div className="page-hero-aside"><p>LoRa Network supplies IoT hardware for monitoring, tracking, sensing and connected-device applications in South Africa.</p></div>
        </div>
      </section>

      <section className="section shell editorial-grid">
        <div>
          <h2>{catalogue.source.file}</h2>
        </div>
        <div className="editorial-copy">
          <p>The “{catalogue.source.worksheet}” worksheet supplies the product records used across this website.</p>
          <p>Each record retains the source SKU and fields for application, specification, IoT interface, product URL, package dimensions and package weight. Source pricing stays internal.</p>
        </div>
      </section>

      <section className="principles-section">
        <div className="shell">
          <div className="section-heading"><h2>Catalogue publishing standards</h2></div>
          <div className="principles-grid">
            <article><span>01</span><h3>Use exact source fields</h3><p>Product facts are presented from the workbook, without adding unsupported claims.</p></article>
            <article><span>02</span><h3>Keep missing data empty</h3><p>Blank source cells remain blank and are identified as such on product pages.</p></article>
            <article><span>03</span><h3>One public price</h3><p>Customer-facing prices are calculated centrally and displayed only in South African rand.</p></article>
          </div>
        </div>
      </section>

      <section className="section shell source-field-section">
        <div className="section-heading split-heading">
          <div><h2>Catalogue fields</h2></div>
          <p>Search operates only on supplied product information.</p>
        </div>
        <div className="field-cloud">
          {["SKU", "Application", "Specification", "IoT Interface", "Price (ZAR)", "Product URL", "Package Dimension (mm)", "Package Weight (g)"].map((field) => <span key={field}>{field}</span>)}
        </div>
        <Link href="/products" className="button button-dark">Explore the catalogue <ArrowIcon /></Link>
      </section>
    </>
  );
}
