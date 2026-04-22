# ShopOS — Roadmap

> Phased build plan with week-by-week breakdown and acceptance criteria per phase.
> Anchor: [CLAUDE.md](CLAUDE.md). Technical spec: [SPEC.md](SPEC.md). VPS bootstrap: [SETUP.md](SETUP.md).

## Phase 0 — Foundation (Weeks 1–2)

Goal: empty-but-deployable app. A user can sign up, create a shop, log in on a Hostinger VPS behind HTTPS, land on an empty dashboard. Every non-negotiable (RLS, CI, backups, hardening) is in place so Phase 1 never has to retrofit.

### Week 1 — Repo + Database + Auth

1. **Monorepo scaffold** (pnpm + Turborepo)
   - `apps/web`, `packages/{db,core,ui,config}`, `services/worker`, `infra/{rls,docker,deploy,backup}`
   - Shared TS config (strict), ESLint, Prettier, Tailwind preset
   - `.env.example` with every key documented
2. **Prisma schema v1** — all entities from [SPEC.md §2.3](SPEC.md#23-entities)
   - Generate migration; apply to local Postgres 17
   - Seed script: plans, chart of accounts (standard), super-admin (`adeel.ahmad8000@gmail.com`, password set via reset email flow)
   - `pnpm db:rls:apply` script that applies every SQL file in `infra/rls/`
3. **RLS policies** — every tenant table gets `ENABLE + FORCE RLS` + `tenant_isolation` policy ([SPEC.md §3.1](SPEC.md#31-policy-template))
4. **RLS isolation test** — `packages/db/test/rls.spec.ts` iterates Prisma DMMF, asserts cross-tenant leaks are zero on SELECT/UPDATE/DELETE. Must be green on CI to merge.
5. **Better-Auth setup** — email + password, argon2id, session cookie, password-reset magic link (stub email transport in dev, Resend/SMTP later)
6. **Middleware** — resolve `shop_id` from `shop_member` on every authenticated request; open Prisma transaction with `SET LOCAL app.current_shop_id = '<uuid>'`

### Week 2 — UI shell + CI + Deploy + Hardening

7. **Next.js app shell**
   - `/signup`, `/login`, `/reset-password` — Better-Auth wired
   - Onboarding wizard: shop name, address, FBR-registered? (sets `default_tax_rate`), opening cash, opening bank
   - Empty dashboard route `/dashboard` (gated on active session + shop_member)
   - Empty super-admin route `/admin` (gated on `user.role = SUPER_ADMIN`)
   - PWA manifest + service worker skeleton (no offline sync yet — that's P1)
8. **Observability** — Sentry DSN wired (error-only for P0), PostHog stubbed with `NEXT_PUBLIC_POSTHOG_KEY` env var
9. **Docker Compose (prod)** — `infra/docker/docker-compose.yml`
   - Services: `postgres:16`, `redis:7`, `web` (Next.js standalone build), `worker` (BullMQ), `nginx` (reverse proxy + Let's Encrypt via `certbot` sidecar or Caddy swap)
   - Named volumes: `pg_data`, `redis_data`, `caddy_data`, `backups`
   - Health checks on every service
10. **GitHub Actions CI**
    - PR: `lint` → `typecheck` → `test` → `test:rls` → `build`
    - Push to `main`: all of the above → `docker build` → `docker push` to GHCR → SSH deploy (see below)
11. **GitHub Actions CD (SSH deploy to Hostinger VPS)**
    - Encrypted secrets: `VPS_HOST`, `VPS_USER` (=`deploy`), `VPS_SSH_KEY` (private key; public half on server), `GHCR_PAT`
    - Job: SSH → `cd /opt/shopos && docker compose pull && docker compose up -d` → wait 30s → `curl http://localhost:3000/health` → fail+rollback if unhealthy
12. **Backup job** — `infra/backup/pg_dump.sh` cron (03:00 PKT) running in a `backup` sidecar container
    - Writes `/var/backups/shopos/shopos_<date>.dump` (mounted volume)
    - Retention: 14 daily + 8 weekly + 6 monthly (prune script)
    - Optional R2/B2 uploader gated by `BACKUP_REMOTE` env
13. **VPS hardening** — all covered in [SETUP.md](SETUP.md):
    - Non-root `deploy` user with `sudo`
    - SSH: key-only, root login disabled, password auth disabled, `Port 22` (or moved)
    - UFW: allow 22, 80, 443; deny everything else
    - fail2ban: sshd jail with default ban time
    - Automatic security updates (`unattended-upgrades`)
14. **SETUP.md** — copy-pasteable walkthrough so a non-expert can bootstrap the VPS in ~30 min

### Phase 0 acceptance criteria

- [ ] `pnpm dev` runs on Windows against local Postgres 17; signup → login → dashboard works
- [ ] `pnpm test:rls` green (zero cross-tenant leaks across every tenant table)
- [ ] `pnpm test` green; `pnpm lint` clean
- [ ] Push to `main` lands on the Hostinger VPS via GitHub Actions, behind HTTPS, in < 5 min
- [ ] Super-admin can log in at `/admin` (seeded account) and see an empty tenants table
- [ ] Nightly backup produces a `.dump` file with size > 0; restore-drill script succeeds on staging
- [ ] VPS scan: `nmap -sT vps` only shows 22/80/443; `ssh root@vps` is refused; `deploy` user requires key

---

## Phase 1 — MVP (Weeks 3–8)

All P0 modules from [SHOPOS_MASTER_BRIEF.md §7](SHOPOS_MASTER_BRIEF.md). Dogfood in Lahore.

### Week 3 — Products + Inventory
- Product CRUD (web + mobile-first forms)
- Barcode scan via `@zxing/browser` (camera in PWA)
- Variant model (color/storage/RAM)
- IMEI/serial capture for Mobile + Laptop categories
- Bulk import via Excel (map → preview → commit)
- Low-stock dashboard widget

### Week 4 — Billing / POS (the single most important screen)
- POS page — keyboard-first desktop, tap-first mobile
- Cart ops: scan, typeahead, grid pick, qty ±, discount per-line + per-bill
- Customer: walk-in default, quick-add new, select existing
- Payment: cash / bank / jazzcash / easypaisa / card / split / credit
- Credit-limit guard with PIN override
- Thermal receipt (Web Bluetooth ESC/POS) + PDF fallback + WhatsApp send button (`wa.me/`)
- **Offline:** full billing works offline via Dexie queue ([SPEC.md §5](SPEC.md#5-offline-sync-flow))
- **Perf:** instrument add-to-cart tap→render; fail PR if > 150ms

### Week 5 — Purchases + Customers + Suppliers (Khata)
- Purchase entry, partial payments, purchase returns
- Customer/supplier ledger views: running balance, transactions, outstanding
- Record payment received / paid on account
- Manual WhatsApp reminder for overdue

### Week 6 — Cash, Bank, Closing
- Dashboard widgets: cash in hand, bank balance (live)
- Expense entry with category
- **Closing workflow** ([SPEC.md §7](SPEC.md#7-closing-flow)) — the killer feature
- Closing report: P&L snippet, top sellers, slow movers, payment breakdown, variance note
- Day immutability enforced by trigger

### Week 7 — Reports + Forecasting + FBR structure
- Reports: daily/weekly/monthly sales; by product, category, customer, staff; purchases by supplier; stock valuation; gross P&L; aging buckets; tax summary
- Export PDF + Excel
- Nightly forecasting job ([SPEC.md §9](SPEC.md#9-forecasting)); reorder-suggested dashboard card
- FBR structural fields + worker stub (no live creds needed); shop can enter FBR POS ID + API key in Settings
- Invoice PDF renders FBR QR when posted, "FBR pending" otherwise

### Week 8 — Super-admin + Polish + Dogfood launch
- Super-admin: tenants table, tenant detail, impersonate (audit-logged, banner-flagged, 60-min cap), suspend, extend trial, apply discount, revenue dashboard
- Feature flags UI per-tenant
- Audit log viewer
- Data export: "Download all my data" button → ZIP of CSVs + PDFs
- Polish pass on billing screen (the one users touch 500+ times/day)
- Onboard 3–5 dogfood shops in Lahore

### Phase 1 acceptance criteria

- [ ] Every P0 module from the master brief is functional and tested
- [ ] At least 3 Lahore shops use the app daily for 7 consecutive days, including a nightly closing, **unprompted**
- [ ] DAS (Daily Active Shops with a closing) ≥ 3 for 7 consecutive days
- [ ] No money-path bug in the last 7 days of dogfood (zero ledger imbalances, zero stock drift)
- [ ] Offline → online sync tested with 100+ pending mutations; zero duplicates, zero lost sales
- [ ] Super-admin can resolve any of the 5 most common tenant issues (extend trial, reset password, reverse sale, toggle flag, see audit trail) in < 2 min each

---

## Phase 2 — Growth (Weeks 9–14)

### Week 9–10 — Multi-branch
- Branch model under shop; per-branch stock, per-branch cash/bank
- Inter-branch stock transfer
- Per-branch reporting + consolidated view

### Week 11 — Repair + Warranty
- Repair ticket: device, IMEI, issue, diagnosis, parts, labor, status (INTAKE / DIAGNOSED / IN_REPAIR / READY / DELIVERED)
- Warranty claim tracking against sold `stock_item` with warranty window

### Week 12 — WhatsApp Business API + automated reminders
- WABA integration (Cloud API)
- Automated: receipt on sale, due reminder T-3/T+1/T+7, closing summary to owner
- Template management + opt-out

### Week 13 — Phone OTP + Staff permissions matrix
- Twilio phone OTP (add to signup + login + 2FA)
- Role permission matrix UI; CASHIER can't see cost/profit; ACCOUNTANT can't delete sales

### Week 14 — Forecasting v2 + FBR live
- Weekly seasonality in forecast (Sun–Sat patterns + Eid window booster)
- FBR live integration per-tenant (once compliance review confirms sandbox flow)
- Referral program (if validated in P1): `refer → 1 month free` each on trial→paid conversion

### Phase 2 acceptance

- [ ] Multi-branch tested in a 2-branch shop end-to-end (transfer, consolidated reports)
- [ ] WhatsApp automated reminders running for all active shops; opt-out respected
- [ ] FBR live invoices posting for at least one real shop; failure rate < 1%

---

## Phase 3 — Scale (Weeks 15+)

### Urdu RTL localization
- Full Noto Nastaliq Urdu pass; flip layout for Urdu only (not Roman Urdu)
- Numerals: keep Western Arabic digits

### Prophet forecasting microservice
- Python + Prophet, gRPC, only for shops with > 1 year history
- Feature flag `enable_prophet_forecast`

### Franchise mode
- One owner, many branded shops with distinct tenant isolation
- Reporting roll-up across owner's shops

### Marketplace sync (optional)
- Daraz / OLX inventory push (read-only first)

---

## Deliverables summary (when each phase is "done")

| Phase | Minimum deliverable |
|-------|---------------------|
| P0    | Deployed empty app behind HTTPS on Hostinger, CI green, RLS proven, backups running, docs written |
| P1    | Real shops billing daily in Lahore, closing every night, zero money bugs in 7 days |
| P2    | Multi-branch, WABA automated, FBR live, referrals tracking |
| P3    | Urdu RTL, ML forecasting, franchise mode |
