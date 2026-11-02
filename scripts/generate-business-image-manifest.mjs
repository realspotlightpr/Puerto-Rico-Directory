import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://spotlightpuertorico.com";
const FALLBACK_IMAGE = `${SITE}/opengraph.jpg`;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "business-image-audit");

const derivedLogoSlugs = new Set([
  "bargain-city-xbn2h",
  "cmn-window-tint-1fj59",
  "david-sandwiches-47lry",
  "enmarcados-alamar-iwa13",
  "entremasas-pizza-and-pasta-9h3zd",
  "foresta-cannabis-collection-two16",
  "gyro-express-hy7to",
  "josue-refrigeration-inc-lvu8m",
  "jungla-grooming-pidob",
  "mitchell-interior-contractors-inc-bey1v",
  "ocean-restaurant-8d8ji",
  "offshore-acai-bar-uvi2t",
  "oldach-arecibo-a6vox",
  "oscar-auto-tint-tzeo3",
  "simple-coffee-xiwfh",
  "skincare-body-aesthetic-gwto1",
  "smartphone-solutions-and-computer-center-17roi",
  "ta-con-madras-xkq98",
  "tll-auto-shop-vf66h",
  "villafane-modern-tax-accounting-4k4h7",
  "wah-fun-u8a4t",
]);

const enhancedExistingPairs = new Set([
  "olympic-travel-tours-u7iz1",
]);

const verifiedPairs = new Map(Object.entries({
  "anawim-catholic-bookstore-5bm3x": {
    sourcePage: "https://www.libreriacatolicaanawim.com/",
    logoSource: "https://static.wixstatic.com/media/bbcd0d_c45cb41b29694293885376f549b31f0b~mv2.png/v1/crop/x_0,y_56,w_1600,h_415/fill/w_1200,h_312,al_c,q_90/logo.png",
    coverSource: "https://static.wixstatic.com/media/bbcd0d_9b7bdd7e716d4659be853c546c3d4662~mv2.jpg/v1/crop/x_312,y_98,w_3431,h_1619/fill/w_1600,h_755,al_c,q_85/20220930_113602.jpg",
  },
  "arecibo-light-house-s32xq": {
    sourcePage: "https://arecibolighthouse.com/",
    logoSource: "https://arecibolighthouse.com/entrada.jpg",
    coverSource: "https://arecibolighthouse.com/entrada.jpg",
  },
  "colegio-pentecostal-arecibo-o3mgf": {
    sourcePage: "https://cparecibo.org/",
    logoSource: "https://cparecibo.org/wp-content/uploads/2020/11/Colegio-Pentecostal-Arecibo-Logo-300x300.png",
    coverSource: "https://cparecibo.org/wp-content/uploads/2020/05/Colegio-Pentecostal-Arecibo-Slider-Website-Entrada.jpg",
  },
  "natural-nurse-swyeo": {
    sourcePage: "https://linktr.ee/nursemalaik13",
    logoSource: "https://linktr.ee/og/image/nursemalaik13.jpg",
    coverSource: "https://linktr.ee/og/image/nursemalaik13.jpg",
  },
  "sabor-frape-g9f19": {
    sourcePage: "https://saborfrappe.com/",
    logoSource: "https://saborfrappe.com/brand/logos/sf-icon.png",
    coverSource: "https://saborfrappe.com/photos/lifestyle/grass-friends.jpg",
  },
  "yanya-curls-ivev6": {
    sourcePage: "https://yanyacurls.com/en/pages/sobre-nosotros",
    logoSource: "https://yanyacurls.com/cdn/shop/files/Logo_2_8fb7caab-c7e2-4824-9299-00ab243ab126.png?v=1739471483",
    coverSource: "https://yanyacurls.com/cdn/shop/collections/SERVICIOYANYA.jpg?v=1739742856&width=1500",
  },
}));

