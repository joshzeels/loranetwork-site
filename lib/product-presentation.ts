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

const exactDisplayCorrections = new Map<string, string>([
  ["emperature & humidity sensor", "Temperature & Humidity Sensor"],
  ["uvc radation sensor", "UVC Radiation Sensor"],
  ["lte cat-1", "LTE CAT 1"],
  ["nb-iot & lte-m", "LTE-M & NB-IoT"],
  ["nb-iot&lte-m", "LTE-M & NB-IoT"],
  ["lte-m&nb-lot(nrf9151)", "LTE-M & NB-IoT (NRF9151)"],
]);

export function displayValue(value: string) {
  const cleaned = value
    .replace(/Â(?=\u00a0|\s|$)/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return exactDisplayCorrections.get(cleaned.toLocaleLowerCase("en-ZA")) ?? cleaned;
}

export function productDisplayName(sku: string) {
  return displayValue(sku);
}

export function productSummary(product: Pick<PublicDraginoProduct, "sku" | "application" | "iotInterface">) {
  const name = productDisplayName(product.sku);
  const application = displayValue(product.application);
  const iotInterface = displayValue(product.iotInterface);
  if (application && iotInterface) return `${name} is a Dragino product listed for ${application}. Its catalogue interface is ${iotInterface}.`;
  if (application) return `${name} is a Dragino product listed for ${application}.`;
  if (iotInterface) return `${name} is a Dragino product with ${iotInterface} recorded as its catalogue interface.`;
  return `${name} is a Dragino IoT product.`;
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
