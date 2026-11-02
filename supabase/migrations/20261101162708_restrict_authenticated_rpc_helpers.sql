-- These RPCs require a signed-in user. Their function bodies already authorize
-- against auth.uid(); remove the inherited PUBLIC/anon execution path.

revoke all on function public.claim_business(integer) from public, anon;
grant execute on function public.claim_business(integer) to authenticated, service_role;

revoke all on function public.is_team_member_with(text) from public, anon;
grant execute on function public.is_team_member_with(text) to authenticated, service_role;
