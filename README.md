# Vantage Sim — Investment Simulation Platform

> **This is a demo / simulation platform.** Every balance, price, return, and
> transaction in this application is simulated. No real money, real payment
> processing, real brokerage execution, or real market data is involved
> anywhere in this codebase. Do not present it as a real financial product.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Prisma ORM](https://www.prisma.io) + PostgreSQL
- [Auth.js (NextAuth v5)](https://authjs.dev) — Credentials provider, JWT sessions, bcrypt password hashing
- [Recharts](https://recharts.org) for the portfolio chart
- [Zod](https://zod.dev) for input validation

## Requirements

- Node.js 20+ and npm
- A PostgreSQL database (a local one can be spun up with Prisma's built-in dev server — see below, no separate install required)

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Then fill in `.env`:
   - `DATABASE_URL` — a PostgreSQL connection string.
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`.
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — credentials for the admin account the seed script creates.

   **No local Postgres install?** Prisma ships a zero-install local dev database:

   ```bash
   npx prisma dev --name investment-plan
   ```

   It prints a `postgres://...` connection string — paste that into `DATABASE_URL`. Run
   `npx prisma dev start --name investment-plan` to restart it later; `npx prisma dev ls`
   shows its status and connection string again.

3. **Run migrations and seed demo data**

   ```bash
   npm run db:migrate   # creates tables from prisma/schema.prisma
   npm run db:seed      # creates roles, an admin user, demo plans, assets, and market events
   ```

   The seed script creates:
   - An **admin** account: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`
   - A **demo investor** account: `demo@example.com` / `Demo1234!`
   - 3 demo investment plans, 5 demo assets, sample market events, and default platform settings

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`.

## Project structure

```
prisma/
  schema.prisma       Data model (User, Role, InvestmentPlan, UserInvestment,
                       Portfolio, Asset, Transaction, Notification,
                       PlatformSetting, MarketEvent)
  seed.ts              Seeds roles, admin/demo users, plans, assets, settings

src/
  auth.ts              Auth.js config (Credentials provider, bcrypt, JWT sessions)
  proxy.ts             Route protection for /dashboard, /admin, etc. (Next.js 16 "proxy" convention)
  lib/
    auth.config.ts     Edge-safe auth config shared with middleware
    authz.ts           requireUser() / requireAdmin() server-side guards
    actions/           Server actions, grouped by domain (auth, investments,
                       deposits, profile, notifications, admin-*)
    validation/        Zod schemas for every form/action input
    constants.ts        DEMO/SIMULATION copy, starting demo balance, setting keys
    portfolio.ts        Portfolio overview + derived chart history helpers
  components/
    ui/                Shared design system primitives (Button, Card, Badge, ...)
    nav/AppShell.tsx    Responsive sidebar shell used by both user and admin areas
    charts/             Recharts wrapper for the portfolio chart
    market/, transactions/  Reusable list components
  app/
    page.tsx            Public landing page
    (auth)/login, signup
    (user)/dashboard, plans, plans/[slug], portfolio, investment/[id],
           transactions, deposit, notifications, profile
    admin/              Protected admin dashboard (users, plans, assets,
                        market-events, transactions, settings)
```

## Roles & authorization

- Every `User` has a `Role` (`ADMIN` or `USER`), seeded by `prisma/seed.ts`.
- `src/proxy.ts` blocks unauthenticated access to all user/admin routes, and
  blocks non-admins from `/admin/*`, before any route renders.
- Every admin server action **also** calls `requireAdmin()` itself — proxy is
  not the only line of defense, since server actions are callable
  independently of the page that renders them (Next.js docs explicitly warn
  about this).
- Passwords are hashed with bcrypt (cost factor 12) and never stored or logged
  in plaintext.

## Demo financial model

- New signups start with a simulated cash balance (`STARTING_DEMO_BALANCE` in
  `src/lib/constants.ts`).
- The **Deposit** page does not move real money. A user "records" a demo
  deposit, which creates a `PENDING` transaction; an admin must approve it
  (Admin → Transactions & Deposits) before the demo balance is credited. This
  mirrors a real deposit-approval flow without ever touching a real payment
  rail.
- Investing in a plan moves demo cash into a `UserInvestment` and is
  immediately recorded as a `COMPLETED` transaction.
- Admins can adjust a user's simulated balance directly (for support/demo
  purposes) — this is always recorded as a visible `ADJUSTMENT` transaction,
  never a silent balance edit.
- Every simulated balance, price, and transaction is labeled **DEMO** in the
  UI (see `DemoBadge` / `DemoBanner`), and the site-wide banner in the root
  layout repeats the disclosure on every page.

## Useful scripts

| Command              | Description                                  |
| --------------------- | --------------------------------------------- |
| `npm run dev`          | Start the Next.js dev server                  |
| `npm run build`        | Production build                              |
| `npm run lint`         | ESLint                                        |
| `npm run db:migrate`   | Run Prisma migrations (dev)                   |
| `npm run db:seed`      | Re-run the seed script                        |
| `npm run db:studio`    | Open Prisma Studio to browse the database     |
| `npm run db:reset`     | Reset the database and re-apply migrations    |

## Security notes for anyone extending this

- Never wire the Deposit page, or any other page, to a real payment
  processor, bank API, or brokerage execution API without a full redesign —
  this schema and these flows are intentionally simulation-only.
- Keep secrets in `.env` (gitignored) — never commit real credentials, and
  never expose `AUTH_SECRET` or `DATABASE_URL` to client-side code.
- All form/action inputs are validated with Zod on the server; never trust
  client-side validation alone.
- If you add real money movement in a future version, treat that as a
  ground-up security review, not an incremental change to this codebase.

<!-- build diagnostic -->
