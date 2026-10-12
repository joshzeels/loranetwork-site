import { displayValue, productApplicationLabel, productConnectivityLabel, productDefinition, productDisplayName, specificationItems } from "./product-presentation.ts";

export type AnswerProduct = {
  sku: string;
  application: string;
  specification: string;
  iotInterface: string;
  priceUsd?: string;
};

export type AnswerGuidance = {
  definition?: string;
  uses?: string;
  suitability?: string;
  buyerChecks?: string[];
  evidenceLevel?: "EXACT_PRODUCT_SOURCE" | "FAMILY_SOURCE";
};

export type AnswerDocumentationStatus = "EXACT_PRODUCT_SOURCE" | "FAMILY_SOURCE" | "NO_VERIFIED_SOURCE" | "AMBIGUOUS";
export type AnswerEvidenceClass = "EXACT" | "FAMILY" | "CATALOGUE_ONLY" | "AMBIGUOUS" | "UNVERIFIED";

export type ProductAnswers = {
  opening: string;
  functionAnswer?: string;
  suitability?: string;
  connectivity?: string;
  power?: string;
  sensorOrProbe?: string;
  beforeOrdering: string[];
  isAccessory: boolean;
  evidenceClass: AnswerEvidenceClass;
};

const evidenceTerms = /source|documentation|manufacturer|according to|verified|official|datasheet|manual/i;

function unique(values: string[]) {
  return [...new Set(values.map(displayValue).filter(Boolean))];
}

function explicitPower(specification: string) {
  const matches = specificationItems(specification).filter((item) => /\b(?:\d+\s*mAh|solar(?:\s+panel|\s+powered)?|li-?ion|li-?soci2|rechargeable|battery|external\s+\d+\s*(?:~|-)\s*\d*\s*v|charging)\b/i.test(item));
  return unique(matches).slice(0, 2);
}

function explicitSensorOrProbe(specification: string) {
  const matches = specificationItems(specification).filter((item) => /(?:probe|sensor|ultrasonic|accelerometer|SHT\d+|DS18B20|BME\d+)/i.test(item));
  return unique(matches).slice(0, 2);
}

function isAccessoryProduct(product: AnswerProduct) {
  const classification = `${product.application} ${product.iotInterface} ${product.sku}`;
  const specification = displayValue(product.specification);
  return /\b(?:accessor|cable|antenna|battery|enclosure|fixture|clamp|extension|kit)\b/i.test(classification)
    || /\b(?:probe|cable|antenna|battery|enclosure|fixture|clamp|extension)\s+(?:for|only)\b|program module/i.test(specification);
}

function explicitFunction(product: AnswerProduct) {
  const application = productApplicationLabel(product.application);
  if (!application || isAccessoryProduct(product)) return undefined;
  const name = productDisplayName(product.sku);
  if (/gateway/i.test(application)) return `${name} provides a LoRaWAN gateway function.`;
  if (/tracker/i.test(application)) return `${name} supports IoT tracking.`;
  if (/rs485/i.test(application)) return `${name} connects RS485 devices to an IoT network.`;
  if (/node/i.test(application)) return `${name} provides the ${application.toLocaleLowerCase("en-ZA")} function stated for this model.`;
  return `${name} supports ${application.toLocaleLowerCase("en-ZA")} applications.`;
}

function safeGuidance(value: string | undefined) {
  return value && !evidenceTerms.test(value) ? displayValue(value) : undefined;
}

function evidenceClass(status: AnswerDocumentationStatus | undefined): AnswerEvidenceClass {
  if (status === "EXACT_PRODUCT_SOURCE") return "EXACT";
  if (status === "FAMILY_SOURCE") return "FAMILY";
  if (status === "AMBIGUOUS") return "AMBIGUOUS";
  if (status === "NO_VERIFIED_SOURCE") return "UNVERIFIED";
  return "CATALOGUE_ONLY";
}

function accessoryOpening(product: AnswerProduct) {
  const name = productDisplayName(product.sku);
  const facts = `${product.application} ${product.iotInterface} ${product.specification} ${product.sku}`;
  if (/antenna/i.test(facts)) return `${name} is an antenna accessory.`;
  if (/\bcable|extension\b/i.test(facts)) return `${name} is a cable accessory.`;
  if (/battery/i.test(facts)) return `${name} is a battery accessory.`;
  if (/enclosure/i.test(facts)) return `${name} is an enclosure accessory.`;
  if (/\bprobe\b/i.test(facts)) return `${name} is a probe accessory.`;
  if (/\bkit\b/i.test(facts)) return `${name} is an IoT hardware kit.`;
  return `${name} is an IoT accessory.`;
}

