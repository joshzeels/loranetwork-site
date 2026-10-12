import { displayValue, productApplicationLabel, productConnectivityLabel, productDisplayName, specificationItems } from "./product-presentation.ts";

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
export type AnswerDimension = "function" | "connectivity" | "power" | "sensorProbe" | "measurementRange" | "modelVariant";
export type MeasurementRangeKind = "distance" | "temperature" | "pressure" | "flow" | "humidity" | "current" | "voltage" | "level" | "co2";

export type SemanticRange = {
  kind: MeasurementRangeKind | "radio" | "physical";
  value: string;
  source: string;
};

export type ProductSemanticFacts = {
  measurementRanges: SemanticRange[];
  radioRanges: SemanticRange[];
  physicalLengths: SemanticRange[];
  powerSummary?: string;
  powerConfiguration?: string;
  batteryCapacity?: string;
  batteryMonitoring: boolean;
  solar: boolean;
  chargingMethod?: string;
  sensorHeadline?: string;
  sensorDetail?: string;
  sensorMode?: "contained" | "external" | "on-device" | "supported";
  connectivityLabel?: string;
  localInterface?: "RS485" | "Modbus" | "UART";
  gatewayBackhaul: string[];
};

export type AnswerContext = {
  familyName?: string;
  familyProducts?: readonly AnswerProduct[];
};

export type ProductAnswers = {
  opening: string;
  functionAnswer?: string;
  suitability?: string;
  connectivity?: string;
  power?: string;
  sensorOrProbe?: string;
  modelOrVariant?: string;
  beforeOrdering: string[];
  isAccessory: boolean;
  evidenceClass: AnswerEvidenceClass;
  semanticFacts: ProductSemanticFacts;
  answerDimensions: AnswerDimension[];
  suppressedRedundantSections: Array<"function" | "connectivity" | "sensorProbe" | "power">;
};

const evidenceTerms = /source|documentation|manufacturer|according to|verified|official|datasheet|manual/i;
const intervalPattern = /(-?\d+(?:\.\d+)?)\s*(°?\s*[a-zA-Z%µμ]+)?\s*(?:to|~|–|—|-)\s*(-?\d+(?:\.\d+)?)\s*(°?\s*[a-zA-Z%µμ]+)?/i;

function unique(values: string[]) {
  return [...new Set(values.map(displayValue).filter(Boolean))];
}

function fragments(specification: string) {
  const structured = specificationItems(specification);
  const initial = structured.length ? structured : displayValue(specification) ? [displayValue(specification)] : [];
  return initial.flatMap((item) => item.split(";").map(displayValue).filter(Boolean));
}

function sentence(value: string) {
  const cleaned = displayValue(value).replace(/\s+([,.;:])/g, "$1").replace(/\s*\/\s*/g, " / ");
  return cleaned ? `${cleaned.replace(/[.]+$/, "")}.` : "";
}

function formatCapacity(value: string) {
  return `${Number(value).toLocaleString("en-ZA", { useGrouping: false })} mAh`;
}

function formatInterval(item: string) {
  const cleaned = displayValue(item);
  const selectable = cleaned.match(/(-?\d+(?:\.\d+)?)\s*~\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*([a-z]+\s*\/\s*[a-z]+)/i);
  if (selectable) return `${selectable[1]} to ${selectable[2]}, ${selectable[1]} to ${selectable[3]}, or ${selectable[1]} to ${selectable[4]} ${displayValue(selectable[5])}`;
  const match = cleaned.match(intervalPattern);
  if (!match) return undefined;
  const [, start, startUnitRaw = "", end, endUnitRaw = ""] = match;
  const startUnit = displayValue(startUnitRaw).replace(/\s/g, "");
  const endUnit = displayValue(endUnitRaw).replace(/\s/g, "");
  const sharedUnit = endUnit || startUnit;
  const left = startUnit && startUnit !== sharedUnit ? `${start} ${startUnit}` : start;
  return `${left} to ${end}${sharedUnit ? ` ${sharedUnit}` : ""}`;
}

