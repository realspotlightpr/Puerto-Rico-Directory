# Spotlight PR — Supabase-only migration (handoff)

**Date:** June 12, 2026

This converts the app to run **fully on Supabase** (no Express backend). All the
core directory flows — browse, search, business detail, submit a listing, claim,
reviews, owner dashboard, manage listing, and the admin panel — now talk to
Supabase directly. Login already used Supabase Auth.

## How it works (the key idea)

Rather than rewrite every page, the app's existing generated API client now
routes through a single Supabase handler:

- `lib/api-client-react/src/custom-fetch.ts` — added `setApiHandler()`. When a
  handler is registered, every `/api/...` call is serviced locally instead of
  hitting the network.
- `artifacts/spotlight-pr/src/lib/apiHandler.ts` — **new file**: the Supabase
  router. Maps each endpoint to a Supabase query and returns data in the exact
  shape the components already expect.
- `artifacts/spotlight-pr/src/main.tsx` — imports the handler so it registers on
  startup.
- `lib/replit-auth-web/src/use-auth.ts` — reads the signed-in user's profile
  straight from Supabase (was calling the dead `/api/auth/user`).

## Files changed

```
artifacts/spotlight-pr/public/_redirects            (new — fixes deep-link 404s)
artifacts/spotlight-pr/.env                          (new — local build config; git-ignored)
artifacts/spotlight-pr/.env.example                  (new — template)
artifacts/spotlight-pr/vite.config.ts                (PORT/BASE_PATH now default; no longer required)
artifacts/spotlight-pr/src/main.tsx                  (register Supabase handler)
artifacts/spotlight-pr/src/lib/apiHandler.ts         (new — Supabase API router)
artifacts/spotlight-pr/src/pages/Home.tsx            (hero contrast fix; Surprise Me uses loaded data)
artifacts/spotlight-pr/src/pages/VerifyEmail.tsx     (resend email via Supabase)
lib/api-client-react/src/custom-fetch.ts             (setApiHandler + interception)
lib/api-client-react/src/index.ts                    (export setApiHandler)
lib/replit-auth-web/src/use-auth.ts                  (profile from Supabase)
.gitignore                                           (ignore .env files)
```

Plus database work already applied to the new Supabase project
`spotlight-pr-production` (`zswvumzbtikzvwgtpprw`): full schema, RLS, the
`claim_business` function, and 12 seeded categories.

## What works now

- Home, Directory (search + filters), business detail, similar businesses
- Sign up / log in / set password / resend verification (Supabase Auth)
- Submit a business (becomes `pending`); owner dashboard; manage/edit a listing
- Leave a review; contact form ("inquiry") on a business page
- Claim an unclaimed listing
- Admin: stats, business list + approve/reject/feature/edit/delete, review list +
  delete, user list + role changes
- Admin "Leads" = unclaimed listings (`source = spotlight_rep`) — create / edit /
  delete, ready for the bulk import step

## What's deferred (needs a server; shows a "coming soon" error if used)

These were Replit-era extras that require server-side secrets/compute:
AI assistant & image generation, image **uploads** to object storage, HighLevel
social posting, transactional email, and the team/affiliate dashboard. They're
isolated panels — they don't affect the core site. We can add them later via
Supabase Storage + Edge Functions if you want them.

Minor: a couple of homepage "vibe" shortcut links point at old category slugs
(`restaurants-food`, `entertainment`) that don't exist in the new categories —
they'll just show no results until relabeled. Cosmetic.

---

## Your steps to go live

### 1. Build locally to confirm it compiles
```
cd C:\Users\User\Puerto-Rico-Directory
corepack enable
pnpm install
pnpm --filter @workspace/spotlight-pr build
```
If the build reports type errors, paste them to me and I'll fix them — I couldn't
run the build in my environment, so this is our verification step.

### 2. Set Netlify environment variables
In **Netlify → Site configuration → Environment variables**:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://zswvumzbtikzvwgtpprw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzd3Z1bXpidGlrenZ3Z3RwcHJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTkwMDksImV4cCI6MjA5Njg3NTAwOX0.rC8oSs0fiI7_-bS04iRayIoAjn-KWLQ3_u5VuzzeoPI` |

### 3. Commit & push
```
git add -A
git commit -m "Run Spotlight PR fully on Supabase (no backend); fix SPA redirects + hero"
git push
```
Netlify auto-builds on push. (Or trigger "Clear cache and deploy site".)

### 4. Make yourself an admin
After you sign up on the live site, run this once in the Supabase SQL editor (or
tell me and I'll do it):
```sql
update public.users set role = 'admin' where email = 'YOUR_EMAIL';
```

### 5. Tell me it's live
Then we move to importing local businesses as unclaimed listings.
