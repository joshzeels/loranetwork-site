import Image from "next/image";
import { NoImageIcon } from "@/components/icons";

type ProductImageProps = {
  sku: string;
  application: string;
  imagePath: string;
  priority?: boolean;
  sizes?: string;
};

function displayImagePath(sku: string, imagePath: string) {
  if (imagePath !== "/images/products/_official/867a7fb03d7f1e8f.png") return imagePath;
  if (/^PS-(?:NB|NS)-/i.test(sku)) return /-Ixx/i.test(sku) ? "/images/products/_official/ps-nb-immersion.png" : "/images/products/_official/ps-nb-single.png";
  return /-Ixx/i.test(sku) ? "/images/products/_official/ps-cb-immersion.png" : "/images/products/_official/ps-cb-single.png";
}

export function ProductImage({ sku, application, imagePath, priority = false, sizes = "(max-width: 700px) 100vw, 33vw" }: ProductImageProps) {
  if (!imagePath) return (
    <div className="product-no-image" role="img" aria-label={`No product image available for ${sku}`}>
      <NoImageIcon className="no-image-icon" />
      <strong>{sku}</strong>
      <span>Image unavailable</span>
    </div>
  );

  imagePath = displayImagePath(sku, imagePath);

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