function rangeKind(item: string, application: string): MeasurementRangeKind | undefined {
  if (/\bco2\b|\bppm\b/i.test(item)) return "co2";
  if (/temperature|\btemp\b|therm|°\s*c\b/i.test(item)) return "temperature";
  if (/pressure|\bkpa\b|\bmpa\b|\bbar\b|\bpsi\b/i.test(item)) return "pressure";
  if (/flow|pulse\s*=\s*1\s*l/i.test(item)) return "flow";
  if (/humidity|\brh\b/i.test(item)) return "humidity";
  if (/current|\bma\b|ampere/i.test(item)) return "current";
  if (/voltage|volt|\bv\s*(?:input|range)\b/i.test(item)) return "voltage";
  if (/level/i.test(item)) return "level";
  if (/distance|flat object|ultrasonic|\bmm\b|\bcm\b/i.test(item)) return "distance";
  if (/\bco2\b/i.test(application)) return "co2";
  if (/temperature/i.test(application)) return "temperature";
  if (/pressure/i.test(application)) return "pressure";
  if (/flow/i.test(application)) return "flow";
  if (/humidity/i.test(application)) return "humidity";
  if (/current|energy/i.test(application)) return "current";
  if (/voltage/i.test(application)) return "voltage";
  if (/level/i.test(application)) return "level";
  if (/distance/i.test(application)) return "distance";
  return undefined;
}

function parseRanges(product: AnswerProduct) {
  const measurementRanges: SemanticRange[] = [];
  const radioRanges: SemanticRange[] = [];
  const physicalLengths: SemanticRange[] = [];
  for (const item of fragments(product.specification)) {
    const interval = formatInterval(item);
    const hasRangeLanguage = /\brange\b|\bmeasure(?:ment)?\b|\bdistance\b|\bto\b|~|–|—|\d\s*-\s*\d/i.test(item);
    const isRadio = /(?:radio|wireless|communication|lora).{0,30}(?:range|distance)|(?:range|distance).{0,30}(?:radio|wireless|communication|rural|urban|lora)|\bkm\b/i.test(item);
    const isPhysicalLength = /(?:cable|probe|wire|enclosure|dimension|housing).{0,35}(?:length|long|met(?:er|re)|\bm\b)|(?:length|long|\d+(?:\.\d+)?\s*(?:m|metres?|meters?|mm|cm)).{0,25}(?:cable|probe|wire)/i.test(item);
    if (isRadio && (interval || /up to\s+\d/i.test(item))) {
      radioRanges.push({ kind: "radio", value: interval ?? displayValue(item), source: item });
      continue;
    }
    if (isPhysicalLength && (interval || /\d+(?:\.\d+)?\s*(?:m|metres?|meters?|mm|cm)\b/i.test(item))) {
      physicalLengths.push({ kind: "physical", value: interval ?? displayValue(item), source: item });
      continue;
    }
    if (!interval || !hasRangeLanguage || /(?:poe|power|supply|frequency|mhz|ghz|output)/i.test(item)) continue;
    const kind = rangeKind(item, product.application);
    if (kind) measurementRanges.push({ kind, value: interval, source: item });
  }
  return { measurementRanges, radioRanges, physicalLengths };
}

