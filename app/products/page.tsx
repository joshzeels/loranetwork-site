import type { Metadata } from "next";
import { ProductCatalogue } from "@/components/product-catalogue";
import { StructuredData } from "@/components/structured-data";
import { applicationOptions, catalogue, getSiteUrl, interfaceOptions, products, publicProducts } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "LoRaWAN & IoT Product Catalogue",
  description: `Search ${catalogue.source.productCount} products by SKU, application, specification and IoT interface, with public pricing in South African rand.`,
  alternates: { canonical: "/products" },
  openGraph: {
    title: "LoRaWAN & IoT Product Catalogue",
    description: "Search IoT hardware for South African projects using the supplied catalogue data.",
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
        description: "Products listed from the supplied product workbook.",
        url: `${siteUrl}/products`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: products.length,
          itemListElement: products.slice(0, 50).map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: product.sku,
            url: `${siteUrl}/products/${product.slug}`,
          })),
        },
      }} />

      <section className="page-hero catalogue-hero">
        <div className="shell page-hero-grid">
          <div>
            <p className="eyebrow"><span /> Product catalogue</p>
            <h1>Find the right<br /><em>starting point.</em></h1>
          </div>
          <div className="page-hero-aside">
            <p>Search exact source data across SKU, application, specification and IoT interface.</p>
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
        />
      </section>
    </>
  );
}
