import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { ProductImage } from "@/components/product-image";
import { displayValue, productDisplayName, type PublicDraginoProduct } from "@/lib/product-presentation";

export function ProductCard({ product }: { product: PublicDraginoProduct }) {
  const application = displayValue(product.application);
  const iotInterface = displayValue(product.iotInterface);
  const name = productDisplayName(product.sku);

  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-card-media" aria-label={`View ${name}`}>
        <ProductImage sku={name} application={application} imagePath={product.imagePath} />
      </Link>
      <div className="product-card-topline">
        {iotInterface ? <span className="interface-pill">{iotInterface}</span> : null}
      </div>
      <div className="product-card-body">
        <p className="product-application">{application}</p>
        <h2><Link href={`/products/${product.slug}`}>{name}</Link></h2>
        {product.specification ? <p className="product-summary">{displayValue(product.specification)}</p> : null}
      </div>
      <div className="product-card-footer">
        <div>
          <small>Price</small>
          <strong>{product.formattedPriceZar}</strong>
        </div>
        <Link href={`/products/${product.slug}`} className="card-cta" aria-label={`View ${name}`}>
          View product <ArrowIcon />
        </Link>
      </div>
    </article>
  );
}
