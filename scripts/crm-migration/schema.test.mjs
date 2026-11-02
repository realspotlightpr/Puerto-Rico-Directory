import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../../supabase/migrations/20261101160627_first_party_crm.sql", import.meta.url), "utf8");
const checkpoint = await readFile(new URL("../../supabase/migrations/20261101162428_production_rollout_checkpoint.sql", import.meta.url), "utf8");
const hardening = await readFile(new URL("../../supabase/migrations/20261101162532_harden_legacy_trigger_functions.sql", import.meta.url), "utf8");
const messagingFoundation = await readFile(new URL("../../supabase/migrations/20261102182740_signup_crm_and_twilio_foundation.sql", import.meta.url), "utf8");
const eventFunction = await readFile(new URL("../../supabase-functions/crm-event/index.ts", import.meta.url), "utf8");
const twilioWebhook = await readFile(new URL("../../supabase-functions/twilio-webhook/index.ts", import.meta.url), "utf8");
const phoneLogin = await readFile(new URL("../../supabase-functions/phone-login/index.ts", import.meta.url), "utf8");

test("CRM migration enables RLS and revokes direct writes", () => {
  for (const table of ["crm_contacts", "crm_conversations", "crm_messages", "crm_consents", "crm_events", "crm_audit_log", "crm_migration_batches"]) assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  assert.match(migration, /revoke all on[\s\S]+from anon, authenticated/i);
  assert.doesNotMatch(migration, /auth\.role\(\)/i);
});

test("CRM model preserves consent provenance, audit, idempotency, and migration checkpoints", () => {
  assert.match(migration, /idempotency_key text not null unique/i);
  assert.match(migration, /provenance text not null/i);
  assert.match(migration, /crm_audit_log/i);
  assert.match(migration, /crm_migration_items/i);
  assert.match(migration, /export_checksum text not null/i);
});

test("business and message deletion paths have recoverable archive columns", () => {
  assert.match(migration, /businesses add column if not exists archived_at/i);
  assert.match(migration, /form_submissions add column if not exists archived_at/i);
});

test("CRM event delivery authorizes actions and resolves recipients from Supabase", () => {
  assert.match(eventFunction, /Admin access required/);
  assert.match(eventFunction, /Business owner access required/);
  assert.match(eventFunction, /Business is not available for inquiries/);
  assert.match(eventFunction, /owner_contact_email \|\| business\.email/);
  assert.match(eventFunction, /\.eq\("id", businessId\)/);
});

test("production checkpoint is private, complete, and hash-verifiable", () => {
  assert.match(checkpoint, /create schema if not exists spotlight_ops/i);
  assert.match(checkpoint, /revoke all on schema spotlight_ops from public, anon, authenticated/i);
  assert.match(checkpoint, /businesses_before_20261101/i);
  assert.match(checkpoint, /media_items_before_20261101/i);
  assert.match(checkpoint, /snapshot_hashes jsonb not null/i);
  assert.match(checkpoint, /pg_get_functiondef/i);
});

test("trigger-only privileged functions are not exposed as RPCs", () => {
  assert.match(hardening, /revoke all on function public\.sync_new_user_to_ghl\(\) from public, anon, authenticated/i);
  assert.match(hardening, /revoke all on function public\.sync_influencer_to_ghl\(\) from public, anon, authenticated/i);
  assert.match(hardening, /alter function public\.guide_available_cents\(text\) set search_path = ''/i);
});

test("signup CRM capture is private, idempotent, and preserves explicit SMS consent", () => {
  assert.match(messagingFoundation, /spotlight_ops\.sync_user_signup_to_crm/i);
  assert.match(messagingFoundation, /user-signup:/i);
  assert.match(messagingFoundation, /web_signup_checkbox/i);
  assert.match(messagingFoundation, /sms_transactional_consent/i);
  assert.match(messagingFoundation, /revoke all on function spotlight_ops\.sync_user_signup_to_crm/i);
});

test("Twilio webhooks fail closed and persist suppression and callback state", () => {
  assert.match(twilioWebhook, /verifyTwilioSignature/);
  assert.match(twilioWebhook, /crm_provider_events/);
  assert.match(twilioWebhook, /crm_suppressions/);
  assert.match(twilioWebhook, /twilio_inbound_stop/);
  assert.match(phoneLogin, /CRM_MESSAGING_ENABLED/);
  assert.match(phoneLogin, /Too many text-login requests/);
});
