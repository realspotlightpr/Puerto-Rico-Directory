-- Trigger functions are invoked by PostgreSQL triggers, not by Data API callers.
-- Removing direct EXECUTE closes the public RPC surface without disabling triggers.

revoke all on function public.check_payout_balance() from public, anon, authenticated;
revoke all on function public.credit_guide_earning() from public, anon, authenticated;
revoke all on function public.notify_booking_confirmed() from public, anon, authenticated;
revoke all on function public.notify_new_booking() from public, anon, authenticated;
revoke all on function public.notify_on_new_review() from public, anon, authenticated;
revoke all on function public.notify_user_welcome() from public, anon, authenticated;
revoke all on function public.recompute_business_rating() from public, anon, authenticated;
revoke all on function public.set_owner_role() from public, anon, authenticated;
revoke all on function public.sync_influencer_to_ghl() from public, anon, authenticated;
revoke all on function public.sync_new_user_to_ghl() from public, anon, authenticated;

grant execute on function public.check_payout_balance() to service_role;
grant execute on function public.credit_guide_earning() to service_role;
grant execute on function public.notify_booking_confirmed() to service_role;
grant execute on function public.notify_new_booking() to service_role;
grant execute on function public.notify_on_new_review() to service_role;
grant execute on function public.notify_user_welcome() to service_role;
grant execute on function public.recompute_business_rating() to service_role;
grant execute on function public.set_owner_role() to service_role;
grant execute on function public.sync_influencer_to_ghl() to service_role;
grant execute on function public.sync_new_user_to_ghl() to service_role;

-- Both functions fully qualify their table references, so an empty search path is safe.
alter function public.guide_available_cents(text) set search_path = '';
alter function public.influencer_available_cents(bigint) set search_path = '';
