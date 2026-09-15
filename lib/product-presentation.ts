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

export function productApplicationLabel(value: string) {
  const application = displayValue(value);
  if (/^gateway\s*--\s*lorawan$/i.test(application)) return "LoRaWAN gateway";
  if (/^generic node\s*\/\s*rs485$/i.test(application)) return "Generic node and RS485";

  return application
    .replace(/\s*--\s*/g, ": ")
    .replace(/\s*\/\s*/g, " and ")
    .replace(/\bDetect\b/g, "Detection");
}

export function productConnectivityLabel(value: string) {
  return displayValue(value)
    .replace(/,\s*10 years 500MB data/i, ", 10 years / 500MB data")
    .replace(/,\s*For\s+/i, " for ");
}

function withIndefiniteArticle(value: string) {
  return `${/^[aeiou]/i.test(value) ? "an" : "a"} ${value}`;
}

export function productDefinition(product: Pick<PublicDraginoProduct, "sku" | "application" | "iotInterface">) {
  const name = productDisplayName(product.sku);
  const application = displayValue(product.application);
  const iotInterface = productConnectivityLabel(product.iotInterface);
  const applicationLabel = productApplicationLabel(application);

  const connection = iotInterface ? ` Connectivity is via ${iotInterface}.` : "";
  if (/gateway/i.test(application)) return `${name} is ${/lorawan/i.test(application) ? "a LoRaWAN" : "a"} gateway.${connection}`;
  if (/tracker/i.test(application)) return `${name} is an IoT tracker.${connection}`;
  if (/\bsensor\s+(and|\/)\s*/i.test(applicationLabel)) return `${name} supports ${applicationLabel.toLocaleLowerCase("en-ZA")} projects.${connection}`;
  if (/sensor/i.test(application)) {
    const deviceType = applicationLabel.toLocaleLowerCase("en-ZA");
    return `${name} is ${withIndefiniteArticle(deviceType)}.${connection}`;
  }
  if (/generic node|rs485/i.test(application)) return `${name} is an IoT node for RS485 projects.${connection}`;
  if (application) return `${name} supports ${applicationLabel.toLocaleLowerCase("en-ZA")} projects.${connection}`;
  if (iotInterface) return `${name} is an IoT product using ${iotInterface} connectivity.`;
  return `${name} is an IoT product.`;
}

export function productFit(product: Pick<PublicDraginoProduct, "sku" | "application" | "iotInterface">) {
  const name = productDisplayName(product.sku);
  const application = displayValue(product.application);
  const iotInterface = productConnectivityLabel(product.iotInterface);
  const applicationLabel = productApplicationLabel(application).toLocaleLowerCase("en-ZA");
  let fit = `${name} is suited to projects that need an IoT product`;

  if (/gateway/i.test(application)) fit = `${name} is suited to projects that need ${/lorawan/i.test(application) ? "a LoRaWAN" : "a"} gateway`;
  else if (/tracker/i.test(application)) fit = `${name} is suited to projects that need IoT tracking`;
  else if (/sensor/i.test(application)) fit = `${name} is suited to projects that need ${withIndefiniteArticle(applicationLabel)}`;
  else if (/generic node|rs485/i.test(application)) fit = `${name} is suited to RS485 projects that need an IoT node`;
  else if (application) fit = `${name} is suited to ${applicationLabel} projects`;

  return `${fit}.${iotInterface ? ` Connectivity is via ${iotInterface}.` : ""} Before ordering, check the specification alongside your power, installation and compatibility requirements.`;
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
