# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository is the production website for **MVP** — a service business — and a **forkable base template** for building websites for other service businesses. The same codebase ships MVP's live site and doubles as the starting point for other clients in the same segment. Branding, SEO, catalog content, and integrations are configurable from the admin dashboard without a redeploy.

Authoritative project context (milestones, active phase, decisions, deferred work) lives in [`.paul/PROJECT.md`](.paul/PROJECT.md). Read that first for anything beyond code-level tasks.

## Commands

```bash
npm run dev          # Start development server (default port 7000)
npm run build        # Build client (Vite) and server (esbuild) to /dist
npm run start        # Run production server
npm run check        # TypeScript type checking
npm run db:push      # Apply database schema changes via Drizzle Kit
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Wouter (routing), TanStack React Query, shadcn/ui, Tailwind CSS
- **Backend**: Express.js, TypeScript, Drizzle ORM, PostgreSQL
- **Auth**: Session-based authentication with Supabase-backed identity; bcrypt for admin password
- **Platform**: Deployed on Vercel (Fluid Compute); Supabase for Postgres, Auth, Storage, and RLS

## Architecture

```
client/src/
├── pages/          # Route components (Home, Services, Admin, Booking flow)
├── components/     # UI components (ui/ has shadcn components; admin/ has section components)
├── hooks/          # Custom hooks (useAuth, useBooking, useSEO, useUpload)
├── context/        # CartContext, AuthContext
└── lib/            # Utilities (queryClient, analytics)

server/
├── index.ts        # Express setup, middleware, port config
├── routes.ts       # Route registrar (wires the modules below)
├── routes/         # Modular route files (leads, notifications, chat, integrations, users, content, reviews, services)
├── storage.ts      # Database queries via IStorage interface
├── notifications/  # logNotification helper + audit log utilities
├── integrations/   # Twilio, Resend, GoHighLevel, OpenAI
├── leads/          # Lead-specific jobs (abandoned-notification sweep)
├── auth/           # Supabase auth wiring
└── db.ts           # Database connection

shared/
├── schema.ts       # Drizzle tables + Zod schemas (source of truth for types)
└── routes.ts       # Type-safe API route definitions
```

## Key Patterns

**Type-Safe API**: `shared/routes.ts` defines endpoints with Zod schemas. Both client and server import these for type safety.

**Shared Schema**: Database tables in `shared/schema.ts` generate both TypeScript types and Zod validators via `drizzle-zod`. Use `insertXSchema` for inserts, `typeof table.$inferSelect` for selects.

**Storage Layer**: All database operations go through `server/storage.ts` implementing `IStorage` interface. Routes call storage methods, not raw SQL.

**State Management**: React Query for server state, Context API for cart/auth. No Redux.

**Notification Logging**: Every outbound SMS/email/CRM sync is logged to `notification_logs` via `server/notifications/logger.ts`. Integration functions accept an optional `logContext?: NotificationLogContext` as their last parameter.

## Database Tables

- `categories`, `subcategories`, `services` — Service catalog
- `serviceAddons` — Cross-sell relationships between services
- `bookings`, `bookingItems` — Customer bookings with snapshot pricing
- `formLeads` — Lead capture with scoring + classification
- `notificationLogs` — Audit trail for every outgoing notification (SMS/email/GHL sync)
- `conversations`, `conversationMessages` — AI chat threads and messages
- `companySettings` — Singleton for business hours, SEO, analytics, branding, homepage content
- `integrationSettings`, `twilioSettings`, `resendSettings`, `chatSettings`, `chatIntegrations` — Integration credentials and toggles
- `faqs`, `blogPosts`, `servicePosts`, `galleryImages`, `reviewItems`, `reviewsSettings` — Admin-managed content
- `users`, `sessions` — Auth

## Environment Variables

Required:
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Express session encryption
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase project credentials
- `ADMIN_EMAIL` — Admin login email
- `ADMIN_PASSWORD_HASH` — bcrypt hash of admin password

See `README.md` for the full list including optional variables.

## Brand Guidelines (this deployment — MVP's live brand)

The values below describe **MVP's live brand**, which is what the current production site uses. They are stored in the DB (`companySettings`) and configurable per fork via admin → Website → Colors and admin → Company Infos. Treat them as variables, not constants: when you fork this repo for another service business, these change.

- **Colors**: Primary Blue `#1C53A3`, Brand Yellow `#FFFF01`
- **Fonts**: Outfit (headings), Inter (body)
- **CTA Buttons**: Primary Blue with white bold text, pill-shaped (`rounded-full`) — use `bg-primary text-primary-foreground`

When reviewing UI changes for the live MVP site, keep these values in mind. When building features that other forks will use, read from the computed CSS variables / `companySettings` rather than hardcoding.
