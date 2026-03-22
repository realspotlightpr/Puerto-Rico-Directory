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
- Owner dashboard (view listing status, edit)
- Admin panel (stats, business approval workflow, user management, review management)
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
- `businesses` - Business listings (status: pending/approved/rejected, featured flag)
- `reviews` - User reviews with star ratings

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
