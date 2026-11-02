# Business image remediation

Audit date: 2026-11-01 (America/New_York)

## Outcome

The production sitemap exposed 44 approved business listings. The audit checked every listing's generated JSON-LD, fetched every populated image, visually reviewed the imagery, and rejected missing, generic, broken, ambiguous, or low-resolution media.

The transaction plan is:

- Keep 4 listings unchanged because both existing images are reachable, business-specific, and dimensionally acceptable.
- Update 21 listings with a 512×512 WebP logo fallback derived from that listing's visually verified business-specific cover.
- Update 7 listings with both logo and cover assets. Six use verified public business sources; Olympic Travel & Tours uses optimized derivatives of its existing verified business image because its original cover was below the display-size floor.
- Reversibly archive 12 listings by changing `status` from `approved` to `rejected`. No row or relationship is deleted.

After authorized application, 32 scoped listings remain public and all 32 have a non-generic logo and cover. The 12 archived listings remain fully recoverable.

## Reversible archive set

- Adorno Bakery
- Bermudas
- El qioskuito del norte
- Frozen Ice
- GS Contractors LLC
- Homemade Cookies PR
- Infinto
- JRC Tax & Accounting
- Multinational
- Oro Norte
- Pina Colada Stand
- Pito Sandwhich

These listings were not given uncertain imagery. The exact per-record reason is in the JSON/CSV manifest.

## Files

- `business-image-manifest.json` is the canonical 44-row plan with current values, target values, action, reason, and provenance.
- `business-image-manifest.csv` is the same plan for review/import tooling.
- `business-image-backup.csv` captures the public pre-change state for all 44 records. The authorized SQL takes a second, full private-row snapshot inside the database before mutation.
- `keep-manifest.csv`, `update-manifest.csv`, and `archive-manifest.csv` are review-friendly exact subsets.
- `apply-production-remediation.sql` creates full-record backup and audit tables in the non-exposed `spotlight_ops` schema, validates the 44-row scope, applies media updates, archives unresolved rows, and validates the final 32/12 split in one transaction.
- `dry-run-production-remediation.sql` executes the same transaction and validation path but ends with `ROLLBACK`.
- `reconcile-production-remediation.sql` is a read-only post-apply check with exact expected totals.
- `restore-production-remediation.sql` restores the backed-up status and media URLs. Relationships are never removed.
- Prepared WebP files live under `artifacts/spotlight-pr/public/images/businesses/<slug>/`.
- `scripts/generate-business-image-manifest.mjs` reproducibly rebuilds the manifests and SQL from the live sitemap.
- `scripts/validate-business-image-assets.mjs` validates reachability, generic-art rejection, and minimum dimensions.

## Authorized production application

1. Review the CSV/JSON and deploy the new static assets first.
2. Confirm every new `https://spotlightpuertorico.com/images/businesses/...` URL returns HTTP 200 after deployment.
3. Take the normal platform/database backup.
4. Run `dry-run-production-remediation.sql` through an authorized Supabase SQL session. It exercises backup, audit, updates, archive, and reconciliation, then rolls everything back.
5. Only after a clean dry run, run `apply-production-remediation.sql`. It acquires the same advisory transaction lock and creates `spotlight_ops.spotlight_business_media_backup_20261101` before changing any row.
6. Run `reconcile-production-remediation.sql` and require `44 / 32 / 12 / 0 / >=44 / 40` for scoped, approved, archived, invalid media, backups, and audited changes.
7. Rebuild and redeploy the site so static business pages and `sitemap-businesses.xml` reflect the 32 approved records.
8. Run the validator and smoke-test `/directory` plus a sample of updated detail pages.

Do not run the SQL before the new assets are publicly deployed. If any validation block raises an exception, the transaction rolls back.

## Production application status

Applied on 2026-11-01 after all 35 new static asset URLs returned HTTP 200, the 44-row transaction passed under `ROLLBACK`, and a private production checkpoint was verified. Post-apply reconciliation returned `44 / 32 / 12 / 0 / 44 / 40` for scoped, approved, archived, invalid media, backups, and audited changes. The browser/build configuration now uses the project's modern publishable key rather than the legacy anon JWT.

## Media policy used

- No generated or fabricated brands.
- No private content.
- Official business pages were preferred.
- Existing listing-owned business photos were reused only after visual verification.
- Ambiguous identities and stock-style covers were archived instead of guessed.
- Logos are 512×512 WebP; prepared covers are 1600×900 WebP.
