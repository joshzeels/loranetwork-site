export type PublicDraginoProduct = {
  sourceRow: number;
  slug: string;
  sku: string;
  application: string;
  specification: string;
  iotInterface: string;
  formattedPriceZar: string;
  imagePath: string;
};

export function displayValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function facetValue(value: string) {
  return displayValue(value).toLocaleLowerCase("en-ZA");
}

export function facetSlug(value: string) {
  return displayValue(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-ZA")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
