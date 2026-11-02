import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateBundle } from "./validator.mjs";

const input = process.argv[2];
const reportPath = process.argv[3];
if (!input) { console.error("Usage: node validate-export.mjs <export.json> [report.json]"); process.exit(2); }
const bundle = JSON.parse(await readFile(resolve(input), "utf8"));
const report = { ...validateBundle(bundle), validatedAt: new Date().toISOString(), input: resolve(input) };
if (reportPath) await writeFile(resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify(report, null, 2));
process.exit(report.valid ? 0 : 1);
