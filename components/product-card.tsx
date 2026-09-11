import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { ProductImage } from "@/components/product-image";
import { displayValue, type PublicDraginoProduct } from "@/lib/product-presentation";

export function ProductCard({ product }: { product: PublicDraginoProduct }) {
  const application = displayValue(product.application);
  const iotInterface = displayValue(product.iotInterface);

  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-card-media" aria-label={`View ${product.sku}`}>
        <ProductImage sku={product.sku} application={application} imagePath={product.imagePath} />
      </Link>
      <div className="product-card-topline">
        <span className="product-brand">Product</span>
        {iotInterface ? <span className="interface-pill">{iotInterface}</span> : null}
      </div>
      <div className="product-card-body">
        <p className="eyebrow product-application">{application}</p>
        <h2><Link href={`/products/${product.slug}`}>{product.sku}</Link></h2>
        {application ? <p className="product-summary">{application}</p> : null}
      </div>
      <div className="product-card-footer">
        <div>
          <small>Price</small>
          <strong>{product.formattedPriceZar}</strong>
        </div>
        <Link href={`/products/${product.slug}`} className="card-cta" aria-label={`View ${product.sku}`}>
          View product <ArrowIcon />
        </Link>
      </div>
    </article>
  );
}
