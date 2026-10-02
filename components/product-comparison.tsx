import Link from "next/link";
import { getPublicPriceForProduct, getVatDisplayNotice } from "@/lib/pricing";
import { displayValue, productApplicationLabel, productConnectivityLabel, productDisplayName } from "@/lib/product-presentation";
import type { DraginoProduct } from "@/lib/catalogue";

export function ProductComparison({ products, caption }: { products: DraginoProduct[]; caption?: string }) {
  const tableCaption = caption ? `${caption} ${getVatDisplayNotice()}` : getVatDisplayNotice();

  return (
    <div className="comparison-wrap" role="region" aria-label="Scrollable product comparison" tabIndex={0}>
      <table className="comparison-table">
        <caption>{tableCaption}</caption>
        <thead><tr><th scope="col">SKU</th><th scope="col">Application</th><th scope="col">IoT interface</th><th scope="col">Specification</th><th scope="col">Package dimensions (mm)</th><th scope="col">Package weight (g)</th><th scope="col">Price in ZAR</th></tr></thead>
        <tbody>{products.map((product) => <tr key={product.sku}>
          <th scope="row"><Link href={`/products/${product.slug}`}>{productDisplayName(product.sku)}</Link></th>
          <td>{productApplicationLabel(product.application)}</td>
          <td>{productConnectivityLabel(product.iotInterface)}</td>
          <td>{displayValue(product.specification)}</td>
          <td>{displayValue(product.packageDimensionMm)}</td>
          <td>{displayValue(product.packageWeightG)}</td>
          <td>{getPublicPriceForProduct(product.sku, product.priceUsd).formatted}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
