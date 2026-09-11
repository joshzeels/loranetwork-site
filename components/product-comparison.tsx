import Link from "next/link";
import { getPublicPrice } from "@/lib/pricing";
import { displayValue } from "@/lib/product-presentation";
import type { DraginoProduct } from "@/lib/catalogue";

export function ProductComparison({ products, caption }: { products: DraginoProduct[]; caption?: string }) {
  return (
    <div className="comparison-wrap">
      <table className="comparison-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead><tr><th>SKU</th><th>Application</th><th>IoT interface</th><th>Specification</th><th>Package dimensions (mm)</th><th>Package weight (g)</th><th>Price in ZAR</th></tr></thead>
        <tbody>{products.map((product) => <tr key={product.sku}>
          <th scope="row"><Link href={`/products/${product.slug}`}>{product.sku}</Link></th>
          <td>{displayValue(product.application)}</td>
          <td>{displayValue(product.iotInterface)}</td>
          <td>{displayValue(product.specification)}</td>
          <td>{displayValue(product.packageDimensionMm)}</td>
          <td>{displayValue(product.packageWeightG)}</td>
          <td>{getPublicPrice(product.priceUsd).formatted}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
