import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const appOutput = join(root, ".next", "server", "app");
const outputPath = join(root, "reports", "brand-copy-audit.json");
const baselineMode = process.argv.includes("--baseline");

async function htmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? htmlFiles(join(directory, entry.name))
    : entry.isFile() && entry.name.endsWith(".html") ? [join(directory, entry.name)] : []))).flat();
}

function count(value: string) { return [...value.matchAll(/\bDragino\b/gi)].length; }

async function scan() {
  const files = await htmlFiles(appOutput);
  let visible = 0;
  let scripts = 0;
  const categories = { manufacturerIdentification: 0, factualProductContent: 0, structuredData: 0, sourceProvenance: 0, necessaryMetadata: 0, other: 0 };
  const pages: Array<{ file: string; visible: number; scripts: number }> = [];
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const scriptBlocks = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map((match) => match[0]).join(" ");
    const structuredBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)].map((match) => match[0]).join(" ");
    const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]).join(" ");
    const visibleText = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
    const pageVisible = count(visibleText);
    const pageScripts = count(scriptBlocks);
    visible += pageVisible;
    scripts += pageScripts;
    const manufacturerCount = [...html.matchAll(/<dt>Manufacturer<\/dt>\s*<dd>Dragino<\/dd>/gi)].length;
    const productPage = relative(root, file).replaceAll("\\", "/").includes("/products/");
    categories.manufacturerIdentification += manufacturerCount;
    categories.factualProductContent += productPage ? Math.max(0, pageVisible - manufacturerCount) : 0;
    categories.other += productPage ? 0 : pageVisible;
    categories.structuredData += count(structuredBlocks);
    categories.necessaryMetadata += count(metaTags);
    if (pageVisible || pageScripts) pages.push({ file: relative(root, file).replaceAll("\\", "/"), visible: pageVisible, scripts: pageScripts });
  }
  return { generatedHtmlFiles: files.length, visibleOccurrences: visible, scriptAndStructuredDataOccurrences: scripts, remainingOccurrenceCategories: categories, marketingStyleRepetitionsFlagged: categories.other, pages };
}

const current = await scan();
let report: Record<string, unknown> = {};
try { report = JSON.parse(await readFile(outputPath, "utf8")) as Record<string, unknown>; } catch { /* first run */ }
delete report.remainingOccurrenceCategories;
if (baselineMode || !report.before) report.before = current;
else report.after = current;
report.method = "Case-insensitive whole-word count in generated HTML. Visible counts exclude script and style blocks; script/structured counts are reported separately.";
report.categoryMethod = "Visible product-page occurrences are split between the explicit Manufacturer field and workbook-supplied product copy. JSON-LD and meta-tag counts are scanned separately; source provenance remains internal and is not counted as visible copy.";
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(baselineMode ? report.before : report.after, null, 2));