function connectivityAnswer(value: string) {
  const label = productConnectivityLabel(value);
  if (!label || /^(?:probe|cable|battery|antenna|enclosure|fixture|clamp)|^for\b/i.test(label)) return undefined;
  if (/(?:rs485|modbus|uart|i2c|one-wire)/i.test(label)) return `Its stated device interface is ${label}.`;
  return `It uses ${label} connectivity.`;
}

function hasExplicitMeasurementRange(specification: string) {
  return specificationItems(specification).some((item) => /\d/.test(item) && /(?:\bto\b|~|–|\d\s*-\s*\d)/i.test(item) && /(?:range|mm|cm|metre|meter|°|kpa|mpa|bar|psi|ph|ntu|µs|%)/i.test(item));
}

export function buildProductAnswers(product: AnswerProduct, guidance?: AnswerGuidance, documentationStatus?: AnswerDocumentationStatus): ProductAnswers {
  const specification = displayValue(product.specification);
  const accessory = isAccessoryProduct(product);
  const evidence = evidenceClass(documentationStatus);
  const powerFacts = explicitPower(specification);
  const sensorFacts = explicitSensorOrProbe(specification);
  const guidanceMatchesEvidence = (evidence === "EXACT" && guidance?.evidenceLevel === "EXACT_PRODUCT_SOURCE") || (evidence === "FAMILY" && guidance?.evidenceLevel === "FAMILY_SOURCE");
  const trustedDefinition = guidanceMatchesEvidence ? safeGuidance(guidance?.definition) : undefined;
  const trustedUses = guidanceMatchesEvidence ? safeGuidance(guidance?.uses) : undefined;
  const trustedSuitability = guidanceMatchesEvidence ? safeGuidance(guidance?.suitability) : undefined;
  const checks = guidanceMatchesEvidence ? [...(guidance?.buyerChecks ?? []).map(safeGuidance).filter((check): check is string => Boolean(check))] : [];

  if (/(?:rs485|modbus)/i.test(`${product.iotInterface} ${specification}`)) checks.push("Confirm the connected device's protocol and register requirements.");
  if (/\bprobe\b/i.test(specification)) checks.push("Confirm the required probe and cable arrangement.");
  if (hasExplicitMeasurementRange(specification)) checks.push("Confirm the stated measurement range suits the application.");
  if (powerFacts.length) checks.push("Confirm the required power configuration.");
  if (evidence === "EXACT" && /-(?:GE|1T)(?:-|$)/i.test(product.sku)) checks.push("Confirm the required cellular and SIM configuration.");
  if (/gateway/i.test(product.application) && /(?:wi-?fi|ethernet|4g|cellular)/i.test(specification)) checks.push("Confirm the required gateway backhaul connection.");

  return {
    opening: trustedDefinition ?? (accessory ? accessoryOpening(product) : productDefinition(product)),
    functionAnswer: trustedUses ?? explicitFunction(product),
    suitability: trustedSuitability,
    connectivity: connectivityAnswer(product.iotInterface),
    power: powerFacts.length ? `Power details include ${powerFacts.join(" and ")}.` : undefined,
    sensorOrProbe: sensorFacts.length ? `The specification includes ${sensorFacts.join(" and ")}.` : undefined,
    beforeOrdering: unique(checks),
    isAccessory: accessory,
    evidenceClass: evidence,
  };
}

export type ComparisonField = { label: string; values: string[] };

export function buildComparisonFields(products: AnswerProduct[]): ComparisonField[] {
  const answers = products.map((product) => buildProductAnswers(product));
  const fields: ComparisonField[] = [
    { label: "Primary function", values: products.map((product) => productApplicationLabel(product.application)) },
    { label: "Connectivity", values: products.map((product) => productConnectivityLabel(product.iotInterface)) },
    { label: "Power", values: answers.map((answer) => answer.power?.replace(/^Power details include |\.$/g, "") ?? "") },
    { label: "Sensor or probe arrangement", values: answers.map((answer) => answer.sensorOrProbe?.replace(/^The specification includes |\.$/g, "") ?? "") },
    { label: "Important specification", values: products.map((product) => (specificationItems(product.specification).find((item) => /\b(?:range|temperature|humidity|pressure|flow|distance|level|ultrasonic|soil|co2|vibration|rs485|modbus)\b/i.test(item)) ?? "")) },
  ];

  return fields.filter((field) => field.values.some(Boolean));
}

export function selectRelatedProducts<T extends AnswerProduct & { slug: string; imagePath?: string }>(product: AnswerProduct & { slug: string }, candidates: readonly T[], familySkus: readonly string[] = [], limit = 4) {
  const family = new Set(familySkus);
  return candidates
    .filter((candidate) => candidate.slug !== product.slug && (family.size ? family.has(candidate.sku) : displayValue(candidate.application) === displayValue(product.application)))
    .sort((a, b) => Number(Boolean(b.imagePath)) - Number(Boolean(a.imagePath)) || a.slug.localeCompare(b.slug, "en-ZA"))
    .slice(0, limit);
}
