# Production Supabase rollout — 2026-11-01

Project: `spotlight-pr-production` (`zswvumzbtikzvwgtpprw`)

## Applied and verified

- Created the private `spotlight_ops` schema and checkpointed all 70 businesses, 8 media items, 0 form submissions, and 11 legacy communications rows. Row hashes and both HighLevel trigger definitions were preserved. `anon` and `authenticated` have no access to the checkpoint schema.
- Applied the additive first-party CRM migration: 14 CRM tables, four archive columns, five disabled automation definitions, RLS on every CRM table, and no direct authenticated write grants.
- Deployed `crm-event` and `crm-admin` version 1 with platform JWT verification enabled. Anonymous invocation returns HTTP 401 for both functions.
- Revoked direct `anon`/`authenticated` execution from ten trigger-only `SECURITY DEFINER` functions while confirming all ten trigger bindings remained enabled. This includes both HighLevel sync triggers; their trigger behavior was intentionally preserved.
- Restricted `claim_business(integer)` and `is_team_member_with(text)` to authenticated/service-role execution.
- Fixed the mutable search path on `guide_available_cents(text)` and `influencer_available_cents(bigint)`.
- Applied the reversible 44-listing business-media remediation. Reconciliation: 32 approved, 12 archived, 0 approved listings with missing/generic media, 44 private backups, and 40 audit rows.
- Replaced the committed legacy browser anon JWT with the enabled modern publishable key configuration.

## Security Advisor disposition

Fixed:

- Mutable function search path: 2 → 0.
- Externally executable trigger-only `SECURITY DEFINER` functions: 10 removed from both anon and authenticated RPC surfaces.
- Anonymous access to two authenticated-only RPC helpers removed.

Intentional or deferred:

- Seven CRM operational tables report “RLS enabled, no policy.” This is intentional deny-by-default behavior; only service-role Edge Functions access them.
- Five remaining anonymously executable `SECURITY DEFINER` helpers are tied to public profile/count/analytics or existing RLS helper behavior and require an application compatibility review before further restriction.
- Seven authenticated `SECURITY DEFINER` helpers are existing RPC/RLS helpers. Their bodies and callers must be migrated individually rather than disabled globally.
- Leaked-password protection remains disabled. Enable it in Supabase Auth settings after confirming the product plan and user-impact policy.
- The legacy `highlevel` Edge Function has platform JWT verification, but its action router does not perform per-action authorization. Existing database triggers invoke it with the legacy anon JWT, so restricting it to admins/service role requires a coordinated trigger-auth migration rather than an isolated function redeploy.
- `import-ghl-businesses` performs its own admin-user check but is deployed with gateway JWT verification disabled. Re-enable gateway verification only after confirming every operational caller sends a user access token.
- `import-ghl-owners` is deployed with gateway JWT verification disabled and uses a shared-secret header with a source-level fallback. Rotate it to a configured secret or authenticated-admin access, then remove the fallback in the same maintenance window.

Relevant Advisor documentation:

- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Deliberately not removed

- Live `highlevel`, `import-ghl-businesses`, `import-ghl-owners`, database triggers, HighLevel columns, and secrets remain intact.
- `CRM_MESSAGING_ENABLED` must remain false until Resend/Twilio credentials, status callbacks, consent/suppression handling, and parity checks are complete.
- No HighLevel data was deleted and no legacy secret value was read or printed.
- No Netlify/frontend production deployment was performed; the modern publishable-key configuration is currently a repository change only.

## Credentials and cutover prerequisites

- A user-scoped Supabase Personal Access Token is required for the CLI to verify production Edge Function secret names. Do not place provider secret values in source control or chat.
- Expected first-party provider secret names: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`.
- Keep `CRM_MESSAGING_ENABLED=false` until dry-run/parity tests, consent and suppression behavior, provider callbacks, and rollback procedures have been verified.

## Follow-up revalidation

Revalidated later on 2026-11-01 without enabling messaging or changing HighLevel:

- Supabase reports `ACTIVE_HEALTHY`; Postgres remains on 17.6.1.127 in `us-east-1`.
- `crm-event` and `crm-admin` remain active at version 1 with gateway JWT verification enabled. Anonymous POST probes return HTTP 401 for both.
- All 14 first-party CRM tables still have RLS enabled, authenticated direct-write grants remain zero, all five automations remain disabled, and the CRM contains zero contacts, events, and messages.
- The exact media reconciliation remains `44 / 32 / 12 / 0 / 44 / 40` for scoped, approved, archived, invalid, backup, and audited rows. The local image validator passes.
- The enabled modern publishable key matches `netlify.toml`. A direct Data API probe returns HTTP 200 for public business reads, while anonymous CRM contact reads are denied as intended.
- The production frontend build passes from a temporary path without `#`, generating 500 SEO pages, 32 business app shells, and 32 sitemap entries. Vite cannot resolve `/src/main.tsx` from the repository's current path because the folder name contains `#`.
- CRM tests pass 13/13 and application policy tests pass 6/6.
- Security Advisor remains unchanged: seven deny-by-default CRM operational tables produce informational no-policy findings; the remaining warnings are the documented legacy `SECURITY DEFINER` RPCs and disabled leaked-password protection.
- Performance Advisor identifies ten missing covering indexes on new CRM foreign keys and five duplicated admin/owner permissive SELECT-policy pairs. These are non-cutover follow-up optimizations and should be addressed in a separately reviewed migration.

The current execution environment does not contain `SUPABASE_ACCESS_TOKEN`, Resend credentials, Twilio credentials, or `CRM_MESSAGING_ENABLED`. Production Edge Function secret names therefore remain unverified, and provider parity testing has not started.

## Rollback

- CRM schema rollout is additive. Existing application tables retain their original data; new archive columns initially contain null values.
- The full pre-rollout data checkpoint is under `spotlight_ops.*_before_20261101`.
- Business-media status/logo/cover changes can be restored with `docs/business-image-audit/restore-production-remediation.sql`.
- Do not drop the checkpoint or media backup/audit tables until the observation and rollback windows close.
