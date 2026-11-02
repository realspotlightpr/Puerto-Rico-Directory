-- Credential-independent signup and provider-webhook foundation.
-- Outbound delivery remains controlled by CRM_MESSAGING_ENABLED in Edge Functions.

create unique index if not exists crm_contacts_auth_user_unique
  on public.crm_contacts(auth_user_id)
  where auth_user_id is not null and deleted_at is null;

create table if not exists public.crm_suppressions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.crm_contacts(id) on delete set null,
  channel text not null check (channel in ('email', 'sms')),
  recipient text not null,
  reason text not null,
  source text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lifted_at timestamptz,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object')
);
create unique index if not exists crm_suppressions_active_recipient
  on public.crm_suppressions(channel, recipient)
  where active;
create index if not exists crm_suppressions_contact
  on public.crm_suppressions(contact_id, channel, active)
  where contact_id is not null;

create table if not exists public.crm_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  event_type text not null,
  provider_message_id text,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (provider, event_key)
);
create index if not exists crm_provider_events_message
  on public.crm_provider_events(provider, provider_message_id, created_at desc)
  where provider_message_id is not null;

alter table public.crm_suppressions enable row level security;
alter table public.crm_provider_events enable row level security;
revoke all on public.crm_suppressions, public.crm_provider_events from public, anon, authenticated;
grant all on public.crm_suppressions, public.crm_provider_events to service_role;

create or replace function public.crm_set_suppression_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.crm_set_suppression_updated_at() from public, anon, authenticated;
grant execute on function public.crm_set_suppression_updated_at() to service_role;
drop trigger if exists crm_suppressions_updated_at on public.crm_suppressions;
create trigger crm_suppressions_updated_at
before update on public.crm_suppressions
for each row execute function public.crm_set_suppression_updated_at();

-- Cover new CRM foreign keys reported by the Performance Advisor.
create index if not exists crm_automation_runs_event_id on public.crm_automation_runs(event_id);
create index if not exists crm_consents_captured_by on public.crm_consents(captured_by) where captured_by is not null;
create index if not exists crm_contact_tags_assigned_by on public.crm_contact_tags(assigned_by) where assigned_by is not null;
create index if not exists crm_contact_tags_tag_id on public.crm_contact_tags(tag_id);
create index if not exists crm_conversations_assigned_user on public.crm_conversations(assigned_user_id) where assigned_user_id is not null;
create index if not exists crm_events_actor_user on public.crm_events(actor_user_id) where actor_user_id is not null;
create index if not exists crm_messages_business_id on public.crm_messages(business_id) where business_id is not null;
create index if not exists crm_messages_conversation_id on public.crm_messages(conversation_id) where conversation_id is not null;
create index if not exists crm_messages_event_id on public.crm_messages(event_id) where event_id is not null;
create index if not exists crm_migration_batches_started_by on public.crm_migration_batches(started_by) where started_by is not null;

create or replace function spotlight_ops.sync_user_signup_to_crm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_row auth.users%rowtype;
  contact_id_value uuid;
  normalized_email text;
  normalized_phone text;
  phone_digits text;
  sms_choice text;
  sms_status text;
  event_inserted integer := 0;
