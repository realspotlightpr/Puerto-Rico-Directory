# Spotlight Puerto Rico

## Overview

A full-stack business directory web application for Puerto Rico. Businesses can list themselves, users can search and review businesses, and admins can manage the platform.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/spotlight-pr)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect with PKCE)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **UI**: Tailwind CSS + shadcn/ui components
- **Routing**: wouter

## User Roles

- **user**: Regular user, can search and review businesses
- **business_owner**: Can submit and manage their own business listings
- **admin**: Full platform management (approve/reject businesses, manage users, delete reviews)

## Key Features

- Home page with hero search, category grid, and featured businesses
- Directory/search with filters (keyword, category, municipality)
- Business detail pages with reviews and star ratings
- Business submission form (requires login)
- Owner dashboard (`/dashboard`) — stats overview, listing cards with status, link to manage each business
- Business management page (`/manage/:id`) — tabbed interface: Details (edit all info), Reviews, Hours, Media (logo/cover), Social links, AI Assistant
- AI Assistant per business — GPT-5.2 chat agent fully aware of each business's data (description, hours, address, reviews, socials). Supports streaming text responses + image generation via gpt-image-1. Conversations are scoped per-business and per-user. Images can be generated inline in chat ("generate image of...") or via the dedicated image panel.
- **Media Library** — business owners can save AI-generated images to a per-business media library (`media_items` table). Grid view shows all saved images with download, delete, "Use as Logo", "Use as Cover" actions. Accessible from the Media Library tab in the manage business page.
- **Image Studio** — standalone tab in manage business page for focused AI image generation. Supports aspect ratios (1:1, 16:9, 9:16), prompt suggestions, and one-click save to Media Library.
- **Social Media Planner** — monthly calendar view for scheduling social media posts via HighLevel Sub Account API. Owners can compose posts, attach images from Media Library, set date/time, and schedule. HighLevel API key stored securely server-side, not exposed to frontend.
- Email verification flow — Supabase `email_confirmed_at` in JWT is read by `authMiddleware` to set `emailVerified` on the user. Business owners/admins are redirected to `/verify-email` if their email isn't verified. After submitting a new listing unverified users are also redirected to `/verify-email`. When a user verifies, all their businesses are auto-marked `isClaimed=true`.
- "Verified" badge (emerald) — shown on business cards and detail pages when `status === "approved"`. "Claimed" badge (blue) — shown when `isClaimed === true` (owner has verified their email).
- Image uploads — business owners can upload logo and cover photo directly from the listing submission form and the dashboard Media tab. Uses Replit Object Storage (GCS-backed) with a two-step presigned URL flow: client sends metadata → server returns signed URL → client uploads directly to GCS. `ImageUploadField` component handles preview, progress, errors, and clear. Served from `/api/storage/objects/*`.
- `/business` marketing page — "For Business" landing page with features, how-it-works, FAQ, CTAs
- **Admin panel** (`/admin`) — left sidebar navigation with 4 sections:
  - **Dashboard** — stats cards (total businesses, pending review, total users, reviews), approval rate, avg business per user
  - **Business Listings** — table with status filter, search, approve/reject/feature actions, verified/claimed status badges, edit button
  - **Users & Owners** — user table with name/username/join date, inline role selector (Regular User / Business Owner / Admin), search, edit button
  - **Reviews** — review moderation table with author, business ID, rating, content, delete button
  - Search and filter across businesses and users
  - Quick access "Exit Admin" button at bottom of sidebar
- 78 Puerto Rico municipalities in dropdowns
- 12 pre-seeded business categories

## Structure

```text
artifacts/
  spotlight-pr/         # React+Vite frontend (served at /)
  api-server/           # Express API server (served at /api)
lib/
  api-spec/             # OpenAPI spec + Orval codegen
  api-client-react/     # Generated React Query hooks
  api-zod/              # Generated Zod schemas
  db/                   # Drizzle ORM schema + DB connection
  replit-auth-web/      # Replit Auth web hook (useAuth, AuthProvider)
```

## Database Tables

- `users` - Auth users (id, email, username, firstName, lastName, profileImageUrl, role)
- `sessions` - Session storage for Replit Auth
- `categories` - Business categories (12 pre-seeded)
- `businesses` - Business listings (status: pending/approved/rejected, featured flag, highlevelApiKey for social posting)
- `reviews` - User reviews with star ratings
- `media_items` - AI-generated images saved per business (url, prompt, size, businessId)
- `conversations` - AI chat conversations per business/user
- `messages` - Chat messages within conversations

## API Routes

All prefixed with `/api`:
- `GET /healthz` - Health check
- `GET /auth/user` - Current user
- `GET /login`, `GET /callback`, `GET /logout` - Auth flow
- `GET /categories` - List categories
- `GET /businesses` - Search businesses (query: search, category, municipality, featured)
- `GET /businesses/:id` - Business detail
- `POST /businesses` - Create business (auth required)
- `PUT /businesses/:id` - Update business (owner/admin)
- `DELETE /businesses/:id` - Delete business (admin)
- `GET /businesses/:id/reviews` - Get reviews
- `POST /businesses/:id/reviews` - Create review (auth required)
- `GET /my/businesses` - My businesses (auth required)
- `GET /media/items?businessId=` - List media library images (auth required)
- `POST /media/items` - Save image to media library (auth required)
- `DELETE /media/items/:id` - Delete media library image (auth required)
- `GET /highlevel/status?businessId=` - Check HighLevel API key status (auth required)
- `GET /highlevel/posts?businessId=` - List scheduled HighLevel posts (auth required)
- `POST /highlevel/posts` - Schedule a new HighLevel post (auth required)
- `PUT /highlevel/api-key` - Save HighLevel API key (auth required)
- `GET/POST /admin/*` - Admin endpoints (admin role required)

## Admin Access

To make yourself admin, log in and then update your user role in the database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Development

- `pnpm --filter @workspace/api-server run dev` - Start API server
- `pnpm --filter @workspace/spotlight-pr run dev` - Start frontend
- `pnpm --filter @workspace/db run push` - Push DB schema changes
- `pnpm --filter @workspace/api-spec run codegen` - Regenerate API client from spec
