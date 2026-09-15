import Link from "next/link";
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
            LoRaWAN and IoT hardware for South African projects.
          </p>
        </div>
        <div>
          <h2>Shop</h2>
          <Link href="/products">Products</Link>
          <Link href="/applications">Shop by application</Link>
          <Link href="/connectivity">Shop by connectivity</Link>
          <Link href="/families">Compare models</Link>
          <Link href="/guides">Buying advice</Link>
        </div>
        <div>
          <h2>Help</h2>
          <Link href="/about">About us</Link>
          <Link href="/contact">Contact us</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          {BUSINESS_CONFIG.profile.email ? <a href={`mailto:${BUSINESS_CONFIG.profile.email}`}>{BUSINESS_CONFIG.profile.email}</a> : null}
          {BUSINESS_CONFIG.profile.phone ? <a href={`tel:${BUSINESS_CONFIG.profile.phone}`}>{BUSINESS_CONFIG.profile.phone}</a> : null}
          {BUSINESS_CONFIG.profile.address ? <p>{BUSINESS_CONFIG.profile.address}</p> : null}
        </div>
      </div>
      <div className="shell footer-base">
        <p>Browse, compare and enquire online.</p>
        <p>© {new Date().getFullYear()} LoRa Network South Africa</p>
      </div>
    </footer>
  );
}