begin
  select * into auth_row from auth.users where id::text = new.id;
  if not found then
    return new;
  end if;

  normalized_email := nullif(lower(trim(coalesce(new.email, auth_row.email))), '');
  phone_digits := regexp_replace(coalesce(new.phone, auth_row.raw_user_meta_data->>'phone', ''), '\\D', '', 'g');
  normalized_phone := case
    when length(phone_digits) = 10 then '+1' || phone_digits
    when length(phone_digits) = 11 and phone_digits like '1%' then '+' || phone_digits
    when length(phone_digits) between 8 and 15 then '+' || phone_digits
    else null
  end;

  select id into contact_id_value
  from public.crm_contacts
  where deleted_at is null and (
    auth_user_id = auth_row.id
    or (normalized_email is not null and email = normalized_email)
    or (normalized_phone is not null and phone_e164 = normalized_phone)
  )
  order by (auth_user_id = auth_row.id) desc, updated_at desc
  limit 1;

  if contact_id_value is null then
    insert into public.crm_contacts (
      source, source_id, auth_user_id, first_name, last_name, email, phone_e164, attributes
    ) values (
      'spotlight', 'auth:' || auth_row.id::text, auth_row.id,
      nullif(trim(new.first_name), ''), nullif(trim(new.last_name), ''),
      normalized_email, normalized_phone,
      jsonb_build_object('signup_via', coalesce(auth_row.raw_user_meta_data->>'signup_via', 'unknown'))
    ) returning id into contact_id_value;
  else
    update public.crm_contacts set
      auth_user_id = auth_row.id,
      source_id = coalesce(source_id, 'auth:' || auth_row.id::text),
      first_name = coalesce(nullif(trim(new.first_name), ''), first_name),
      last_name = coalesce(nullif(trim(new.last_name), ''), last_name),
      email = coalesce(normalized_email, email),
      phone_e164 = coalesce(normalized_phone, phone_e164),
      attributes = attributes || jsonb_build_object('signup_via', coalesce(auth_row.raw_user_meta_data->>'signup_via', 'unknown'))
    where id = contact_id_value;
  end if;

  sms_choice := auth_row.raw_user_meta_data->>'sms_transactional_consent';
  if normalized_phone is not null and sms_choice in ('true', 'false') and not exists (
    select 1 from public.crm_consents c
    where c.contact_id = contact_id_value
      and c.channel = 'sms'
      and c.purpose = 'transactional'
      and c.provenance = 'web_signup_checkbox'
  ) then
    sms_status := case when sms_choice = 'true' then 'granted' else 'denied' end;
    insert into public.crm_consents (
      contact_id, channel, purpose, status, provenance, policy_version,
      captured_at, captured_by, evidence
    ) values (
      contact_id_value, 'sms', 'transactional', sms_status,
      'web_signup_checkbox', '2026-11-02', auth_row.created_at, auth_row.id,
      jsonb_build_object(
        'signup_via', coalesce(auth_row.raw_user_meta_data->>'signup_via', 'unknown'),
        'disclosure', 'Essential account and service text messages; message and data rates may apply; reply STOP to opt out or HELP for help.'
      )
    );
  end if;

  insert into public.crm_events (
    idempotency_key, event_type, subject_type, subject_id, actor_user_id,
    payload, status, attempt_count, processed_at
  ) values (
    'user-signup:' || auth_row.id::text, 'user.signed_up', 'auth_user', auth_row.id::text, auth_row.id,
    jsonb_build_object(
      'contactId', contact_id_value,
      'signupVia', coalesce(auth_row.raw_user_meta_data->>'signup_via', 'unknown'),
      'smsConsent', coalesce(sms_status, 'not_captured')
    ),
    'processed', 1, now()
  ) on conflict (idempotency_key) do nothing;
  get diagnostics event_inserted = row_count;

  if event_inserted = 1 then
    insert into public.crm_audit_log (
      actor_user_id, actor_type, action, entity_type, entity_id, request_id, after_state, metadata
    ) values (
      auth_row.id, 'system', 'crm.signup.captured', 'crm_contact', contact_id_value::text,
      'user-signup:' || auth_row.id::text,
      jsonb_build_object('authUserId', auth_row.id, 'smsConsent', coalesce(sms_status, 'not_captured')),
      jsonb_build_object('source', 'public.users trigger')
    );
  end if;

  return new;
exception when others then
  -- Account creation must never fail because CRM capture failed.
  raise warning 'sync_user_signup_to_crm failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

revoke all on function spotlight_ops.sync_user_signup_to_crm() from public, anon, authenticated;
grant execute on function spotlight_ops.sync_user_signup_to_crm() to service_role;

drop trigger if exists on_public_user_created_sync_crm on public.users;
create trigger on_public_user_created_sync_crm
after insert or update of email, first_name, last_name, phone on public.users
for each row execute function spotlight_ops.sync_user_signup_to_crm();

-- Backfill existing Auth-backed users without emitting or sending messages.
insert into public.crm_contacts (
  source, source_id, auth_user_id, first_name, last_name, email, phone_e164, attributes
)
select
  'spotlight', 'auth:' || au.id::text, au.id,
  nullif(trim(pu.first_name), ''), nullif(trim(pu.last_name), ''),
  nullif(lower(trim(coalesce(pu.email, au.email))), ''),
  case
    when length(regexp_replace(coalesce(pu.phone, au.raw_user_meta_data->>'phone', ''), '\\D', '', 'g')) = 10
      then '+1' || regexp_replace(coalesce(pu.phone, au.raw_user_meta_data->>'phone', ''), '\\D', '', 'g')
    when length(regexp_replace(coalesce(pu.phone, au.raw_user_meta_data->>'phone', ''), '\\D', '', 'g')) = 11
      and regexp_replace(coalesce(pu.phone, au.raw_user_meta_data->>'phone', ''), '\\D', '', 'g') like '1%'
      then '+' || regexp_replace(coalesce(pu.phone, au.raw_user_meta_data->>'phone', ''), '\\D', '', 'g')
    else null
  end,
  jsonb_build_object('signup_via', coalesce(au.raw_user_meta_data->>'signup_via', 'legacy_backfill'))
from public.users pu
join auth.users au on au.id::text = pu.id
where coalesce(pu.email, au.email, pu.phone, au.raw_user_meta_data->>'phone') is not null
  and not exists (
    select 1 from public.crm_contacts c
    where c.deleted_at is null and (
      c.auth_user_id = au.id
      or (coalesce(pu.email, au.email) is not null and c.email = lower(trim(coalesce(pu.email, au.email))))
    )
  )
on conflict do nothing;

update public.crm_contacts c
set auth_user_id = au.id,
    source_id = coalesce(c.source_id, 'auth:' || au.id::text)
from public.users pu
join auth.users au on au.id::text = pu.id
where c.deleted_at is null
  and c.auth_user_id is null
  and c.email is not null
  and c.email = lower(trim(coalesce(pu.email, au.email)));

insert into public.crm_audit_log (actor_type, action, entity_type, entity_id, request_id, after_state, metadata)
values (
  'migration', 'crm.signup.backfill.completed', 'crm_contacts', 'auth-users',
  'signup-crm-backfill-2026-11-02',
  jsonb_build_object('authLinkedContacts', (select count(*) from public.crm_contacts where auth_user_id is not null)),
  jsonb_build_object('migration', 'signup_crm_and_twilio_foundation')
);
