import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import sharp from "sharp";

type ImageRecord = {
  sku: string;
  localPath: string;
  productFamily: string;
  matchMethod: string;
};

const root = process.cwd();
const manifest = JSON.parse(await readFile(join(root, "data", "product-images.json"), "utf8")) as { images: ImageRecord[] };
const outputDirectory = join(root, "reports", "image-qa", "contact-sheets");
const tileWidth = 480;
const tileHeight = 420;
const imageHeight = 330;
const columns = 4;
const rows = 4;
const perSheet = columns * rows;

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

const grouped = Map.groupBy(manifest.images, (record) => record.localPath);
const assets = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const index = [];
for (let offset = 0; offset < assets.length; offset += perSheet) {
  const sheetNumber = offset / perSheet + 1;
  const sheetAssets = assets.slice(offset, offset + perSheet);
  const composites = [];

  for (const [position, [localPath, records]] of sheetAssets.entries()) {
    const left = (position % columns) * tileWidth;
    const top = Math.floor(position / columns) * tileHeight;
    const families = [...new Set(records.map((record) => record.productFamily))].join(", ");
    const sampleSkus = records.slice(0, 2).map((record) => record.sku.trim()).join(", ");
    const label = `${offset + position + 1}. ${basename(localPath)} | ${families} | ${records.length} SKU${records.length === 1 ? "" : "s"}`;
    const detail = sampleSkus.length > 54 ? `${sampleSkus.slice(0, 51)}...` : sampleSkus;
    const image = await sharp(join(root, "public", localPath.replace(/^\//, "")))
      .resize({ width: tileWidth - 24, height: imageHeight - 24, fit: "contain", background: "#ffffff" })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
    const labelSvg = Buffer.from(`<svg width="${tileWidth}" height="${tileHeight - imageHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#eef3f8"/>
      <text x="12" y="27" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#0b2239">${escapeXml(label)}</text>
      <text x="12" y="53" font-family="Arial, sans-serif" font-size="13" fill="#334e68">${escapeXml(detail)}</text>
    </svg>`);

    composites.push({ input: image, left: left + 12, top: top + 12 });
    composites.push({ input: labelSvg, left, top: top + imageHeight });
    index.push({ number: offset + position + 1, sheet: sheetNumber, localPath, families, skuCount: records.length, skus: records.map((record) => record.sku), methods: [...new Set(records.map((record) => record.matchMethod))] });
  }

  const file = `product-images-${String(sheetNumber).padStart(2, "0")}.jpg`;
  await sharp({ create: { width: columns * tileWidth, height: rows * tileHeight, channels: 3, background: "#d9e2ec" } })
    .composite(composites)
    .jpeg({ quality: 92 })
    .toFile(join(outputDirectory, file));
}

await writeFile(join(outputDirectory, "index.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), totalAssets: assets.length, sheets: Math.ceil(assets.length / perSheet), assets: index }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ distinctAssets: assets.length, contactSheets: Math.ceil(assets.length / perSheet) }, null, 2));
