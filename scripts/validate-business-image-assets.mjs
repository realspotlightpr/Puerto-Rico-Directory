import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(join(root, "docs", "business-image-audit", "business-image-manifest.json"), "utf8"));
const errors = [];

async function metadataFor(url) {
  if (url.startsWith("https://spotlightpuertorico.com/images/businesses/")) {
    const relative = url.replace("https://spotlightpuertorico.com/", "");
    const localPath = join(root, "artifacts", "spotlight-pr", "public", ...relative.split("/"));
    await access(localPath);
    return sharp(localPath).metadata();
  }

  const response = await fetch(url, { headers: { "user-agent": "Spotlight-PR-media-validator/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return sharp(Buffer.from(await response.arrayBuffer())).metadata();
}

for (const record of manifest.records) {
  if (record.action === "archive") {
    if (record.targetStatus !== "rejected") errors.push(`${record.slug}: archive target is not rejected`);
    continue;
  }

  if (record.targetStatus !== "approved") errors.push(`${record.slug}: kept target is not approved`);
  if (!record.targetLogoUrl || !record.targetCoverUrl) errors.push(`${record.slug}: approved target lacks a logo or cover URL`);
  if ([record.targetLogoUrl, record.targetCoverUrl].some((url) => /placeholder-logo|hero-bg|opengraph\.jpg/.test(url ?? ""))) {
    errors.push(`${record.slug}: approved target still references generic artwork`);
  }

  try {
    const logo = await metadataFor(record.targetLogoUrl);
    if ((logo.width ?? 0) < 150 || (logo.height ?? 0) < 150) errors.push(`${record.slug}: logo is below 150x150`);
  } catch (error) {
    errors.push(`${record.slug}: logo validation failed (${error.message})`);
  }

  try {
    const cover = await metadataFor(record.targetCoverUrl);
    if ((cover.width ?? 0) < 800 || (cover.height ?? 0) < 450) errors.push(`${record.slug}: cover is below 800x450`);
  } catch (error) {
    errors.push(`${record.slug}: cover validation failed (${error.message})`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  total: manifest.total,
  approvedAfterApply: manifest.records.filter((record) => record.targetStatus === "approved").length,
  archivedAfterApply: manifest.records.filter((record) => record.targetStatus === "rejected").length,
  result: "all target media reachable, non-generic, and dimensionally valid",
}, null, 2));