const archiveReasons = new Map(Object.entries({
  "adorno-bakery-kmzzi": "No safely reusable, business-specific logo and cover pair was verified.",
  "bermudas-4fefg": "A logo was found, but no safely usable business-specific cover could be verified.",
  "el-qioskuito-del-norte-7fwav": "No authoritative public media source could be matched with sufficient confidence.",
  "frozen-ice-lwk3c": "The listing is too ambiguous to match to public media without risking the wrong business.",
  "gs-contractors-pr-ndo38": "Both current remote media URLs fail DNS/availability validation.",
  "homemade-cookies-pr-51u2h": "The listing is too ambiguous to match to public media without risking the wrong business.",
  "infinto-lacco": "The business name/identity could not be verified; attaching imagery would risk a false match.",
  "jrc-tax-accounting-fstx0": "A real logo exists, but available cover candidates were promotional stock-style graphics rather than real business imagery.",
  "multinational-y65nt": "A real logo exists, but the available official cover candidate was generic stock imagery.",
  "oro-norte-xmtgm": "The business identity was verified, but no safely reusable logo and real cover pair was found.",
  "pina-colada-stand-kdox6": "The generic name has multiple possible matches and no authoritative media source.",
  "pito-sandwhich-7qowo": "No authoritative public media source could be matched with sufficient confidence.",
}));

