-- First-party CRM schema. Supabase Postgres remains the sole system of record.
-- Provider credentials live only in Edge Function secrets; no secret columns exist here.

alter table public.businesses add column if not exists archived_at timestamptz;
alter table public.businesses add column if not exists archived_by uuid references auth.users(id) on delete set null;
create index if not exists businesses_active_status on public.businesses(status) where archived_at is null;
alter table public.form_submissions add column if not exists archived_at timestamptz;
alter table public.form_submissions add column if not exists archived_by uuid references auth.users(id) on delete set null;

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('spotlight', 'highlevel_import', 'admin', 'business_owner', 'system')),
  source_id text,
  auth_user_id uuid references auth.users(id) on delete set null,
  first_name text,
  last_name text,
  email text,
  phone_e164 text,
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'es')),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint crm_contacts_identity_present check (email is not null or phone_e164 is not null or auth_user_id is not null),
  constraint crm_contacts_email_normalized check (email is null or email = lower(trim(email))),
  constraint crm_contacts_phone_e164 check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);
create unique index if not exists crm_contacts_source_identity_unique on public.crm_contacts(source, source_id) where source_id is not null and deleted_at is null;
create unique index if not exists crm_contacts_email_unique on public.crm_contacts(lower(email)) where email is not null and deleted_at is null;
create unique index if not exists crm_contacts_phone_unique on public.crm_contacts(phone_e164) where phone_e164 is not null and deleted_at is null;
create index if not exists crm_contacts_auth_user on public.crm_contacts(auth_user_id) where auth_user_id is not null;

create table if not exists public.crm_contact_businesses (
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  business_id integer not null references public.businesses(id) on delete cascade,
  relationship text not null check (relationship in ('owner', 'manager', 'employee', 'customer', 'lead', 'other')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (contact_id, business_id, relationship)
);
create unique index if not exists crm_one_primary_business_contact on public.crm_contact_businesses(business_id) where is_primary;

create table if not exists public.crm_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text generated always as (lower(trim(name))) stored,
  color text,
  created_at timestamptz not null default now(),
  unique (normalized_name)
);

