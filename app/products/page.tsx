import type { Metadata } from "next";
import { ProductCatalogue } from "@/components/product-catalogue";
import { StructuredData } from "@/components/structured-data";
import { applicationOptions, catalogue, getSiteUrl, interfaceOptions, products, publicProducts } from "@/lib/catalogue";
import { getVatDisplayNotice } from "@/lib/pricing";
import { productDisplayName } from "@/lib/product-presentation";

export const metadata: Metadata = {
  title: "LoRaWAN & IoT Product Catalogue",
  description: `Search ${catalogue.source.productCount} products by SKU, application, specification and IoT interface, with public pricing in South African rand.`,
  alternates: { canonical: "/products" },
  openGraph: {
    title: "LoRaWAN & IoT Product Catalogue",
    description: "Search IoT hardware for South African projects by SKU, application, specification and interface.",
    url: "/products",
  },
};

export default function ProductsPage() {
  const siteUrl = getSiteUrl();

  return (
    <>
      <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "LoRaWAN & IoT Product Catalogue",
        description: "LoRaWAN and IoT products available from LoRa Network South Africa.",
        url: `${siteUrl}/products`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: products.length,
          itemListElement: products.slice(0, 50).map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: productDisplayName(product.sku),
            url: `${siteUrl}/products/${product.slug}`,
          })),
        },
      }} />

      <section className="page-hero catalogue-hero">
        <div className="shell page-hero-grid">
          <div>
            <h1>IoT product catalogue</h1>
          </div>
          <div className="page-hero-aside">
            <p>Search by SKU, application, specification or IoT interface.</p>
            <dl>
              <div><dt>Products</dt><dd>{products.length}</dd></div>
              <div><dt>Currency</dt><dd>ZAR</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="catalogue-section shell">
        <ProductCatalogue
          products={publicProducts}
          applications={applicationOptions}
          interfaces={interfaceOptions}
          priceNotice={getVatDisplayNotice()}
        />
      </section>
    </>
  );
}