const unchangedSlugs = new Set([
  "ameila-pizza-s32n5",
  "healthy-body-arecibo",
  "marullos-cafe-arecibo",
  "miramar-bbq-arecibo",
]);

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const string = String(value);
  return /[",\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "Spotlight-PR-media-audit/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

const sitemap = await fetchText(`${SITE}/sitemap-businesses.xml`);
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const records = [];

for (const url of urls) {
  const html = await fetchText(url);
  const match = html.match(/<script id="spotlight-business-schema" type="application\/ld\+json">(.*?)<\/script>/s);
  if (!match) throw new Error(`Missing business JSON-LD: ${url}`);
  const business = JSON.parse(match[1])["@graph"][0];
  const slug = url.split("/").pop();
  const currentCoverUrl = business.image === FALLBACK_IMAGE ? null : business.image;
  const currentLogoUrl = business.logo ?? null;
  const localBase = `${SITE}/images/businesses/${slug}`;

  let action;
  let targetLogoUrl = currentLogoUrl;
  let targetCoverUrl = currentCoverUrl;
  let reason;
  let provenance;

  if (archiveReasons.has(slug)) {
    action = "archive";
    reason = archiveReasons.get(slug);
    provenance = [];
  } else if (enhancedExistingPairs.has(slug)) {
    action = "update_both";
    targetLogoUrl = `${localBase}/logo-fallback.webp`;
    targetCoverUrl = `${localBase}/cover.webp`;
    reason = "The current business-specific source was visually verified; square and 1600x900 WebP derivatives were prepared to meet display-size requirements.";
    provenance = [currentCoverUrl];
  } else if (verifiedPairs.has(slug)) {
    const sources = verifiedPairs.get(slug);
    action = "update_both";
    targetLogoUrl = `${localBase}/logo.webp`;
    targetCoverUrl = `${localBase}/cover.webp`;
    reason = "Verified public, business-specific media pair prepared and visually reviewed.";
    provenance = [sources.sourcePage, sources.logoSource, sources.coverSource];
  } else if (derivedLogoSlugs.has(slug)) {
    action = "update_logo";
    targetLogoUrl = `${localBase}/logo-fallback.webp`;
    reason = "The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.";
    provenance = [currentCoverUrl];
  } else if (unchangedSlugs.has(slug)) {
    action = "keep";
    reason = "Existing logo and cover are business-specific, reachable, visually verified, and dimensionally acceptable.";
    provenance = [currentLogoUrl, currentCoverUrl].filter(Boolean);
  } else {
    throw new Error(`Unclassified business: ${slug}`);
  }

  records.push({
    name: business.name,
    slug,
    publicUrl: url,
    currentStatus: "approved",
    currentLogoUrl,
    currentCoverUrl,
    action,
    targetStatus: action === "archive" ? "rejected" : "approved",
    targetLogoUrl,
    targetCoverUrl,
    reason,
    provenance,
  });
}

records.sort((a, b) => a.name.localeCompare(b.name));
const counts = Object.fromEntries(["keep", "update_logo", "update_both", "archive"].map((action) => [action, records.filter((record) => record.action === action).length]));
if (records.length !== 44 || counts.keep !== 4 || counts.update_logo !== 21 || counts.update_both !== 7 || counts.archive !== 12) {
  throw new Error(`Unexpected classification counts: ${JSON.stringify({ total: records.length, ...counts })}`);
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(join(OUT_DIR, "business-image-manifest.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), source: `${SITE}/sitemap-businesses.xml`, total: records.length, counts, records }, null, 2)}\n`);

const columns = ["name", "slug", "currentStatus", "currentLogoUrl", "currentCoverUrl", "action", "targetStatus", "targetLogoUrl", "targetCoverUrl", "reason", "provenance"];
const csv = [columns.join(","), ...records.map((record) => columns.map((column) => csvCell(column === "provenance" ? record.provenance.join(" | ") : record[column])).join(","))].join("\n");
await writeFile(join(OUT_DIR, "business-image-manifest.csv"), `${csv}\n`);

const writeSubsetCsv = async (filename, subset) => {
  const body = [columns.join(","), ...subset.map((record) => columns.map((column) => csvCell(column === "provenance" ? record.provenance.join(" | ") : record[column])).join(","))].join("\n");
  await writeFile(join(OUT_DIR, filename), `${body}\n`);
};

const backupColumns = ["name", "slug", "publicUrl", "currentStatus", "currentLogoUrl", "currentCoverUrl"];
const backupCsv = [backupColumns.join(","), ...records.map((record) => backupColumns.map((column) => csvCell(record[column])).join(","))].join("\n");
await writeFile(join(OUT_DIR, "business-image-backup.csv"), `${backupCsv}\n`);
await writeSubsetCsv("keep-manifest.csv", records.filter((record) => record.action === "keep"));
await writeSubsetCsv("update-manifest.csv", records.filter((record) => record.action.startsWith("update_")));
await writeSubsetCsv("archive-manifest.csv", records.filter((record) => record.action === "archive"));

const planValues = records.map((record) => `  (${[
  record.slug,
  record.name,
  record.action,
  record.targetStatus,
  record.targetLogoUrl,
  record.targetCoverUrl,
  record.reason,
].map(sqlString).join(", ")})`).join(",\n");

const applySql = `-- Generated from business-image-manifest.json. Review and deploy the referenced static assets first.
-- Run only with authorized production database access.
BEGIN;

SELECT pg_advisory_xact_lock(hashtext('spotlight-business-image-remediation-2026-11-01'));

CREATE SCHEMA IF NOT EXISTS spotlight_ops;
REVOKE ALL ON SCHEMA spotlight_ops FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA spotlight_ops TO service_role;

CREATE TABLE IF NOT EXISTS spotlight_ops.spotlight_business_media_backup_20261101 (
  business_id integer PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  record_snapshot jsonb NOT NULL,
  related_counts jsonb NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spotlight_ops.spotlight_business_media_audit (
  id bigserial PRIMARY KEY,
  business_id integer NOT NULL,
  slug text NOT NULL,
  action text NOT NULL,
  reason text NOT NULL,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  manifest_version text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON ALL TABLES IN SCHEMA spotlight_ops FROM public, anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA spotlight_ops TO service_role;

CREATE TEMP TABLE spotlight_business_media_plan (
  slug text PRIMARY KEY,
  business_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('keep', 'update_logo', 'update_both', 'archive')),
  target_status text NOT NULL CHECK (target_status IN ('approved', 'rejected')),
  target_logo_url text,
  target_cover_url text,
  reason text NOT NULL
) ON COMMIT DROP;

INSERT INTO spotlight_business_media_plan
  (slug, business_name, action, target_status, target_logo_url, target_cover_url, reason)
VALUES
${planValues};

DO $$
BEGIN
  IF (SELECT count(*) FROM spotlight_business_media_plan) <> 44 THEN
    RAISE EXCEPTION 'Expected 44 manifest rows';
  END IF;
  IF (SELECT count(*) FROM public.businesses b JOIN spotlight_business_media_plan p USING (slug)) <> 44 THEN
    RAISE EXCEPTION 'Production businesses do not exactly match the 44-row manifest';
  END IF;
  IF EXISTS (
    SELECT 1 FROM spotlight_ops.spotlight_business_media_audit
    WHERE manifest_version = '2026-11-01-v1' AND action <> 'restore'
  ) THEN
    RAISE EXCEPTION 'Manifest 2026-11-01-v1 has already been applied';
  END IF;
END $$;

-- Full-record backup occurs before any status or media mutation. Relationships remain in place
-- because archived rows are never deleted.
INSERT INTO spotlight_ops.spotlight_business_media_backup_20261101
  (business_id, slug, record_snapshot, related_counts)
SELECT
  b.id,
  b.slug,
  to_jsonb(b),
  jsonb_build_object(
    'reviews', (SELECT count(*) FROM public.reviews r WHERE r.business_id = b.id),
    'media_items', (SELECT count(*) FROM public.media_items m WHERE m.business_id = b.id),
    'menu_items', (SELECT count(*) FROM public.menu_items m WHERE m.business_id = b.id),
    'form_submissions', (SELECT count(*) FROM public.form_submissions f WHERE f.business_id = b.id)
  )
FROM public.businesses b
JOIN spotlight_business_media_plan p USING (slug)
ON CONFLICT (business_id) DO NOTHING;

DO $$
BEGIN
  IF (SELECT count(*) FROM spotlight_ops.spotlight_business_media_backup_20261101) < 44 THEN
    RAISE EXCEPTION 'Backup table does not contain all 44 scoped records';
  END IF;
END $$;

INSERT INTO spotlight_ops.spotlight_business_media_audit
  (business_id, slug, action, reason, before_state, after_state, manifest_version)
SELECT
  b.id,
  b.slug,
  p.action,
  p.reason,
  jsonb_build_object('status', b.status, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'updated_at', b.updated_at),
  jsonb_build_object(
    'status', p.target_status,
    'logo_url', CASE WHEN p.action IN ('update_logo', 'update_both') THEN p.target_logo_url ELSE b.logo_url END,
    'cover_url', CASE WHEN p.action = 'update_both' THEN p.target_cover_url ELSE b.cover_url END
  ),
  '2026-11-01-v1'
FROM public.businesses b
JOIN spotlight_business_media_plan p USING (slug)
WHERE p.action <> 'keep';

UPDATE public.businesses b
SET
  status = p.target_status::public.business_status,
  logo_url = CASE WHEN p.action IN ('update_logo', 'update_both') THEN p.target_logo_url ELSE b.logo_url END,
  cover_url = CASE WHEN p.action = 'update_both' THEN p.target_cover_url ELSE b.cover_url END,
  updated_at = now()
FROM spotlight_business_media_plan p
WHERE b.slug = p.slug AND p.action <> 'keep';

DO $$
BEGIN
  IF (SELECT count(*) FROM public.businesses b JOIN spotlight_business_media_plan p USING (slug) WHERE b.status = 'approved') <> 32 THEN
    RAISE EXCEPTION 'Expected exactly 32 approved scoped businesses after remediation';
  END IF;
  IF (SELECT count(*) FROM public.businesses b JOIN spotlight_business_media_plan p USING (slug) WHERE b.status = 'rejected') <> 12 THEN
    RAISE EXCEPTION 'Expected exactly 12 reversibly archived scoped businesses';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.businesses b
    JOIN spotlight_business_media_plan p USING (slug)
    WHERE b.status = 'approved'
      AND (
        b.logo_url IS NULL OR b.cover_url IS NULL OR
        b.logo_url LIKE '%placeholder-logo%' OR
        b.cover_url LIKE '%hero-bg%' OR
        b.cover_url = 'https://spotlightpuertorico.com/opengraph.jpg'
      )
  ) THEN
    RAISE EXCEPTION 'An approved scoped business still has missing or generic media';
  END IF;
END $$;

COMMIT;
`;

const restoreSql = `-- Reverses only the status/logo/cover changes made by 2026-11-01-v1.
-- Full business records and relationships were never deleted.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('spotlight-business-image-remediation-2026-11-01'));

DO $$
BEGIN
  IF (SELECT count(*) FROM spotlight_ops.spotlight_business_media_backup_20261101) < 44 THEN
    RAISE EXCEPTION 'Cannot restore: complete 44-row backup is missing';
  END IF;
END $$;

INSERT INTO spotlight_ops.spotlight_business_media_audit
  (business_id, slug, action, reason, before_state, after_state, manifest_version)
SELECT
  b.id,
  b.slug,
  'restore',
  'Operator-requested rollback to pre-remediation status and media URLs.',
  jsonb_build_object('status', b.status, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'updated_at', b.updated_at),
  jsonb_build_object(
    'status', backup.record_snapshot->>'status',
    'logo_url', backup.record_snapshot->'logo_url',
    'cover_url', backup.record_snapshot->'cover_url',
    'updated_at', backup.record_snapshot->>'updated_at'
  ),
  '2026-11-01-v1'
FROM public.businesses b
JOIN spotlight_ops.spotlight_business_media_backup_20261101 backup ON backup.business_id = b.id;

UPDATE public.businesses b
SET
  status = (backup.record_snapshot->>'status')::public.business_status,
  logo_url = backup.record_snapshot->>'logo_url',
  cover_url = backup.record_snapshot->>'cover_url',
  updated_at = (backup.record_snapshot->>'updated_at')::timestamp
FROM spotlight_ops.spotlight_business_media_backup_20261101 backup
WHERE backup.business_id = b.id;

COMMIT;
`;

const dryRunSql = applySql.replace(
  /\nCOMMIT;\n$/,
  "\n-- Dry run: all backup, update, archive, audit, and reconciliation statements succeeded.\nROLLBACK;\n",
);

const reconcilerSlugs = records.map((record) => sqlString(record.slug)).join(",\n    ");
const reconcileSql = `-- Read-only post-apply reconciliation for manifest 2026-11-01-v1.
WITH scoped AS (
  SELECT * FROM public.businesses
  WHERE slug IN (
    ${reconcilerSlugs}
  )
)
SELECT
  count(*) AS scoped_total,
  count(*) FILTER (WHERE status = 'approved') AS approved_total,
  count(*) FILTER (WHERE status = 'rejected') AS archived_total,
  count(*) FILTER (
    WHERE status = 'approved' AND (
      logo_url IS NULL OR cover_url IS NULL OR
      logo_url LIKE '%placeholder-logo%' OR
      cover_url LIKE '%hero-bg%' OR
      cover_url = 'https://spotlightpuertorico.com/opengraph.jpg'
    )
  ) AS invalid_public_media,
  (SELECT count(*) FROM spotlight_ops.spotlight_business_media_backup_20261101) AS backup_rows,
  (SELECT count(*) FROM spotlight_ops.spotlight_business_media_audit WHERE manifest_version = '2026-11-01-v1' AND action <> 'restore') AS audited_changes
FROM scoped;

-- Expected: scoped_total=44, approved_total=32, archived_total=12,
-- invalid_public_media=0, backup_rows>=44, audited_changes=40.
`;

await writeFile(join(OUT_DIR, "apply-production-remediation.sql"), applySql);
await writeFile(join(OUT_DIR, "dry-run-production-remediation.sql"), dryRunSql);
await writeFile(join(OUT_DIR, "reconcile-production-remediation.sql"), reconcileSql);
await writeFile(join(OUT_DIR, "restore-production-remediation.sql"), restoreSql);
console.log(JSON.stringify({ total: records.length, ...counts, outDir: OUT_DIR }, null, 2));
