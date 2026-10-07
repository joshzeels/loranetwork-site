import "server-only";
import { products } from "@/lib/catalogue";
import { productApplicationLabel, productConnectivityLabel, productDisplayName, productFullName } from "@/lib/product-presentation";
import type { EnquiryProductOption } from "./product-options";
import { productSkuFromSelection } from "./product-options";

function publicProductName(product: (typeof products)[number]) {
  const displayName = productDisplayName(product.sku);
  const fullName = productFullName(product.sku);
  if (fullName !== displayName) return fullName;
  const descriptors = [productConnectivityLabel(product.iotInterface), productApplicationLabel(product.application)]
    .filter((value, index, values) => value && values.indexOf(value) === index);
  return descriptors.join(" ") || displayName;
}

export const enquiryProductOptions: readonly EnquiryProductOption[] = products.map((product) => ({
  sku: product.sku,
  name: publicProductName(product),
}));

export function findEnquiryProduct(value: string) {
  const sku = productSkuFromSelection(value);
  return enquiryProductOptions.find((product) => product.sku.toLocaleLowerCase("en-ZA") === sku.toLocaleLowerCase("en-ZA"));
}
