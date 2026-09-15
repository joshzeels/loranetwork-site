import type { Metadata } from "next";
import { EnquiryBuilder } from "@/components/enquiry-builder";
import { products } from "@/lib/catalogue";
import { BUSINESS_CONFIG } from "@/config/business";
export const metadata: Metadata = { title: "Product Enquiries", description: "Prepare a product or pricing enquiry for LoRa Network South Africa.", alternates: { canonical: "/contact" } };
export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const query = await searchParams;
  const requestedSku = typeof query.sku === "string" ? query.sku : "";
  const sku = products.find((product) => product.sku.toLocaleLowerCase("en-ZA") === requestedSku.toLocaleLowerCase("en-ZA"))?.sku ?? "";
  const { email, phone, address } = BUSINESS_CONFIG.profile;
  const hasDirectContact = Boolean(email || phone || address);
  return <>
    <section className="page-hero"><div className="shell page-hero-grid"><div><h1>How can we help?</h1></div><div className="page-hero-aside"><p>Ask about a product, price or project. Include the SKU and quantity when you know them.</p></div></div></section>
    <section className="section shell"><EnquiryBuilder initialSku={sku} /></section>
    {hasDirectContact ? <section className="section shell"><aside className="evidence-note"><strong>Prefer to contact us directly?</strong>{email ? <p><a href={`mailto:${email}`}>{email}</a></p> : null}{phone ? <p><a href={`tel:${phone}`}>{phone}</a></p> : null}{address ? <p>{address}</p> : null}</aside></section> : null}
  </>;
}
