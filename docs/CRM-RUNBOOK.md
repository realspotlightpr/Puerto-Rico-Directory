# CRM operations runbook

## Daily checks

- Review failed and stuck messages in Admin → Communications.
- Review `crm_events` in `failed` or `dead_letter` state and events locked longer than 15 minutes.
- Confirm Twilio and Resend provider dashboards agree with Supabase delivery counts.
- Investigate count differences before retrying; never replay an event with a new idempotency key.

## Retry procedure

1. Confirm the recipient, consent/legal basis, and current suppression state.
2. Confirm no provider message ID was accepted for the failed attempt.
3. Increment the event attempt count and reuse the existing event and message IDs.
4. Add a new `crm_delivery_attempts` row; never overwrite the failed attempt.
5. Record the operator, reason, and result in `crm_audit_log`.

## Provider incident

Set `CRM_MESSAGING_ENABLED=false` to stop new sends while retaining source events. Do not delete pending events. If observation fallback is still active, decide explicitly whether HighLevel delivery should continue; avoid sending through both providers. Resume oldest events first after provider recovery and monitor suppression/STOP responses.

## Migration incident

Pause the batch, preserve the source export and checksum, and mark the batch `failed`. Reconcile the last completed checkpoint. Roll back only records listed in `crm_migration_items` for that batch, using soft deletion where possible. Restore a Supabase backup only when referential or systemic corruption cannot be repaired safely.

## Access and retention

- Admins may view all CRM records; business owners may view only contacts, conversations, messages, and consent tied to businesses they own.
- All writes use Edge Functions and the service role. Browser clients are read-only under RLS.
- Keep provider payloads minimal. Never store credentials or full provider headers.
- Retain consent and audit history according to legal requirements; use pseudonymization rather than deletion when an audit obligation remains.
- Define production retention periods for message bodies, provider responses, migration exports, and audit records before cutover.
- Review service-role access and Edge Function secrets quarterly and rotate credentials after personnel or vendor changes.
