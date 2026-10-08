import type { Metadata } from "next";
import { EnquiryBuilder } from "@/components/enquiry-builder";
import { TrackedContactLink } from "@/components/analytics-trackers";
import { enquiryProductOptions, findEnquiryProduct } from "@/lib/enquiries/catalogue";
import { BUSINESS_CONFIG } from "@/config/business";
export const metadata: Metadata = { title: "Product Enquiries", description: "Prepare a product or pricing enquiry for LoRa Network South Africa.", alternates: { canonical: "/contact" } };
export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const query = await searchParams;
  const requestedSku = typeof query.sku === "string" ? query.sku : "";
  const sku = findEnquiryProduct(requestedSku)?.sku ?? "";
  const { email, phone, address } = BUSINESS_CONFIG.profile;
  const hasDirectContact = Boolean(email || phone || address);
  return <>
    <section className="page-hero"><div className="shell page-hero-grid"><div><h1>How can we help?</h1></div><div className="page-hero-aside"><p>Ask about a product, price or project. Select the relevant product or SKU.</p></div></div></section>
    <section className="section shell"><EnquiryBuilder initialSku={sku} products={enquiryProductOptions} /></section>
    {hasDirectContact ? <section className="section shell"><aside className="evidence-note"><strong>Prefer to contact us directly?</strong>{email ? <p><TrackedContactLink href={`mailto:${email}`} kind="email">{email}</TrackedContactLink></p> : null}{phone ? <p><TrackedContactLink href={`tel:${phone}`} kind="phone">{phone}</TrackedContactLink></p> : null}{address ? <p>{address}</p> : null}</aside></section> : null}
  </>;
}