function parsePower(specification: string) {
  const items = fragments(specification);
  const batteryItem = items.find((item) => /\d+(?:\.\d+)?\s*mAh/i.test(item));
  const capacityMatch = batteryItem?.match(/(\d+(?:\.\d+)?)\s*mAh/i);
  const batteryCapacity = capacityMatch ? formatCapacity(capacityMatch[1]) : undefined;
  const solar = items.some((item) => /solar\s*(?:panel|powered)?/i.test(item));
  const rechargeable = Boolean(batteryItem && /rechargeable/i.test(batteryItem));
  const chemistry = batteryItem?.match(/li-?ion|li[\s/-]?soci2/i)?.[0].replace(/li-?ion/i, "Li-ion").replace(/li[\s/-]?soci2/i, "Li-SOCl2");
  const batteryMonitoring = items.some((item) => /monitor(?:ing)?\s+battery\s+level|battery\s+level\s+monitor/i.test(item));
  const chargingItem = items.find((item) => /charging|charge\s+via/i.test(item));
  const chargingMethod = chargingItem && /usb/i.test(chargingItem) ? "USB" : undefined;
  const externalPowerItem = items.find((item) => !/no external power/i.test(item) && /(?:poe\s+in|power\s+(?:input|supply)|external\s+power|dc\s+input)/i.test(item));
  const externalPowerRange = externalPowerItem ? formatInterval(externalPowerItem) : undefined;

  let batteryDescription: string | undefined;
  if (batteryCapacity) batteryDescription = `${batteryCapacity}${rechargeable ? " rechargeable" : ""}${chemistry ? ` ${chemistry}` : ""} battery`;
  let powerSummary: string | undefined;
  let powerConfiguration: string | undefined;
  if (solar && batteryDescription) {
    powerConfiguration = `a solar panel and ${batteryDescription}`;
    powerSummary = `Power is provided by ${powerConfiguration}.`;
  } else if (solar) {
    powerConfiguration = "a solar panel";
    powerSummary = "Power is provided by a solar panel.";
  } else if (batteryDescription) {
    powerConfiguration = batteryDescription;
    powerSummary = chemistry || rechargeable ? `Power is provided by ${/^8/.test(batteryCapacity ?? "") ? "an" : "a"} ${batteryDescription}.` : `The listed configuration includes a battery rated at ${batteryCapacity}.`;
  } else if (externalPowerItem) {
    powerConfiguration = externalPowerRange ? `${externalPowerRange} external power input` : displayValue(externalPowerItem);
    powerSummary = externalPowerRange ? `The stated external power input is ${externalPowerRange}.` : sentence(externalPowerItem);
  } else if (chargingMethod) {
    powerConfiguration = `${chargingMethod} charging`;
    powerSummary = `The stated charging method is ${chargingMethod}.`;
  }
  if (powerSummary && chargingMethod && !powerSummary.includes(chargingMethod)) powerSummary = `${powerSummary} Charging is via ${chargingMethod}.`;
  return { powerSummary, powerConfiguration, batteryCapacity, batteryMonitoring, solar, chargingMethod };
}

function sensorName(item: string) {
  const names = unique([...(item.match(/\b(?:SHT\d+|DS18B20|BME\d+|PT-?100)\b/gi) ?? []), ...(item.match(/\b(?:EC|PH|DO|ORP|TS)\b/g) ?? [])]).map((name) => name.toUpperCase() === "PH" ? "pH" : name);
  return names.length ? names.join(", ").replace(/, ([^,]+)$/, " and $1") : undefined;
}