create table if not exists public.crm_contact_tags (
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  tag_id uuid not null references public.crm_tags(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create table if not exists public.crm_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete restrict,
  business_id integer references public.businesses(id) on delete set null,
  subject text,
  status text not null default 'open' check (status in ('open', 'waiting', 'resolved', 'archived')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists crm_conversations_contact on public.crm_conversations(contact_id, last_message_at desc nulls last);
create index if not exists crm_conversations_business on public.crm_conversations(business_id, status) where business_id is not null;

create table if not exists public.crm_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  event_type text not null,
  subject_type text not null,
  subject_id text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists crm_events_dispatch on public.crm_events(status, available_at, created_at) where status in ('pending', 'failed');

create table if not exists public.crm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.crm_conversations(id) on delete set null,
  contact_id uuid not null references public.crm_contacts(id) on delete restrict,
  business_id integer references public.businesses(id) on delete set null,
  event_id uuid references public.crm_events(id) on delete set null,
  channel text not null check (channel in ('email', 'sms', 'internal')),
  direction text not null check (direction in ('inbound', 'outbound')),
  recipient text,
  sender text,
  subject text,
  body_text text not null,
  body_html text,
  status text not null check (status in ('queued', 'sending', 'sent', 'delivered', 'failed', 'skipped', 'received')),
  provider text,
  provider_message_id text,
  error_code text,
  error_detail text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz
);
create unique index if not exists crm_provider_message_unique on public.crm_messages(provider, provider_message_id) where provider_message_id is not null;
create index if not exists crm_messages_contact_created on public.crm_messages(contact_id, created_at desc);
create index if not exists crm_messages_status on public.crm_messages(status, created_at desc);

create table if not exists public.crm_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.crm_messages(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  provider text not null,
  status text not null check (status in ('started', 'accepted', 'delivered', 'failed', 'suppressed')),
  provider_response jsonb not null default '{}'::jsonb,
  error_code text,
  error_detail text,
  attempted_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (message_id, attempt_number)
);

create table if not exists public.crm_consents (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete restrict,
  channel text not null check (channel in ('email', 'sms')),
  purpose text not null check (purpose in ('transactional', 'marketing')),
  status text not null check (status in ('granted', 'denied', 'withdrawn', 'unknown')),
  provenance text not null,
  policy_version text,
  captured_at timestamptz not null,
  captured_by uuid references auth.users(id) on delete set null,
  source_ip_hash text,
  user_agent text,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists crm_consents_latest on public.crm_consents(contact_id, channel, purpose, captured_at desc);

create table if not exists public.crm_automation_definitions (
  id uuid primary key default gen_random_uuid(),
  automation_key text not null unique,
  name text not null,
  trigger_event text not null,
  enabled boolean not null default false,
  definition_version integer not null default 1 check (definition_version > 0),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.crm_automation_definitions(id) on delete restrict,
  event_id uuid not null references public.crm_events(id) on delete restrict,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  current_step integer not null default 0 check (current_step >= 0),
  state jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (automation_id, event_id)
);

create table if not exists public.crm_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('user', 'admin', 'system', 'migration', 'provider_webhook')),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  request_id text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists crm_audit_entity on public.crm_audit_log(entity_type, entity_id, created_at desc);
create index if not exists crm_audit_actor on public.crm_audit_log(actor_user_id, created_at desc) where actor_user_id is not null;

create table if not exists public.crm_migration_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  export_checksum text not null,
  status text not null check (status in ('validated', 'importing', 'reconciling', 'completed', 'rolled_back', 'failed')),
  checkpoint jsonb not null default '{}'::jsonb,
  source_counts jsonb not null default '{}'::jsonb,
  imported_counts jsonb not null default '{}'::jsonb,
  reconciliation jsonb not null default '{}'::jsonb,
  backup_location text,
  started_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  rollback_deadline timestamptz,
  error text,
  unique (source, export_checksum)
);

create table if not exists public.crm_migration_items (
  id bigint generated always as identity primary key,
  batch_id uuid not null references public.crm_migration_batches(id) on delete restrict,
  entity_type text not null,
  source_id text not null,
  source_hash text not null,
  target_id text,
  status text not null check (status in ('pending', 'imported', 'skipped', 'failed', 'rolled_back')),
  error text,
  imported_at timestamptz,
  unique (batch_id, entity_type, source_id)
);
create index if not exists crm_migration_items_status on public.crm_migration_items(batch_id, entity_type, status);

create or replace function public.crm_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.crm_touch_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;

revoke all on function public.crm_set_updated_at() from public, anon, authenticated;
revoke all on function public.crm_touch_contact() from public, anon, authenticated;

drop trigger if exists crm_contacts_updated_at on public.crm_contacts;
create trigger crm_contacts_updated_at before update on public.crm_contacts for each row execute function public.crm_touch_contact();
drop trigger if exists crm_contact_businesses_updated_at on public.crm_contact_businesses;
create trigger crm_contact_businesses_updated_at before update on public.crm_contact_businesses for each row execute function public.crm_set_updated_at();
drop trigger if exists crm_conversations_updated_at on public.crm_conversations;
create trigger crm_conversations_updated_at before update on public.crm_conversations for each row execute function public.crm_set_updated_at();
drop trigger if exists crm_automation_definitions_updated_at on public.crm_automation_definitions;
create trigger crm_automation_definitions_updated_at before update on public.crm_automation_definitions for each row execute function public.crm_set_updated_at();

alter table public.crm_contacts enable row level security;
alter table public.crm_contact_businesses enable row level security;
alter table public.crm_tags enable row level security;
alter table public.crm_contact_tags enable row level security;
alter table public.crm_conversations enable row level security;
alter table public.crm_events enable row level security;
alter table public.crm_messages enable row level security;
alter table public.crm_delivery_attempts enable row level security;
alter table public.crm_consents enable row level security;
alter table public.crm_automation_definitions enable row level security;
alter table public.crm_automation_runs enable row level security;
alter table public.crm_audit_log enable row level security;
alter table public.crm_migration_batches enable row level security;
alter table public.crm_migration_items enable row level security;

-- Direct clients are read-only. All writes go through authenticated Edge Functions.
revoke all on public.crm_contacts, public.crm_contact_businesses, public.crm_tags, public.crm_contact_tags,
  public.crm_conversations, public.crm_events, public.crm_messages, public.crm_delivery_attempts,
  public.crm_consents, public.crm_automation_definitions, public.crm_automation_runs,
  public.crm_audit_log, public.crm_migration_batches, public.crm_migration_items from anon, authenticated;
grant select on public.crm_contacts, public.crm_contact_businesses, public.crm_tags, public.crm_contact_tags,
  public.crm_conversations, public.crm_messages, public.crm_consents to authenticated;

create policy "admins read crm contacts" on public.crm_contacts for select to authenticated
using (exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin'));
create policy "owners read related crm contacts" on public.crm_contacts for select to authenticated
using (exists (select 1 from public.crm_contact_businesses cb join public.businesses b on b.id = cb.business_id where cb.contact_id = crm_contacts.id and b.owner_id = (select auth.uid())::text));

create policy "admins read crm contact businesses" on public.crm_contact_businesses for select to authenticated
using (exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin'));
create policy "owners read crm contact businesses" on public.crm_contact_businesses for select to authenticated
using (exists (select 1 from public.businesses b where b.id = crm_contact_businesses.business_id and b.owner_id = (select auth.uid())::text));

create policy "admins read crm tags" on public.crm_tags for select to authenticated
using (exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin'));
create policy "admins read crm contact tags" on public.crm_contact_tags for select to authenticated
using (exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin'));

create policy "admins read crm conversations" on public.crm_conversations for select to authenticated
using (exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin'));
create policy "owners read crm conversations" on public.crm_conversations for select to authenticated
using (exists (select 1 from public.businesses b where b.id = crm_conversations.business_id and b.owner_id = (select auth.uid())::text));

create policy "admins read crm messages" on public.crm_messages for select to authenticated
using (exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin'));
create policy "owners read crm messages" on public.crm_messages for select to authenticated
using (exists (select 1 from public.businesses b where b.id = crm_messages.business_id and b.owner_id = (select auth.uid())::text));

create policy "admins read crm consents" on public.crm_consents for select to authenticated
using (exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin'));
create policy "owners read crm consents" on public.crm_consents for select to authenticated
using (exists (select 1 from public.crm_contact_businesses cb join public.businesses b on b.id = cb.business_id where cb.contact_id = crm_consents.contact_id and b.owner_id = (select auth.uid())::text));

-- Operational, automation, audit, and migration tables are service-role only.
-- No authenticated policies are intentionally defined for these tables.

insert into public.crm_automation_definitions (automation_key, name, trigger_event, enabled, steps)
values
  ('listing-submitted-v1', 'Listing submitted confirmation', 'listing.submitted', false, '[{"channel":"email","template":"listing-submitted"}]'),
  ('listing-approved-v1', 'Listing approved confirmation', 'listing.approved', false, '[{"channel":"email","template":"listing-approved"}]'),
  ('listing-rejected-v1', 'Listing changes required', 'listing.rejected', false, '[{"channel":"email","template":"listing-rejected"}]'),
  ('inquiry-received-v1', 'New inquiry notification', 'inquiry.received', false, '[{"channel":"email","template":"inquiry-received"}]'),
  ('admin-invitation-v1', 'Role invitation', 'admin.invitation.requested', false, '[{"channel":"email","template":"admin-invitation"},{"channel":"sms","template":"admin-invitation"}]')
on conflict (automation_key) do nothing;
