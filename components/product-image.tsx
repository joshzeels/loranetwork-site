import Image from "next/image";

type ProductImageProps = {
  sku: string;
  application: string;
  imagePath: string;
  priority?: boolean;
  sizes?: string;
};

export function ProductImage({ sku, application, imagePath, priority = false, sizes = "(max-width: 700px) 100vw, 33vw" }: ProductImageProps) {
  if (!imagePath) {
    return (
      <div className="product-placeholder" role="img" aria-label={`No official product image available for ${sku}`}>
        <span className="placeholder-mark" aria-hidden="true"><i /><i /><i /></span>
        <span>No official image available</span>
      </div>
    );
  }

  return (
    <Image
      src={imagePath}
      alt={`${sku}${application ? ` — ${application}` : ""}`}
      fill
      priority={priority}
      sizes={sizes}
      className="product-image"
    />
  );
}
