import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const imageDirectory = join(root, "public", "images", "products", "_official");
const reportPath = join(root, "reports", "product-image-quality-audit.json");
const minimumShortEdge = 180;
const minimumArea = 90_000;
const extremeAspectRatio = 2.35;

const files = await readdir(imageDirectory);
const images = [];

for (const file of files) {
  const metadata = await sharp(join(imageDirectory, file)).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  images.push({
    file,
    width,
    height,
    area: width * height,
    aspectRatio: Number((Math.max(width / height, height / width)).toFixed(2))
  });
}

const belowThreshold = images.filter((image) =>
  Math.min(image.width, image.height) < minimumShortEdge || image.area < minimumArea
);
const extremeAspectRatios = images
  .filter((image) => image.aspectRatio > extremeAspectRatio)
  .sort((a, b) => b.aspectRatio - a.aspectRatio);
const report = {
  generatedAt: new Date().toISOString(),
  thresholds: { minimumShortEdge, minimumArea, extremeAspectRatio },
  summary: {
    distinctLocalImageFiles: images.length,
    belowThreshold: belowThreshold.length,
    extremeAspectRatios: extremeAspectRatios.length
  },
  belowThreshold,
  extremeAspectRatios
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary, null, 2));
