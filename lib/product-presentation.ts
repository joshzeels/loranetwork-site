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
    .replace(/\u00c2(?=\u00a0|\s|$)/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return exactDisplayCorrections.get(cleaned.toLocaleLowerCase("en-ZA")) ?? cleaned;
}

export function productDisplayName(sku: string) {
  return displayValue(sku);
}

export function productDefinition(product: Pick<PublicDraginoProduct, "sku" | "application" | "iotInterface">) {
  const name = productDisplayName(product.sku);
  const application = displayValue(product.application);
  const iotInterface = displayValue(product.iotInterface);

  const connection = iotInterface ? ` It uses ${iotInterface} connectivity.` : "";
  if (/gateway/i.test(application)) return `${name} is listed as a LoRaWAN gateway.${connection}`;
  if (/tracker/i.test(application)) return `${name} is listed as an IoT tracker.${connection}`;
  if (/sensor/i.test(application)) {
    const deviceType = application.toLocaleLowerCase("en-ZA");
    const article = /^[aeiou]/.test(deviceType) ? "an" : "a";
    return `${name} is listed as ${article} ${deviceType}.${connection}`;
  }
  if (/generic node|rs485/i.test(application)) return `${name} is an IoT device in the catalogue's ${application} group.${connection}`;
  if (application) return `${name} is listed for ${application}.${connection}`;
  if (iotInterface) return `${name} is an IoT product with ${iotInterface} listed as its connectivity.`;
  return `${name} is an IoT product in the catalogue.`;
}

export function productSummary(product: Pick<PublicDraginoProduct, "sku" | "application" | "iotInterface">) {
  return productDefinition(product);
}

export function specificationItems(value: string) {
  const specification = displayValue(value);
  if (!specification.includes(",")) return [];

  const items = specification.split(",").map(displayValue).filter(Boolean);
  if (items.length < 2 || items.some((item) => item.length < 2)) return [];
  return items;
}

export function sentenceAwareDescription(parts: string[], maximumLength = 155) {
  const value = parts.map(displayValue).filter(Boolean).join(" ");
  if (value.length <= maximumLength) return value;

  const available = value.slice(0, maximumLength - 1);
  const sentenceEnd = Math.max(available.lastIndexOf(". "), available.lastIndexOf("; "));
  if (sentenceEnd >= Math.floor(maximumLength * 0.55)) return `${available.slice(0, sentenceEnd + 1).trim()}`;

  const wordEnd = available.lastIndexOf(" ");
  return `${available.slice(0, wordEnd > 0 ? wordEnd : available.length).replace(/[,:;]$/, "").trim()}.`;
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

export type FamilyOverlapSummary = { slug: string; name: string; matched: number; total: number };

// How much of each product family actually falls inside one facet's product set (e.g. an
// application page). Pure counting only — SKU-to-family matching stays in lib/discovery.ts;
// this just summarises already-resolved member SKUs, so it can be unit-tested without importing
// the server-only catalogue/discovery modules.
export function summariseFamilyOverlap(families: { slug: string; name: string; memberSkus: string[] }[], facetSkus: Iterable<string>): FamilyOverlapSummary[] {
  const facetSkuSet = facetSkus instanceof Set ? facetSkus : new Set(facetSkus);
  return families.map((family) => ({
    slug: family.slug,
    name: family.name,
    matched: family.memberSkus.filter((sku) => facetSkuSet.has(sku)).length,
    total: family.memberSkus.length,
  }));
}
