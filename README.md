# TradeLab

TradeLab is an educational paper-trading terminal. Students practise with virtual rupees. The application does not connect to a brokerage and cannot place a real-money order.

Positions, cash, orders, fills, journals, and learning progress are stored in hosted PostgreSQL. The browser is not the ledger.

## Stack

- Next.js, React, TypeScript, and Tailwind CSS on Vercel
- PostgreSQL through Prisma, intended for Neon or another pooled Postgres provider
- TradingView Lightweight Charts for display
- A replaceable market-data adapter. Without credentials the adapter runs in labelled demo mode

Docker is not required for development or deployment.

## Local setup

1. Install Node.js 22 or newer.
2. Create a Postgres database. For Neon, copy the pooled connection string into `DATABASE_URL` and the direct connection string into `DATABASE_URL_UNPOOLED`.
3. Copy `.env.example` to `.env.local` and fill in the variables. Do not commit `.env.local`.
4. Install and migrate:

```bash
npm install
npx prisma migrate deploy
npm run db:seed
```

5. Create the first super admin without putting a password in source control:

```bash
npx tsx prisma/bootstrap.ts
```

`BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are read once. If a super admin already exists, the command does nothing. You can instead open `/setup` while no super admin exists and submit `SETUP_TOKEN` with the new admin's email and password. Remove those secrets after the account works.

6. Start the app:

```bash
npm run dev
```

Demo student accounts are created only when `ENABLE_DEMO_SEED=true` and the environment is `development` or Vercel `preview`. Set `SEED_DEMO_PASSWORD` yourself. The seeded addresses are `student.demo@tradelab.local`, `student2.demo@tradelab.local`, and `instructor.demo@tradelab.local`. Production ignores this switch.

## Environment

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres URL used by the running app |
| `DATABASE_URL_UNPOOLED` | Direct Postgres URL used by Prisma migrations |
| `SETUP_TOKEN` | Protects the one-time `/setup` page |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | One-time CLI bootstrap |
| `ENABLE_DEMO_SEED` / `SEED_DEMO_PASSWORD` | Development and preview sample accounts |
| `MARKET_DATA_PROVIDER` | `demo`, `twelvedata`, or `alphavantage` |
| `MARKET_DATA_API_KEY` | Provider key. Never put it in the browser |
| `MARKET_DATA_MODE` | Set to `realtime` only when the contract allows that label |
| `CRON_SECRET` | Bearer token required by `/api/cron` |
| `APP_URL` | Public origin used in password-reset links |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional password-reset email |

Use a separate database for development, preview, and production. A preview deployment must not receive the production `DATABASE_URL`.

For Neon on Vercel, use the pooled host in `DATABASE_URL` with `pgbouncer=true` and a small connection limit, and the non-pooled host in `DATABASE_URL_UNPOOLED`. The Neon integration also provides `POSTGRES_PRISMA_URL`; the server prefers that value when it is present. Prisma is constructed once per warm serverless instance. Do not open a new client per helper call beyond the shared module.

## Deployment

1. Push this repository to GitHub.
2. Create a Neon (or other managed Postgres) project for production, and another for preview.
3. In Vercel, import the GitHub repository. Vercel builds with `prisma generate && next build`.
4. Add the environment variables to Production and, separately, to Preview. Set `RUN` migrations deliberately.
5. Apply migrations before serving traffic:

```bash
npx prisma migrate deploy
```

Run that with the production `DATABASE_URL_UNPOOLED` value from a trusted machine or a protected GitHub Action. The application build does not migrate automatically, so a preview cannot change production by being built.

6. Deploy a preview from a pull request. Check sign-in, a virtual credit, a simulated order, and that a reload still shows the ledger.
7. Promote the verified deployment to production.
8. Open `/api/health`. It reports database connectivity and the market-data mode without secrets.
9. Confirm Vercel logs and that cron requests send `Authorization: Bearer $CRON_SECRET`.

Scheduled paths:

- `/api/cron?job=evaluate` checks resting orders
- `/api/cron?job=snapshots` stores portfolio snapshots
- `/api/cron?job=competitions` refreshes ranks

The committed schedules run once per day so a Vercel Hobby project can deploy. Hobby timing is only guaranteed within the scheduled hour. Resting orders are also evaluated when that student opens the portfolio, so practice does not depend on a permanent server process. A Pro project can tighten `/api/cron?job=evaluate` if faster checks are required.

## Market data

Charts read candles from `/api/market/candles`. The chart library is not a price source. See [docs/SIMULATION_RULES.md](docs/SIMULATION_RULES.md). Accounting is described in [docs/ACCOUNTING.md](docs/ACCOUNTING.md).

If you do not have a provider key, leave `MARKET_DATA_PROVIDER=demo`. The terminal shows `DEMO` and states that the prices are synthetic.

## Tests

```bash
npm test
```

The automated tests cover fees, average cost, reserves, insufficient cash, overselling, stale quotes, sequential buys against one cash balance, permissions, competition adjustments, and the demo-data label. They do not need a database. A production rollout should still place a real order against the preview database and confirm the ledger row survives a new request.

## Roles

Super admins manage accounts, virtual funds, resets, settings, instruments, and audit logs. Instructors manage their classes, lessons, and journal feedback. Students can see and trade only their own practice account. Server handlers enforce this. Suspending a user stops new fills. Disabling a user revokes sessions.

Audit and ledger tables reject SQL updates and deletes. The admin screens have no edit or delete action for those records.

## Operations still outside this repository

A paid market-data contract, email delivery, and the Vercel project itself are account setup, not code. Connect the GitHub repository in the Vercel dashboard and store secrets there. Do not add them to the repository.
