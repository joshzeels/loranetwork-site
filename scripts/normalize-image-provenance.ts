import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type LegacyImage = {
  sku: string;
  slug: string;
  localPath: string;
  sourcePageUrl?: string;
  sourcePage?: string;
  originalImageUrl: string;
  matchMethod: string;
  confidence?: "EXACT" | "FAMILY_CONFIRMED";
  matchConfidence?: "EXACT" | "FAMILY_CONFIRMED";
  family?: string;
  productFamily?: string;
};

const manifestPath = resolve("data/product-images.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { images: LegacyImage[] };
const retrievedAt = new Date().toISOString();

const images = manifest.images.map((image) => {
  const sourcePage = image.sourcePage ?? image.sourcePageUrl ?? "";
  return {
    sku: image.sku,
    slug: image.slug,
    localPath: image.localPath,
    sourcePage,
    originalImageUrl: image.originalImageUrl,
    sourceDomain: sourcePage ? new URL(sourcePage).hostname : "",
    matchConfidence: image.matchConfidence ?? image.confidence ?? "EXACT",
    matchMethod: image.matchMethod,
    productFamily: image.productFamily ?? image.family ?? "",
    licenceClassification: "MANUFACTURER_OWNED",
    licenceName: "Manufacturer-owned image",
    licenceUrl: "",
    attributionRequired: false,
    attributionText: "",
    retrievedAt,
    notes: "Official manufacturer image retained from the prior verified mapping pass. No broader commercial reuse permission has been established.",
  };
});

await writeFile(manifestPath, `${JSON.stringify({ images }, null, 2)}\n`, "utf8");
console.log(`Normalized provenance for ${images.length} manufacturer-owned image mappings.`);
