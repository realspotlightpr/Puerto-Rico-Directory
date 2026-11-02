-- Consolidate equivalent admin/owner SELECT paths into one permissive policy per table.
-- This preserves row visibility while avoiding duplicate policy evaluation.

drop policy if exists "admins read crm contacts" on public.crm_contacts;
drop policy if exists "owners read related crm contacts" on public.crm_contacts;
create policy "authorized users read crm contacts" on public.crm_contacts
for select to authenticated
using (
  exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin')
  or exists (
    select 1 from public.crm_contact_businesses cb
    join public.businesses b on b.id = cb.business_id
    where cb.contact_id = crm_contacts.id and b.owner_id = (select auth.uid())::text
  )
);

drop policy if exists "admins read crm contact businesses" on public.crm_contact_businesses;
drop policy if exists "owners read crm contact businesses" on public.crm_contact_businesses;
create policy "authorized users read crm contact businesses" on public.crm_contact_businesses
for select to authenticated
using (
  exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin')
  or exists (
    select 1 from public.businesses b
    where b.id = crm_contact_businesses.business_id and b.owner_id = (select auth.uid())::text
  )
);

drop policy if exists "admins read crm conversations" on public.crm_conversations;
drop policy if exists "owners read crm conversations" on public.crm_conversations;
create policy "authorized users read crm conversations" on public.crm_conversations
for select to authenticated
using (
  exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin')
  or exists (
    select 1 from public.businesses b
    where b.id = crm_conversations.business_id and b.owner_id = (select auth.uid())::text
  )
);

drop policy if exists "admins read crm messages" on public.crm_messages;
drop policy if exists "owners read crm messages" on public.crm_messages;
create policy "authorized users read crm messages" on public.crm_messages
for select to authenticated
using (
  exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin')
  or exists (
    select 1 from public.businesses b
    where b.id = crm_messages.business_id and b.owner_id = (select auth.uid())::text
  )
);

drop policy if exists "admins read crm consents" on public.crm_consents;
drop policy if exists "owners read crm consents" on public.crm_consents;
create policy "authorized users read crm consents" on public.crm_consents
for select to authenticated
using (
  exists (select 1 from public.users where users.id::text = (select auth.uid())::text and users.role = 'admin')
  or exists (
    select 1 from public.crm_contact_businesses cb
    join public.businesses b on b.id = cb.business_id
    where cb.contact_id = crm_consents.contact_id and b.owner_id = (select auth.uid())::text
  )
);