function parseSensorProbe(specification: string) {
  const items = fragments(specification);
  const relevant = items.filter((item) => /\b(?:probe|sensor|ultrasonic|accelerometer|SHT\d+|DS18B20|BME\d+|PT-?100)\b/i.test(item));
  const item = relevant[0];
  if (!item) return {};
  const name = sensorName(item);
  const lengthMatch = item.match(/(?:external\s+)?(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\b/i);
  const length = lengthMatch ? `${lengthMatch[1]} m` : undefined;
  const countMatch = items.join(" ").match(/(?:support\s+)?(\d+)\s*(?:~|to|–|-)\s*(\d+)\s*probes?/i);
  const externalSensorInterface = /(?:rs485|uart|modbus).{0,35}(?:sensor|probe)|(?:sensor|probe).{0,35}(?:rs485|uart|modbus)/i.test(item);
  const supported = /\b(?:support|compatible|input for)\b/i.test(item) || (/\bfor\b/i.test(item) && /\b(?:sensor|probe)\b/i.test(item));
  const external = /\bexternal\b/i.test(item);
  const onDevice = /\bon-device\b/i.test(item);
  const builtIn = /\bbuilt-in\b/i.test(item);
  const sensorMode: ProductSemanticFacts["sensorMode"] = supported ? "supported" : external ? "external" : onDevice ? "on-device" : "contained";
  let sensorHeadline: string | undefined;
  if (externalSensorInterface) {
    const interfaces = unique([/rs485/i.test(item) ? "RS485" : "", /modbus/i.test(item) ? "Modbus" : "", /uart/i.test(item) ? "UART" : ""]);
    sensorHeadline = `It supports external ${interfaces.join(" and ")} sensor connections.`;
  } else if (/ultrasonic/i.test(item)) sensorHeadline = "It uses ultrasonic sensing.";
  else if (/accelerometer/i.test(item)) sensorHeadline = `It includes ${builtIn ? "a built-in" : "an"} three-axis accelerometer.`;
  else if (supported && /water quality probe/i.test(item)) sensorHeadline = `It supports ${name ?? "the stated"} water-quality probes.`;
  else if (supported && /compatible sensors/i.test(item)) sensorHeadline = `It supports the listed ${name ? `${name} ` : ""}sensors.`;
  else if (/flow sensor/i.test(item)) {
    const size = item.match(/diameter\s*:\s*([^.,]+)/i)?.[1];
    sensorHeadline = `It uses a${size ? ` ${displayValue(size)}` : ""} flow sensor.`;
  } else if (/\bprobe\b/i.test(item)) {
    const description = [external ? "external" : onDevice ? "on-device" : "", length, name, "probe"].filter(Boolean).join(" ");
    sensorHeadline = `${supported ? "It supports" : "It uses"} ${/^[aeiou]/i.test(description) ? "an" : "a"} ${description}.`;
  } else if (name && supported) sensorHeadline = `It supports ${name} sensors.`;
  else if (/\bsensor\b/i.test(item)) {
    const statedType = item.match(/^([^:]{2,50}?)\s+sensor\b/i)?.[1].replace(/\b(?:support|compatible)\b/gi, "").trim().toLocaleLowerCase("en-ZA");
    if (name || statedType) sensorHeadline = `${supported ? "It supports" : "It uses"} the stated ${name ? `${name} ` : statedType ? `${statedType} ` : ""}sensor.`;
  }
  const sensorDetail = countMatch ? `The listed configuration supports ${countMatch[1]} to ${countMatch[2]} probes.` : undefined;
  return { sensorHeadline, sensorDetail, sensorMode };
}

function parseConnectivity(product: AnswerProduct) {
  const label = productConnectivityLabel(product.iotInterface);
  const connectivityLabel = label && !/^(?:probe|cable|battery|antenna|enclosure|fixture|clamp)|^for\b/i.test(label) ? label : undefined;
  const context = `${product.application} ${product.specification}`;
  const localInterface: ProductSemanticFacts["localInterface"] = /modbus/i.test(context) ? "Modbus" : /rs485/i.test(context) ? "RS485" : /uart/i.test(context) ? "UART" : undefined;
  const gatewayBackhaul = /gateway/i.test(product.application) ? unique([/ethernet/i.test(product.specification) ? "Ethernet" : "", /wi-?fi|wireless:\s*built-in/i.test(product.specification) ? "Wi-Fi" : "", /\b(?:4g|cellular|ec25)\b/i.test(product.specification) ? "cellular" : ""]) : [];
  return { connectivityLabel, localInterface, gatewayBackhaul };
}

export function parseProductSpecification(product: AnswerProduct): ProductSemanticFacts {
  return { ...parseRanges(product), ...parsePower(product.specification), ...parseSensorProbe(product.specification), ...parseConnectivity(product) };
}

function isAccessoryProduct(product: AnswerProduct) {
  const classification = `${product.application} ${product.iotInterface} ${product.sku}`;
  const specification = displayValue(product.specification);
  return /\b(?:accessor|cable|antenna|battery|enclosure|fixture|clamp|extension|kit)\b/i.test(classification) || /\b(?:probe|cable|antenna|battery|enclosure|fixture|clamp|extension)\s+(?:for|only)\b|program module/i.test(specification);
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

function addOpeningDetail(opening: string, detail: string | undefined) {
  if (!detail) return opening;
  const clause = detail.replace(/^It (?:uses|includes)\s+/i, "with ").replace(/^It supports\s+/i, "supporting ").replace(/^It has\s+/i, "with ").replace(/[.]+$/, "");
  return `${opening.replace(/[.]+$/, "")}${/^supporting\b/i.test(clause) ? "," : ""} ${clause}.`;
}

function catalogueOpening(product: AnswerProduct, facts: ProductSemanticFacts) {
  const name = productDisplayName(product.sku);
  const application = productApplicationLabel(product.application);
  const applicationCopy = application.toLocaleLowerCase("en-ZA").replace(/\bco2\b/g, "CO2").replace(/\brs485\b/g, "RS485");
  const connectivity = facts.connectivityLabel;
  let opening: string;
  if (/gateway/i.test(application)) opening = `${name} is a ${/lorawan/i.test(application) ? "LoRaWAN " : ""}gateway.`;
  else if (/tracker/i.test(application)) opening = `${name} is ${connectivity ? `a ${connectivity} ` : "an IoT "}tracker.`;
  else if (/sensor/i.test(application)) opening = `${name} is ${/^[aeiou]/i.test(`${connectivity ?? ""} ${application}`.trim()) ? "an" : "a"}${connectivity ? ` ${connectivity}` : ""} ${applicationCopy}.`;
  else if (/generic.*node|rs485/i.test(product.application)) opening = `${name} is ${connectivity ? `a ${connectivity} ` : "an IoT "}node for ${/rs485/i.test(product.application) ? "RS485" : "connected-device"} projects.`;
  else if (application) opening = `${name} supports ${applicationCopy} projects${connectivity ? ` using ${connectivity}` : ""}.`;
  else if (connectivity) opening = `${name} is an IoT product using ${connectivity}.`;
  else opening = `${name} is an IoT product.`;
  const range = facts.measurementRanges[0];
  const rangeDetail = range ? `It has a stated ${range.kind === "co2" ? "CO2" : range.kind} range of ${range.value}.` : undefined;
  return addOpeningDetail(opening, facts.sensorHeadline ?? rangeDetail ?? (facts.solar ? "It uses solar power." : undefined));
}

function meaningfulGuidanceDetail(opening: string, detail: string | undefined) {
  if (!detail) return undefined;
  const terms = (value: string) => new Set(value.toLocaleLowerCase("en-ZA").replace(/[^a-z0-9]+/g, " ").split(" ").filter((term) => term.length > 3 && !/^(this|that|with|from|product|model|used|uses)$/.test(term)));
  const openingTerms = terms(opening);
  const detailTerms = terms(detail);
  const overlap = [...detailTerms].filter((term) => openingTerms.has(term)).length;
  return detailTerms.size && overlap / detailTerms.size < 0.75 ? detail : undefined;
}

function connectivityDetail(facts: ProductSemanticFacts) {
  if (!facts.connectivityLabel) return undefined;
  if (facts.gatewayBackhaul.length) return `It uses ${facts.connectivityLabel} for device connectivity and lists ${facts.gatewayBackhaul.join(" and ")} as ${facts.gatewayBackhaul.length === 1 ? "a backhaul option" : "backhaul options"}.`;
  if (facts.localInterface) return `It connects ${facts.localInterface} equipment locally and uses ${facts.connectivityLabel} for the IoT link.`;
  return undefined;
}

function variantAnswer(product: AnswerProduct, facts: ProductSemanticFacts, context?: AnswerContext) {
  const peers = context?.familyProducts?.filter((peer) => peer.sku !== product.sku) ?? [];
  if (!peers.length) return undefined;
  const peerFacts = peers.map(parseProductSpecification);
  const familyPhrase = context?.familyName ? ` ${context.familyName}` : "";
  if (facts.powerConfiguration && peerFacts.some((peer) => peer.powerConfiguration && peer.powerConfiguration !== facts.powerConfiguration)) return `This${familyPhrase} model uses ${facts.powerConfiguration}; related models list different power configurations.`;
  if (facts.connectivityLabel && peerFacts.some((peer) => peer.connectivityLabel && peer.connectivityLabel !== facts.connectivityLabel)) {
    const alternatives = unique(peerFacts.map((peer) => peer.connectivityLabel ?? "")).filter((value) => value !== facts.connectivityLabel);
    return `This${familyPhrase} model uses ${facts.connectivityLabel}; related models also use ${alternatives.join(" and ")}.`;
  }
  if (facts.sensorHeadline && peerFacts.some((peer) => peer.sensorHeadline && peer.sensorHeadline !== facts.sensorHeadline)) return `This${familyPhrase} model has the stated sensor or probe arrangement; related models list a different arrangement.`;
  const currentRange = facts.measurementRanges[0];
  if (currentRange && peerFacts.some((peer) => peer.measurementRanges[0]?.value && peer.measurementRanges[0].value !== currentRange.value)) return `This${familyPhrase} model has a stated ${currentRange.kind} range of ${currentRange.value}; related models list a different range.`;
  return undefined;
}

export function buildProductAnswers(product: AnswerProduct, guidance?: AnswerGuidance, documentationStatus?: AnswerDocumentationStatus, context?: AnswerContext): ProductAnswers {
  const accessory = isAccessoryProduct(product);
  const evidence = evidenceClass(documentationStatus);
  const semanticFacts = parseProductSpecification(product);
  const guidanceMatchesEvidence = (evidence === "EXACT" && guidance?.evidenceLevel === "EXACT_PRODUCT_SOURCE") || (evidence === "FAMILY" && guidance?.evidenceLevel === "FAMILY_SOURCE");
  const trustedDefinition = guidanceMatchesEvidence ? safeGuidance(guidance?.definition) : undefined;
  const opening = trustedDefinition ?? (accessory ? accessoryOpening(product) : catalogueOpening(product, semanticFacts));
  const trustedUses = guidanceMatchesEvidence ? safeGuidance(guidance?.uses) : undefined;
  const functionAnswer = meaningfulGuidanceDetail(opening, trustedUses);
  const suitability = guidanceMatchesEvidence ? safeGuidance(guidance?.suitability) : undefined;
  const connectivity = accessory ? undefined : connectivityDetail(semanticFacts);
  const sensorMarkers = semanticFacts.sensorHeadline?.match(/SHT\d+|DS18B20|BME\d+|PT-?100|ultrasonic|accelerometer|flow sensor|water-quality probes?|illumination sensor/gi) ?? [];
  const openingHasSensor = Boolean(semanticFacts.sensorHeadline && (sensorMarkers.length ? sensorMarkers.some((marker) => opening.toLocaleLowerCase("en-ZA").includes(marker.toLocaleLowerCase("en-ZA"))) : opening.toLocaleLowerCase("en-ZA").includes(semanticFacts.sensorHeadline.replace(/^It\s+(?:uses|includes|supports)\s+/i, "").replace(/[.]+$/, "").toLocaleLowerCase("en-ZA"))));
  const sensorOrProbe = accessory ? undefined : openingHasSensor ? semanticFacts.sensorDetail : [semanticFacts.sensorHeadline, semanticFacts.sensorDetail].filter(Boolean).join(" ") || undefined;
  const openingHasPower = semanticFacts.solar && /solar/i.test(opening);
  const power = accessory || (openingHasPower && !semanticFacts.batteryCapacity && !semanticFacts.chargingMethod) ? undefined : semanticFacts.powerSummary;
  const modelOrVariant = accessory ? undefined : variantAnswer(product, semanticFacts, context);
  const checks = guidanceMatchesEvidence ? [...(guidance?.buyerChecks ?? []).map(safeGuidance).filter((check): check is string => Boolean(check))] : [];
  const hasCheck = (pattern: RegExp) => checks.some((check) => pattern.test(check));
  if ((semanticFacts.localInterface === "RS485" || semanticFacts.localInterface === "Modbus") && !hasCheck(/protocol|register|modbus|rs485/i)) checks.push("Confirm the connected device's protocol and register requirements.");
  if ((semanticFacts.sensorMode === "external" || semanticFacts.sensorMode === "supported") && !hasCheck(/probe|cable/i)) checks.push("Confirm the required probe and cable arrangement.");
  if (semanticFacts.measurementRanges.length && !hasCheck(/measurement.{0,20}(?:range|distance)|(?:range|distance).{0,20}(?:fit|suit|required)/i)) checks.push("Confirm the stated measurement range suits the application.");
  if (semanticFacts.powerSummary && !hasCheck(/power|battery|solar|charging/i)) checks.push("Confirm the required power configuration.");
  if (evidence === "EXACT" && /-(?:GE|1T)(?:-|$)/i.test(product.sku) && !hasCheck(/cellular|sim|apn/i)) checks.push("Confirm the required cellular and SIM configuration.");
  if (semanticFacts.gatewayBackhaul.length && !hasCheck(/backhaul|ethernet|wi-?fi|cellular/i)) checks.push("Confirm the required gateway backhaul connection.");
  const answerDimensions = unique([productApplicationLabel(product.application) && !accessory ? "function" : "", semanticFacts.connectivityLabel && !accessory ? "connectivity" : "", semanticFacts.powerSummary && !accessory ? "power" : "", semanticFacts.sensorHeadline && !accessory ? "sensorProbe" : "", semanticFacts.measurementRanges.length && !accessory ? "measurementRange" : "", modelOrVariant ? "modelVariant" : ""]) as AnswerDimension[];
  const suppressedRedundantSections: ProductAnswers["suppressedRedundantSections"] = [];
  if (!accessory && productApplicationLabel(product.application) && !functionAnswer) suppressedRedundantSections.push("function");
  if (!accessory && semanticFacts.connectivityLabel && !connectivity) suppressedRedundantSections.push("connectivity");
  if (!accessory && semanticFacts.sensorHeadline && !sensorOrProbe) suppressedRedundantSections.push("sensorProbe");
  if (!accessory && semanticFacts.powerSummary && !power) suppressedRedundantSections.push("power");
  return { opening, functionAnswer, suitability, connectivity, power, sensorOrProbe, modelOrVariant, beforeOrdering: unique(checks), isAccessory: accessory, evidenceClass: evidence, semanticFacts, answerDimensions, suppressedRedundantSections };
}

export type ComparisonField = { label: string; values: string[] };

export function buildComparisonFields(products: AnswerProduct[]): ComparisonField[] {
  const answers = products.map((product) => buildProductAnswers(product));
  const fields: ComparisonField[] = [
    { label: "Primary function", values: products.map((product) => productApplicationLabel(product.application)) },
    { label: "Connectivity", values: answers.map((answer) => answer.semanticFacts.connectivityLabel ?? "") },
    { label: "Power", values: answers.map((answer) => answer.semanticFacts.powerConfiguration ?? "") },
    { label: "Sensor or probe arrangement", values: answers.map((answer) => answer.semanticFacts.sensorHeadline?.replace(/^It\s+(?:uses|includes|supports)\s+/i, "").replace(/[.]+$/, "") ?? "") },
    { label: "Measurement range", values: answers.map((answer) => answer.semanticFacts.measurementRanges.map((range) => `${range.kind}: ${range.value}`).join("; ")) },
  ];
  return fields.filter((field) => field.values.some(Boolean));
}

export function selectRelatedProducts<T extends AnswerProduct & { slug: string; imagePath?: string }>(product: AnswerProduct & { slug: string }, candidates: readonly T[], familySkus: readonly string[] = [], limit = 4) {
  const family = new Set(familySkus);
  return candidates.filter((candidate) => candidate.slug !== product.slug && (family.size ? family.has(candidate.sku) : displayValue(candidate.application) === displayValue(product.application))).sort((a, b) => Number(Boolean(b.imagePath)) - Number(Boolean(a.imagePath)) || a.slug.localeCompare(b.slug, "en-ZA")).slice(0, limit);
}
