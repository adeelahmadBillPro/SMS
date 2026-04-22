# ShopOS — Claude Code Project Guide

> Offline-first, mobile-first inventory + billing + forecasting SaaS for Pakistani retail shops (mobiles, laptops, electronics). FBR-ready. Multi-tenant.
>
> **Start here.** Detail in [SPEC.md](SPEC.md). Phases in [ROADMAP.md](ROADMAP.md). VPS bootstrap in [SETUP.md](SETUP.md).

## 1. Locked stack

| Layer         | Choice                                                  |
|---------------|----------------------------------------------------------|
| Language      | TypeScript (strict: true, noUncheckedIndexedAccess)      |
| Framework     | Next.js 15 (App Router, Server Actions, RSC)             |
| Auth          | Better-Auth, self-hosted (email + password for MVP)      |
| DB            | PostgreSQL 16+ with Row-Level Security (RLS)             |
| ORM           | Prisma (migrations via `prisma migrate`; RLS SQL raw)    |
| Cache / Queue | Redis 7 + BullMQ                                         |
| Storage       | Cloudflare R2 (invoice PDFs, backups) — optional in MVP  |
| Mobile        | PWA (service worker + IndexedDB via Dexie)               |
| UI            | Tailwind + shadcn/ui                                     |
| Tests         | Vitest (unit/integration) + Playwright (critical e2e)    |
| i18n          | next-intl (EN + Roman Urdu labels; full Urdu in P3)      |
| Obs           | Sentry (errors) + PostHog (product analytics)            |
| Dev DB        | Local Postgres 17 on Windows                             |
| Prod host     | Hostinger Ubuntu VPS, Docker Compose                     |

## 2. Monorepo layout (pnpm workspaces + Turborepo)

```
apps/
  web/              Next.js 15 app (shop UI + /admin subroute)
packages/
  db/               Prisma schema, migrations, seed
  core/             Pure domain logic (inventory, ledger, billing, forecasting)
  ui/               shadcn/ui-based shared components
  config/           ESLint, tsconfig, tailwind presets
services/
  worker/           BullMQ workers (forecasting, FBR, WA reminders, backups)
infra/
  rls/              RLS policy SQL files (applied outside Prisma)
  docker/           Dockerfiles + docker-compose.yml (prod)
  deploy/           GitHub Actions workflow + VPS helper scripts
  backup/           pg_dump scripts + optional R2/B2 uploader
```

## 3. Commands (pnpm scripts — all from repo root)

| Command                 | What it does                                           |
|-------------------------|--------------------------------------------------------|
| `pnpm dev`              | Turborepo: Next.js dev server + worker + watchers      |
| `pnpm build`            | Production build of all workspaces                     |
| `pnpm test`             | Vitest, all packages                                   |
| `pnpm test:rls`         | RLS isolation tests (required green on CI)            |
| `pnpm e2e`              | Playwright e2e (critical: billing, closing, sync)      |
| `pnpm lint`             | ESLint + typecheck                                     |
| `pnpm db:migrate`       | `prisma migrate dev`                                   |
| `pnpm db:rls:apply`     | Apply all SQL in `infra/rls/` (idempotent)             |
| `pnpm db:seed`          | Seed plans + super-admin + chart of accounts           |
| `pnpm admin:create`     | CLI to bootstrap a super-admin (non-interactive)       |

## 4. Conventions

**Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`). One logical change per commit. No WIP on main.

**TypeScript:** `strict: true`. No `any`. No `as` casts without justification. Shared types live in `packages/core/src/types`.

**Server Actions > API routes** for mutations. API routes only for webhooks (Stripe, FBR callback, WhatsApp) and public read endpoints.

**Database access:** Always through Prisma. Every authenticated request sets `SET LOCAL app.current_shop_id = '<uuid>'` inside a transaction — see [SPEC.md §3](SPEC.md#3-rls-policies). Never bypass RLS except in explicit super-admin code paths, which must audit-log.

**Money:** store as `DECIMAL(14,2)` or integer minor units (paise). Never `float`. PKR has no decimals for display — format on the edge.

**Time:** store UTC. Render in `Asia/Karachi`. A closing day = `[00:00 PKT, 23:59:59.999 PKT]` in server logic.

**Tests for money paths are not optional.** Billing, ledger, closing, sync reconciliation, RLS isolation — each has tests. PR blocks on red.

**No destructive migrations during PKT 9am–11pm.** Expand-migrate-contract pattern for schema changes once there are live tenants.

**Secrets:** never committed. All live in `.env` (dev) and `/etc/shopos/.env` on the VPS. `.env.example` is the source of truth for keys.

## 5. Domain invariants (quick list — see [SPEC.md §2.2](SPEC.md#22-invariants) for full)

1. `sum(stock_movement.qty_delta per product) = count(stock_item WHERE status='IN_STOCK')`
2. For every `sale`: `sum(payments.amount) + credit_amount == sale.total`
3. Ledger balances per `shop_id` per day: `sum(debit) == sum(credit)`
4. Negative stock disallowed unless `shop.allow_negative_stock=true`
5. IMEI/serial unique within a `shop_id`
6. A day with a `closing` row is immutable; reversals require super-admin + audit trail

## 6. Multi-tenancy (non-negotiable)

- Every tenant table has `shop_id UUID NOT NULL`.
- Every tenant table has an RLS policy: `USING (shop_id = current_setting('app.current_shop_id')::uuid)`.
- CI runs `pnpm test:rls` which proves tenant A cannot read, update, or delete tenant B's rows via Prisma. Red test = merge blocked.
- Super-admin uses a separate DB role (`BYPASSRLS`). Every super-admin action is captured in `audit_log` with `impersonated_shop_id` when applicable.

## 7. Environment

**Dev (Windows, this machine):**
```
DATABASE_URL=postgresql://postgres:AdeelAhmad%4012345@localhost:5432/shopos_dev?schema=public
REDIS_URL=redis://localhost:6379
```
Redis for dev: run via Docker Desktop or WSL. Postgres 17 is already installed locally (`C:\Program Files\PostgreSQL\17\bin\psql.exe`).

**Prod (Hostinger Ubuntu VPS):** everything in Docker Compose. See [SETUP.md](SETUP.md) for first-time bootstrap.

## 8. Super-admin bootstrap

Seeded on first `pnpm db:seed`:
- email: `adeel.ahmad8000@gmail.com`
- role: `SUPER_ADMIN` (platform-level, not tied to any shop)
- password: set on first login via password-reset email flow (no password stored in seed)

## 9. Brand & i18n

Working name: **ShopOS** (rename later — all UI strings are i18n keys so rename is a dictionary swap, not a refactor). Roman Urdu labels coexist with English (e.g. "Udhaar (Credit)", "Jama (Deposit)", "Maal (Stock)"). Full Urdu localization in Phase 3.

## 10. Pricing (seeded in `plans` table)

| Plan             | PKR          |
|------------------|--------------|
| Single shop /mo  | 1,500        |
| Multi-branch /mo | 3,000        |
| Lifetime         | 40,000 once  |

14-day trial, no card required. PK payments: manual bank transfer + admin-verify in MVP; JazzCash/EasyPaisa Business APIs later.

## 11. Open TODOs (decisions deferred)

- **Ubuntu version on Hostinger VPS** — target 24.04 LTS; if server is 22.04 the compose stack still works
- **Production domain** — TBD; SETUP.md uses `shopos.example.com` as placeholder
- **WhatsApp Business API credentials** — P1 automated reminders require WABA; manual `wa.me/` send works in P0
- **Backup offsite target** — local nightly dumps land in `/var/backups/shopos/`; R2 or B2 uploader is optional env flag
- **Phone OTP** — deferred to Phase 2 (Twilio assumed)
- **Brand rename** — at Phase 2 once the name is validated

## 12. Rules for Claude Code working in this repo

1. Plan before code. Plan mode for anything bigger than one file.
2. Read a file fully before editing. Grep for existing utilities before adding new ones.
3. Ask on ambiguity. Never invent domain facts (tax rates, FBR rules, legal defaults).
4. Small, focused commits. Conventional Commits.
5. Tests green before merge. `pnpm test:rls` and `pnpm e2e` for critical paths must pass.
6. No backwards-compat shims or fallback code for hypothetical scenarios.
7. Default to **no comments**. Comment only the non-obvious *why*.
8. When touching money, stock, ledger, or closing: write the test first.
9. When editing RLS: update `infra/rls/` AND add a test in `packages/db/test/rls.spec.ts`.
10. When a decision is not in this file or SPEC.md: ask.
