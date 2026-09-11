import Link from "next/link";
import { catalogue } from "@/lib/catalogue";
import { LogoMark } from "@/components/logo-mark";
import { BUSINESS_CONFIG } from "@/config/business";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link href="/" className="brand footer-brand" aria-label="LoRa Network home">
            <LogoMark />
            <span className="brand-copy">
              <strong>LoRa Network</strong>
              <small>South Africa</small>
            </span>
          </Link>
          <p className="footer-summary">
            A searchable South African catalogue of LoRaWAN and IoT hardware, built from supplied product data.
          </p>
        </div>
        <div>
          <h2>Catalogue</h2>
          <Link href="/products">All products</Link>
          <Link href="/applications">Applications</Link>
          <Link href="/connectivity">Connectivity</Link>
          <Link href="/families">Product families</Link>
          <Link href="/guides">Buying guides</Link>
        </div>
        <div>
          <h2>Information</h2>
          <Link href="/about">About this catalogue</Link>
          <Link href="/contact">Prepare an enquiry</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          {BUSINESS_CONFIG.profile.email ? <a href={`mailto:${BUSINESS_CONFIG.profile.email}`}>{BUSINESS_CONFIG.profile.email}</a> : null}
          {BUSINESS_CONFIG.profile.phone ? <a href={`tel:${BUSINESS_CONFIG.profile.phone}`}>{BUSINESS_CONFIG.profile.phone}</a> : null}
          {BUSINESS_CONFIG.profile.address ? <p>{BUSINESS_CONFIG.profile.address}</p> : null}
          <p>{catalogue.source.productCount.toLocaleString("en-ZA")} products indexed</p>
          <p>Public pricing: South African rand</p>
        </div>
      </div>
      <div className="shell footer-base">
        <p>Product fields are reproduced from {catalogue.source.file}. Blank source values remain blank.</p>
        <p>© {new Date().getFullYear()} LoRa Network South Africa</p>
      </div>
    </footer>
  );
}
