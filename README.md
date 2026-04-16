# MVP — Service Business Website Platform

This repository has a **dual nature**:

1. **Production website for MVP** — a real service business. The site runs live, captures leads, books appointments, and syncs to the CRM.
2. **Forkable base template** for building websites for other service businesses. Branding, SEO, integrations, and content are configurable from the admin dashboard with no redeploy.

> Authoritative project context (milestones, decisions, roadmap) lives in [`.paul/PROJECT.md`](.paul/PROJECT.md).

## Core Features

- **Public service catalog** — categories, subcategories, service pages, cart, and time-slot booking
- **Lead capture form** — multi-step funnel with scoring, HOT/WARM/COLD classification, and an abandonment sweep that sends SMS if the form is left incomplete
- **Admin dashboard** — manage services, blog, gallery, reviews, FAQs, users, SEO, integrations, and leads from one place
- **Multi-channel notifications** — Twilio SMS, Resend email, GoHighLevel CRM sync, all with a full audit log (recipient, preview, status, errors) visible per lead
- **AI chat** — OpenAI-powered agent with configurable persona, welcome message, intake objectives, and URL-based activation rules
- **SEO & sitemap** — configurable meta tags, OG fields, schema.org local business JSON-LD, dynamic sitemap/robots
- **Type-safe contracts** — shared Drizzle + Zod schemas power both server and client; no drift

## Tech Stack

### Frontend

- React 18 + TypeScript
- Vite
- Wouter (lightweight routing)
- TanStack React Query (server state)
- Tailwind CSS + shadcn/ui (Radix primitives)

### Backend

- Node.js + Express + TypeScript
- Drizzle ORM
- PostgreSQL (Supabase)
- Session-based authentication with Supabase-backed identity (RLS enabled on all public tables)

### Platform

- Deploy target: Vercel (Fluid Compute)
- Storage: Supabase Storage (gallery uploads)
- CRM: GoHighLevel

## Project Structure

```text
client/src/              # React app (pages, components, hooks, context, lib)
server/                  # Express API, auth, storage, integrations
shared/                  # Shared schemas and route contracts (source of truth for types)
migrations/              # SQL migration files (applied via drizzle-kit or directly)
scripts/                 # Utility and helper scripts
docs/                    # Design system + supplemental documentation
.paul/                   # Planning artifacts (PROJECT, ROADMAP, STATE, phase plans)
```

## Requirements

- Node.js 20+ (24 LTS recommended)
- PostgreSQL database (Supabase project recommended)

## Environment Variables

Create a `.env` file in the project root.

### Required

```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=replace-with-a-strong-random-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD_HASH=<bcrypt-hash-of-admin-password>
```

### Optional

```env
PORT=7000                                   # custom server port (default: 7000)
NODE_ENV=development
POSTGRES_URL=postgresql://...               # fallback connection var
SUPABASE_DATABASE_URL=postgresql://...      # optional DB fallback
OPENAI_API_KEY=<key>                        # AI chat features
GHL_API_KEY=<key>                           # GoHighLevel CRM (also configurable via admin)
GHL_LOCATION_ID=<id>
```

## Getting Started

```bash
npm install
npm run db:push        # apply schema to the database
npm run dev            # start the dev server (default: http://localhost:7000)
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build client and server into `dist/` |
| `npm run build:vercel` | Build using Vercel-specific script |
| `npm run start` | Start production server from `dist/` |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push Drizzle schema changes to database |

## Production

```bash
npm run build
npm run start
```

## Using This Repository as a Template

When forking for a new service-business site, everything below can be customized **via the admin dashboard** without touching code:

- **Company identity** — admin → Company Infos (name, phone, address, hours, social links, logo)
- **Brand colors** — admin → Website → Colors (primary, secondary, accent, background, foreground)
- **Hero + homepage content** — admin → Website → Hero / Sections
- **SEO metadata** — admin → SEO (title, description, OG image, schema.org local business)
- **Service catalog** — admin → Services (categories, subcategories, individual services)
- **Integrations** — admin → Integrations (Twilio, Resend, GoHighLevel, OpenAI, GA/GTM/Pixel)
- **Lead form** — admin → Leads → Form Editor (questions, scoring, classification thresholds)

For per-instance secrets (DB, Supabase, bcrypt admin hash), use the `.env` file. Everything else belongs in the admin DB, which means the same codebase can deliver dozens of branded sites without per-fork code changes.

See [`.paul/PROJECT.md`](.paul/PROJECT.md) for the full context, roadmap, and accumulated decisions.

## Security Notes

- Never commit `.env` or secrets
- Rotate keys immediately if any credential is exposed
- Use least-privilege credentials for production services
- RLS is enabled on all public Supabase tables — read/write through the server, not the client

## License

MIT
