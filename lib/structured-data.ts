// Pure JSON-LD entity builders, deliberately kept free of "server-only" and data imports so they
// stay unit-testable with the plain node:test runner. lib/catalogue.ts wraps these with the
// configured site URL for use in pages.
//
// There is exactly one Organization node for the whole site (@id = `${siteUrl}/#organization`),
// declared in full on the homepage. Other pages reference that same @id (e.g. as an Offer
// seller) instead of redeclaring Organization fields, so there is one entity, not several
// possibly-conflicting ones.

export function organizationId(siteUrl: string) {
  return `${siteUrl}/#organization`;
}

export function buildOrganizationSchema(siteUrl: string) {
  return {
    "@type": "Organization",
    "@id": organizationId(siteUrl),
    name: "LoRa Network",
    url: siteUrl,
    areaServed: "South Africa",
    description: "LoRa Network is a South African reseller and online catalogue for LoRaWAN and IoT hardware, including products manufactured by Dragino.",
  };
}

export function buildWebsiteSchema(siteUrl: string) {
  return {
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: "LoRa Network South Africa",
    url: siteUrl,
    inLanguage: "en-ZA",
    description: "LoRaWAN and IoT hardware for South African projects. Compare products and prices in rand.",
    publisher: { "@id": organizationId(siteUrl) },
  };
}

// Most of the catalogue is Dragino hardware, but a handful of SKUs (e.g. MikroTik LoRa
// antennas/gateways) come from other manufacturers. Kept as an explicit lookup rather than
// inferring from the SKU shape, so a new non-Dragino SKU must be added here deliberately.
const manufacturerBySku: Record<string, string> = {
  "TOF-0809-7V-S1": "MikroTik",
  "RBwAPR-2nD&R11e-LR8": "MikroTik",
};

// The manufacturer identified for a catalogue product, defaulting to Dragino. Extracted as its
// own pure function so this fact stays independently regression-tested without rendering a
// product page.
export function buildProductManufacturer(sku?: string) {
  const name = (sku && manufacturerBySku[sku]) || "Dragino";
  return {
    brand: { "@type": "Brand", name },
    manufacturer: { "@type": "Organization", name },
  };
}

// A priced product's Offer. seller references the site Organization by @id rather than
// redeclaring it, matching buildWebsiteSchema's publisher reference above.
export function buildProductOffer(siteUrl: string, productUrl: string, priceZar: string) {
  return {
    "@type": "Offer",
    priceCurrency: "ZAR",
    price: priceZar,
    url: productUrl,
    seller: { "@id": organizationId(siteUrl) },
  };
}
