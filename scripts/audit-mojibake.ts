import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = ["app", "components", "config", "lib"];
const explicitDataFiles = ["data/dragino-products.json", "data/discovery-content.json"];
const textExtensions = new Set([".ts", ".tsx", ".json", ".css", ".md", ".txt", ".svg"]);
const likelyMojibake = /(?:\u00c3[\u0080-\u00bf]|\u00c2(?=\s|\u00a0)|\u00e2(?:\u0080|\u20ac)|\ufffd)/g;

async function filesBelow(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesBelow(path);
    return textExtensions.has(extname(entry.name).toLowerCase()) ? [path] : [];
  }));
  return nested.flat();
}

const files = [...(await Promise.all(sourceRoots.map((directory) => filesBelow(join(root, directory))))).flat(), ...explicitDataFiles.map((file) => join(root, file))];
const issues: Array<{ file: string; line: number; excerpt: string }> = [];

for (const file of files) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (likelyMojibake.test(line)) issues.push({ file: relative(root, file).replace(/\\/g, "/"), line: index + 1, excerpt: line.trim().slice(0, 180) });
    likelyMojibake.lastIndex = 0;
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  status: issues.length ? "FAIL" : "PASS",
  scannedFiles: files.length,
  likelyMojibakeIssues: issues.length,
  correctedSourceFields: [],
  note: "No authoritative catalogue fields were altered. The earlier audit examples were not reproduced when files were read as UTF-8.",
  issues,
};

await writeFile(join(root, "reports", "mojibake-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`MOJIBAKE AUDIT: ${report.status}`);
console.log(`LIKELY ISSUES: ${issues.length}`);
if (issues.length) process.exitCode = 1;
