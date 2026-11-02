# GoHighLevel replacement parity checklist

Updated: 2026-11-02 (America/New_York)

## Safety state

- Production Supabase is healthy and remains the system of record.
- `CRM_MESSAGING_ENABLED` is not enabled. No first-party outbound message has been sent.
- Legacy HighLevel functions, columns, credentials, and triggers remain available for rollback.
- Controlled tests must use one explicitly authorized recipient. Never test against existing customers.

## Current signup path

| Step | Current implementation | Status | Remaining dependency |
|---|---|---:|---|
| Account creation | Browser calls Supabase Auth `signUp` with email/password and profile metadata | Ready | None |
| Email verification | Supabase Auth owns the confirmation email and resend operation | Ready in repository; frontend deploy pending | Production SMTP policy/provider |
| Public user profile | `auth.users` trigger creates/updates `public.users` | Live | None |
| CRM contact creation | Private database trigger upserts `crm_contacts`; 38 existing Auth users were backfilled | Live | None |
| SMS consent | Dedicated optional checkbox records versioned transactional consent evidence | Ready in repository; frontend deploy pending | Final legal/compliance approval of disclosure |
| Signup CRM event/audit | New signups create idempotent `user.signed_up` and `crm.signup.captured` records | Live for future signups | None |
| Welcome/confirmation message | Supabase Auth confirmation email; no duplicate CRM welcome while messaging is disabled | Safe | Resend only if a separate branded lifecycle email is approved |
| Phone login | Production still uses HighLevel; replacement Twilio implementation is prepared but not deployed | Blocked | Twilio account, approved sender, credentials, callback URLs |

## Messaging parity matrix

| Capability | Supabase-native implementation | Production state | Remaining work |
|---|---|---:|---|
| Contact identity/upsert | `crm_contacts`, normalized email/E.164 phone, Auth linkage | Live | Observe duplicate handling during test signup |
| Consent provenance | `crm_consents` with channel, purpose, status, policy version, evidence | Live | Deploy signup UI; approve disclosure language |
| Email confirmation/resend | Supabase Auth confirmation and `auth.resend` | Repository-ready | Deploy frontend; verify SMTP configuration and link redirects |
| Listing submitted/approved/rejected | Provider-neutral templates and audited messages | Code deployed, sends disabled | Resend credentials; controlled event tests |
| Owner inquiry alert | Email and consent-gated SMS templates | Code deployed, sends disabled | Connect and verify the production inquiry caller |
| Review notification | Email and consent-gated SMS templates | Code deployed, sends disabled | Add parallel first-party review trigger before HighLevel removal |
| Booking requested/confirmed | Email and consent-gated SMS templates | Code deployed, sends disabled | Add parallel first-party booking triggers before HighLevel removal |
| Admin invitation | Resend/Twilio path with HighLevel fallback | Code present, sends disabled | Provider credentials; consent decision for invited-recipient SMS |
| Outbound suppression | Active email/SMS suppression checked before every CRM delivery and retry | Live schema and deployed function | End-to-end STOP test |
| Inbound SMS | Signature-verified Twilio webhook creates contact, conversation, inbound message, audit record | Deployed fail-closed | Twilio auth token, sender, webhook configuration |
| STOP/START | Records suppression plus withdrawn/granted transactional consent; honors Twilio Advanced Opt-Out | Deployed fail-closed | Confirm Messaging Service Advanced Opt-Out configuration |
| HELP | Records/audits HELP; optional TwiML fallback when Advanced Opt-Out is disabled | Deployed fail-closed | Approve support address/text |
| Delivery callbacks | Idempotent provider-event ledger updates message and attempt status | Deployed fail-closed | Configure Twilio status callback and execute lifecycle test |
| Retries | Admin-only, maximum three, failed-only, provider-ID guard, consent/suppression recheck | Backend deployed; UI deploy pending | Controlled failure/retry test |
| Admin monitoring | Provider-neutral sent/received/failed/skipped state plus callback-error and suppression counts | Backend deployed; UI deploy pending | Add dashboard cards if operators need continuous monitoring |
| Audit history | Actor, request ID, before/after state and provider webhook actions | Live | Retention period decision |
| HighLevel rollback | Legacy functions/triggers remain enabled | Live | Remove only after observation window |

## Controlled end-to-end acceptance test

Do not start until Twilio/Resend secrets and an approved test recipient are available.

1. Create a brand-new test account with a unique email and the authorized phone number.
2. Confirm `auth.users`, `public.users`, `crm_contacts`, `user.signed_up`, and `crm.signup.captured` reconcile to one identity.
3. Confirm the selected SMS consent state and exact evidence record.
4. Confirm Supabase Auth delivers one verification email and the link creates a valid session.
5. Request phone login; verify rate-limit event, outbound message, delivery attempt, Twilio SID, callback progression, and successful magic-link session.
6. Send an inbound ordinary reply; verify one provider event, one inbound message, one conversation update, and one audit row.
7. Send `HELP`; verify audit state and exactly one provider or fallback response.
8. Send `STOP`; verify active suppression and withdrawn consent, then prove subsequent outbound SMS is skipped.
9. Send `START`; verify suppression is lifted and consent evidence is restored according to the approved policy.
10. Force a provider failure; verify visible admin error detail, one bounded retry, no duplicate accepted message, and final callback state.
11. Exercise listing approval, inquiry, review, booking request, booking confirmation, and admin invitation against test records only.
12. Reconcile provider dashboards, `crm_messages`, `crm_delivery_attempts`, `crm_provider_events`, consent, suppression, and audit counts.

## Cutover gates

- Twilio account is paid and secured with MFA.
- A sender is purchased and approved for Puerto Rico traffic.
- A2P 10DLC Brand/Campaign or toll-free verification is approved before US-operator production traffic.
- Twilio secrets exist only in Supabase Edge Function secrets.
- Resend sender domain and `RESEND_FROM_EMAIL` are verified.
- Inbound and status callback URLs are configured exactly as the signed URLs stored in secrets.
- Consent wording, HELP text, retention, support ownership, and allowed message categories are approved.
- All acceptance tests pass with `CRM_MESSAGING_ENABLED=true` only for the controlled test window.
- A fresh rollback checkpoint is recorded immediately before routing production events to the new providers.
- HighLevel remains available through an agreed observation window; no data or credential is removed during that window.

## Explicit user/compliance decisions

1. Sign in to an existing Twilio account or create one with the chosen business email and complete personal OTP/MFA.
2. Choose local long-code plus A2P 10DLC, or verified toll-free, as the production sender strategy.
3. Provide the legal business identity and authorized representative for registration.
4. Approve the signup SMS disclosure and the exact HELP response.
5. Choose the authorized test recipient and observation-window length.
6. Choose the Resend sender domain/address for transactional email.
