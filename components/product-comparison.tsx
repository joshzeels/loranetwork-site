import Link from "next/link";
import { getPublicPriceForProduct, getVatDisplayNotice } from "@/lib/pricing";
import { productDisplayName } from "@/lib/product-presentation";
import { buildComparisonFields } from "@/lib/product-answers";
import type { DraginoProduct } from "@/lib/catalogue";

export function ProductComparison({ products, caption }: { products: DraginoProduct[]; caption?: string }) {
  const tableCaption = caption ? `${caption} ${getVatDisplayNotice()}` : getVatDisplayNotice();
  const comparisonFields = buildComparisonFields(products);

  return (
    <div className="comparison-wrap" role="region" aria-label="Scrollable product comparison" tabIndex={0}>
      <table className="comparison-table">
        <caption>{tableCaption}</caption>
        <thead><tr><th scope="col">Compare</th>{products.map((product) => <th scope="col" key={product.sku}><Link href={`/products/${product.slug}`}>{productDisplayName(product.sku)}</Link></th>)}</tr></thead>
        <tbody>{comparisonFields.map((field) => <tr key={field.label}><th scope="row">{field.label}</th>{field.values.map((value, index) => <td key={`${field.label}-${products[index]?.sku}`}>{value || "Not stated"}</td>)}</tr>)}
          <tr><th scope="row">Price</th>{products.map((product) => <td key={product.sku}>{getPublicPriceForProduct(product.sku, product.priceUsd).formatted}</td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}
