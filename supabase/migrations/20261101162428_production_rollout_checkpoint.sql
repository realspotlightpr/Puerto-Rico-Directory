-- Private, in-database logical checkpoint for the free-tier production project.
-- This is additive and contains the complete pre-rollout rows for every table
-- changed or reconciled by the CRM and business-media rollout.

create schema if not exists spotlight_ops;
revoke all on schema spotlight_ops from public, anon, authenticated;
grant usage on schema spotlight_ops to service_role;

create table if not exists spotlight_ops.businesses_before_20261101
as table public.businesses with data;

create table if not exists spotlight_ops.media_items_before_20261101
as table public.media_items with data;

create table if not exists spotlight_ops.form_submissions_before_20261101
as table public.form_submissions with data;

create table if not exists spotlight_ops.communications_log_before_20261101
as table public.communications_log with data;

create table if not exists spotlight_ops.rollout_checkpoints (
  checkpoint_key text primary key,
  project_ref text not null,
  snapshot_counts jsonb not null,
  snapshot_hashes jsonb not null,
  function_definitions jsonb not null,
  created_at timestamptz not null default now()
);

revoke all on all tables in schema spotlight_ops from public, anon, authenticated;
grant select on all tables in schema spotlight_ops to service_role;

insert into spotlight_ops.rollout_checkpoints (
  checkpoint_key,
  project_ref,
  snapshot_counts,
  snapshot_hashes,
  function_definitions
)
values (
  'pre_crm_and_media_20261101',
  'zswvumzbtikzvwgtpprw',
  jsonb_build_object(
    'businesses', (select count(*) from spotlight_ops.businesses_before_20261101),
    'media_items', (select count(*) from spotlight_ops.media_items_before_20261101),
    'form_submissions', (select count(*) from spotlight_ops.form_submissions_before_20261101),
    'communications_log', (select count(*) from spotlight_ops.communications_log_before_20261101)
  ),
  jsonb_build_object(
    'businesses', (select md5(coalesce(string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id), '')) from spotlight_ops.businesses_before_20261101 row_data),
    'media_items', (select md5(coalesce(string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id), '')) from spotlight_ops.media_items_before_20261101 row_data),
    'form_submissions', (select md5(coalesce(string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id), '')) from spotlight_ops.form_submissions_before_20261101 row_data),
    'communications_log', (select md5(coalesce(string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id), '')) from spotlight_ops.communications_log_before_20261101 row_data)
  ),
  (
    select coalesce(jsonb_object_agg(p.oid::regprocedure::text, pg_get_functiondef(p.oid)), '{}'::jsonb)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('sync_influencer_to_ghl', 'sync_new_user_to_ghl')
  )
)
on conflict (checkpoint_key) do nothing;
