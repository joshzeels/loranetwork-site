import Image from "next/image";
import { NoImageIcon } from "@/components/icons";

type ProductImageProps = {
  sku: string;
  application: string;
  imagePath: string;
  priority?: boolean;
  sizes?: string;
};

export function ProductImage({ sku, application, imagePath, priority = false, sizes = "(max-width: 700px) 100vw, 33vw" }: ProductImageProps) {
  if (!imagePath) return (
    <div className="product-no-image" role="img" aria-label={`No product image available for ${sku}`}>
      <NoImageIcon className="no-image-icon" />
      <strong>{sku}</strong>
      <span>Image unavailable</span>
    </div>
  );

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
