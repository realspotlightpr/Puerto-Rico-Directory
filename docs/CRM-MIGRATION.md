# HighLevel to Supabase CRM migration

Supabase Postgres is Spotlight Puerto Rico's only CRM system of record. Supabase Auth and RLS control access; Edge Functions orchestrate provider-neutral events; Resend sends email and Twilio sends SMS. Cloudflare is not required for CRM storage, migration, or delivery.

## Zero-loss migration contract

The migration includes contacts, existing businesses, contact/business relationships, communications and delivery attempts, consent history and provenance, workflows, tags, and audit history. Nothing is deleted from HighLevel during import or verification.

Every source export must contain:

- a source-generated immutable ID per record;
- an export timestamp and collection counts;
- contacts, businesses, communications, consent, workflows, tags, and delivery history;
- original timestamps and provider message IDs;
- consent source, channel, purpose, status, and captured time.

Run `node scripts/crm-migration/validate-export.mjs export.json report.json` before import. The validator checks declared counts, duplicate identities, referential integrity, consent provenance, delivery references, and a SHA-256 checksum. It never changes a database and refuses to overwrite an existing report.

## Checkpoints and rollback

1. Take a Supabase physical backup or point-in-time recovery checkpoint and record its recovery timestamp.
2. Export HighLevel data and store the immutable original in encrypted, access-controlled storage. Record its checksum outside the export directory.
3. Validate the export. Resolve all errors; document duplicate-identity merge decisions without removing source records.
4. Insert a `crm_migration_batches` row with source counts, checksum, backup location, rollback deadline, and `validated` status.
5. Import in this order: tags, contacts, businesses/relationships, consent, conversations/messages, delivery attempts, workflows, audit references.
6. Upsert each record by `(source, source_id)` and record every result in `crm_migration_items`. Never match solely by display name.
7. Commit in bounded batches. After each batch, save the source cursor and imported counts in the migration checkpoint.
8. Reconcile per-entity counts, distinct source IDs, timestamp ranges, provider IDs, and sampled content hashes. A batch cannot become `completed` while any item is `failed` or counts differ.
9. Run both systems in observation mode. Suppress first-party delivery until Twilio and Resend credentials, consent behavior, and templates are verified.
10. Enable `CRM_MESSAGING_ENABLED=true`, leave HighLevel fallback enabled, and compare delivery results for each event type.
11. Disable fallback only after a signed reconciliation report shows zero unexplained differences.

Rollback is batch-scoped. Mark imported records from the failed batch as rolled back or soft-deleted using `crm_migration_items.target_id`; do not delete pre-existing Spotlight records. Restore the Supabase checkpoint only for systemic corruption, not ordinary row-level import errors. HighLevel remains read-only until the rollback deadline expires.

## Cutover flags

- `CRM_MESSAGING_ENABLED`: enables Resend/Twilio dispatch in `crm-event`; default must remain false until verified.
- `VITE_ENABLE_HIGHLEVEL_FALLBACK`: frontend fallback during observation.
- `ENABLE_HIGHLEVEL_FALLBACK`: admin invitation fallback during observation.

## Safe deployment order

1. Apply `supabase/migrations/20261101160627_first_party_crm.sql` and verify every CRM table has RLS enabled.
2. Deploy `crm-event` and `crm-admin` with `CRM_MESSAGING_ENABLED=false`.
3. Deploy the updated `admin-invite` function, keeping both HighLevel fallback flags enabled.
4. Deploy the web application. Archived rows are filtered by the application, so the database migration must be live first.
5. Import and reconcile the validated export, then test authenticated owner, admin, and inquiry authorization paths.
6. Configure Twilio and Resend, enable first-party messaging, and complete the observation period before disabling either fallback flag.

## Required Supabase Edge Function secrets

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEYS` and the referenced platform-managed publishable-key variable (legacy `SUPABASE_ANON_KEY` remains a temporary fallback)
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`
- `TWILIO_INBOUND_WEBHOOK_URL`
- `TWILIO_STATUS_CALLBACK_URL`
- `TWILIO_ADVANCED_OPTOUT_ENABLED` (`true` when Messaging Service Advanced Opt-Out owns STOP/START/HELP replies)
- `TWILIO_HELP_MESSAGE` (only used when Advanced Opt-Out is disabled)
- `CRM_MESSAGING_ENABLED`

The service-role key and provider credentials must never enter Vite variables, browser bundles, database columns, logs, migration exports, or audit metadata.

Browser and static-generation builds use `VITE_SUPABASE_PUBLISHABLE_KEY`. Do not restore a legacy anon JWT to committed deployment configuration.

## Remaining HighLevel cutover work

The authoritative parity and acceptance checklist is `docs/CRM-PARITY-CHECKLIST.md`.

- Obtain and validate a complete HighLevel export.
- Map the real export fields to the canonical validated bundle and run a dry-run reconciliation before writing production records.
- Replace the social planner with direct social-platform OAuth adapters.
- Replace `login.spotlightpuertorico.com/payment-link/*` checkout URLs with the chosen payment processor and first-party entitlement webhooks.
- Verify Twilio status callbacks, inbound STOP/START handling, Resend delivery webhooks, and suppression propagation.
- After observation, remove fallback functions, `/highlevel/*` routes, `businesses.highlevel_api_key`, and HighLevel secrets in a separately reviewed migration.
