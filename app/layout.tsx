import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteUrl } from "@/lib/catalogue";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "LoRaWAN & IoT Solutions | LoRa Network South Africa",
    template: "%s | LoRa Network South Africa",
  },
  description:
    "Browse LoRaWAN and IoT products for South African projects by SKU, application and IoT interface, with public prices in South African rand.",
  applicationName: "LoRa Network South Africa",
  keywords: ["LoRaWAN South Africa", "IoT sensors", "IoT gateways", "NB-IoT", "LTE-M"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "LoRa Network South Africa",
    title: "LoRaWAN & IoT solutions for South Africa",
    description: "Search LoRaWAN and IoT products by SKU, application and IoT interface.",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "LoRaWAN & IoT solutions for South Africa",
    description: "LoRaWAN and IoT hardware for South African projects.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-ZA" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
