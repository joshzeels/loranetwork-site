import { readFile, writeFile } from "node:fs/promises";

type Product = { sku: string; slug: string; application: string; specification: string; iotInterface: string; productUrl: string; packageDimensionMm: string; packageWeightG: string };
type ImageAuditProduct = { sku: string; family: string };

const catalogue = JSON.parse(await readFile("data/dragino-products.json", "utf8")) as { products: Product[] };
const imageAudit = JSON.parse(await readFile("reports/product-image-audit.json", "utf8")) as { products: ImageAuditProduct[] };
const countBy = (values: string[]) => [...Map.groupBy(values.filter(Boolean), (value) => value).entries()].map(([value, items]) => ({ value, count: items.length })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
const searchable = (product: Product) => [product.sku, product.application, product.specification, product.iotInterface].join(" ").toLocaleLowerCase("en-ZA");
const searchTerms = ["water", "tank", "temperature", "humidity", "gateway", "tracker", "rs485", "modbus", "lorawan", "nb-iot", "agriculture", "level", "meter", "co2"];

const report = {
  generatedAt: new Date().toISOString(),
  totalProducts: catalogue.products.length,
  applications: countBy(catalogue.products.map((product) => product.application.trim())),
  interfaces: countBy(catalogue.products.map((product) => product.iotInterface.trim())),
  families: countBy(imageAudit.products.map((product) => product.family.trim())),
  searchTermCoverage: Object.fromEntries(searchTerms.map((term) => [term, catalogue.products.filter((product) => searchable(product).includes(term)).length])),
};

await writeFile("reports/content-opportunity-audit.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  applications: report.applications.slice(0, 25),
  interfaces: report.interfaces.slice(0, 15),
  families: report.families.slice(0, 30),
  searchTermCoverage: report.searchTermCoverage,
}, null, 2));
