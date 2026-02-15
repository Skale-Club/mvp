# MVP Builder Remodeling

A full-stack web application for a remodeling business, including a public marketing site and an admin control panel.

Customers can browse services, view projects, submit leads, and interact with chat/booking flows. Admin users can manage content, SEO, integrations, and operational settings from a single dashboard.

## Core Features

- Service pages with detailed content and pricing structure
- Gallery and blog management
- Lead capture and contact workflows
- Admin dashboard for company settings, FAQs, content, and users
- SEO configuration (meta tags, OG, robots, schema fields)
- Integrations support (Supabase auth/storage, analytics, Twilio/OpenAI hooks)
- Responsive React UI with shared typed contracts between client and server

## Tech Stack

### Frontend

- React 18 + TypeScript
- Vite
- Wouter
- TanStack React Query
- Tailwind CSS + Radix/shadcn UI primitives

### Backend

- Node.js + Express
- TypeScript
- Drizzle ORM
- PostgreSQL
- Session-based authentication with Supabase-backed identity

## Project Structure

```text
client/src/              # React app
server/                  # Express API, auth, storage
shared/                  # Shared schemas and route contracts
script/                  # Build scripts
scripts/                 # Utility and migration helper scripts
dist/                    # Production build output
```

## Requirements

- Node.js 18+
- PostgreSQL database

## Environment Variables

Create a `.env` file in the project root.

### Required

```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=replace-with-a-strong-random-secret
ADMIN_EMAIL=admin@yourdomain.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### Optional (depending on your setup)

```env
POSTGRES_URL=postgresql://...               # fallback connection var
SUPABASE_DATABASE_URL=postgresql://...      # optional DB fallback
OPENAI_API_KEY=...                          # AI/chat features
PORT=5000                                   # custom server port
NODE_ENV=development
```

## Getting Started

```bash
npm install
npm run db:push
npm run dev
```

The app runs at `http://localhost:5000` by default.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build client and server into `dist/` |
| `npm run build:vercel` | Build using Vercel-specific script |
| `npm run start` | Start production server from `dist/` |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push Drizzle schema changes to database |
| `npm run print:db:dev` | Print development DB URL helper output |

## Production

```bash
npm run build
npm run start
```

## Security Notes

- Never commit `.env` or secrets.
- Rotate keys immediately if any credential is exposed.
- Use least-privilege credentials for production services.

## License

MIT
