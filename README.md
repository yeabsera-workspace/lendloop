# LendLoop

Neighborhood tool-lending board. Neighbors list tools, request borrow windows, approve or decline, mark returns — and **n8n** handles signed notifications plus daily overdue reminders.

**Tagline:** Borrow what you need. Lend what you don't.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js App Router (TypeScript) |
| Auth | Clerk |
| Data + backend | Convex (queries/mutations/actions + HTTP) |
| Automation | n8n (Docker Compose or Cloud) |

## Architecture

```
┌─────────────┐     Clerk JWT      ┌──────────────────────────────┐
│  Next.js UI │ ─────────────────► │  Convex                      │
│  (Clerk +   │   ConvexReactClient│  - RBAC in functions         │
│   Convex)   │ ◄───────────────── │  - tools / loans / users     │
└─────────────┘                    │  - automationActivity        │
                                   │                              │
                                   │  HTTP /n8n/overdue (GET)     │◄── signed
                                   │  HTTP /n8n/reminders (POST)  │◄── signed
                                   │  Action → n8n webhook        │──► signed
                                   └──────────────┬───────────────┘
                                                  │
                                                  ▼
                                   ┌──────────────────────────────┐
                                   │  n8n                         │
                                   │  1) Request notification     │
                                   │  2) Daily overdue reminders  │
                                   │  3) Error handler workflow   │
                                   └──────────────────────────────┘
```

### Roles (enforced in Convex, not only UI)

| Role | Capabilities |
| --- | --- |
| **user** | Create/edit/delete own listings; request tools; approve/decline/return only as lender on own tools; see activity on loans they are party to |
| **admin** | Everything above + remove any listing, view all loans, mark **Trusted Lender** |

First signed-in user is seeded as `admin` (handy for local demos). Later users are `user`.

### Loan lifecycle

`pending` → `approved` / `declined` → `active` (when start date reached or approved today) → `returned`

## Local setup

### 1. Clone & install

```bash
npm install
cp .env.example .env.local
```

### 2. Clerk

1. Create an application at [clerk.com](https://clerk.com) **or** run `npx clerk@latest init --accountless -y`.
2. Enable the **Convex** integration **or** create a JWT template named `convex` with `"aud": "convex"` (Dashboard → JWT templates, or API). Without this, Convex mutations see no identity.
3. Put publishable + secret keys in `.env.local`.
4. Set `CLERK_JWT_ISSUER_DOMAIN` (Convex env + local) to the Frontend API URL / issuer (e.g. `https://verb-noun-00.clerk.accounts.dev`).

### 3. Convex

```bash
npx convex dev
```

Follow the prompts to create/link a project. This writes `NEXT_PUBLIC_CONVEX_URL` and regenerates `convex/_generated`.

Then set Convex environment variables (Dashboard or CLI):

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-app.clerk.accounts.dev"
npx convex env set N8N_WEBHOOK_SECRET "$(openssl rand -hex 32)"
# After n8n is up and the request workflow is active:
npx convex env set N8N_REQUEST_WEBHOOK_URL "http://host.docker.internal:5678/webhook/lendloop-request"
```

> From Convex cloud actions, `localhost` is not reachable. For local n8n use a tunnel (ngrok/Cloudflare) or n8n Cloud. Put the same secret in `.env` / Compose as `N8N_WEBHOOK_SECRET`.

Copy the Convex **HTTP Actions URL** (`https://….convex.site`) into `.env` as `CONVEX_HTTP_URL` for n8n.

### 4. n8n (Docker)

```bash
# Ensure N8N_WEBHOOK_SECRET and CONVEX_HTTP_URL are in a local .env
docker compose up -d
```

Open http://localhost:5678 → import JSON from `n8n/workflows/`:

1. `03-error-handler.json` first (name must stay **LendLoop — Error handler**)
2. `01-request-notification.json`
3. `02-overdue-reminders.json`

Activate all three. In n8n Settings → Variables (or container env), confirm:

- `LENDLOOP_WEBHOOK_SECRET` — same value as Convex `N8N_WEBHOOK_SECRET`
- `CONVEX_HTTP_URL` — Convex HTTP site URL

Production webhook path for requests: `/webhook/lendloop-request` (test URL uses `/webhook-test/...`).

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000 — public board + Clerk sign-in. Authenticated routes: `/browse`, `/listings`, `/requests`, `/incoming`, `/admin`.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Next | Clerk client |
| `CLERK_SECRET_KEY` | Next | Clerk server |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex (+ `.env.local` for reference) | Validate Clerk JWTs |
| `NEXT_PUBLIC_CONVEX_URL` | Next | Convex client |
| `CONVEX_HTTP_URL` | n8n / Compose | Call Convex HTTP routes |
| `N8N_WEBHOOK_SECRET` | Convex + Compose | HMAC shared secret |
| `N8N_REQUEST_WEBHOOK_URL` | Convex | Outbound loan-event webhook |
| `LENDLOOP_WEBHOOK_SECRET` | n8n env | Same secret (Compose maps it) |

**Never commit secrets.** Workflow JSON has no credentials — only env references.

## Security & data minimization

- **HMAC-SHA256** over `timestamp.body` with headers `X-LendLoop-Timestamp` / `X-LendLoop-Signature`. ±5 minute skew rejection.
- Verified on **both** sides: n8n verifies Convex→n8n; Convex HTTP verifies n8n→Convex.
- Outbound loan payloads include only what the notifier needs: event, loan id, tool name, status, dates, recipient email/name/role — **no** full user records or unrelated PII.
- Public query returns **name + category only**.
- RBAC checked in every Convex mutation/query that mutates or exposes private data (`requireUser` / `requireAdmin` / ownership asserts).
- Reminder write-back is **idempotent** on `idempotencyKey` (`overdue:{loanId}:{YYYY-MM-DD}`). Retries return `{ duplicate: true }` without double-counting.
- n8n HTTP nodes use **retryOnFail** (3 tries). Failed runs attach to **LendLoop — Error handler** so nothing fails silently.

## Bonus: automation activity

Each loan shows recent `automationActivity` rows in the app (webhook delivery / reminder messages with relative timestamps).

## Scripts

```bash
npm run dev          # Next.js
npx convex dev       # Convex watch + codegen
docker compose up -d # n8n
```

## What I'd change for production

1. **Networking** — Private connectivity between Convex actions and n8n (VPC / allowlisted egress, or n8n Cloud with fixed webhook URLs). No long-lived tunnels.
2. **Secrets** — Rotate HMAC secrets; store in Convex env + n8n credentials store; short-lived if possible.
3. **Real channels** — Replace mock log nodes with SES/Postmark + Slack; template messages; unsubscribe / quiet hours.
4. **Admin bootstrap** — Drop “first user = admin”; provision via allowlist or Clerk public metadata synced into Convex.
5. **Observability** — Structured logs, n8n → PagerDuty on error workflow, Convex metrics/alerts on webhook failure rates.
6. **Hardening** — Rate-limit HTTP endpoints; optional mTLS; stricter CORS; audit log for admin actions.
7. **Data** — Soft-delete retention policy; encrypt sensitive fields at rest if expanding PII; GDPR export/delete paths.
8. **UX** — Email verification required before lending; conflict calendar for overlapping loans; push activate-approved via scheduled Convex job instead of opportunistic flips.

## Repo layout

```
app/                 Next.js routes (public + authenticated)
components/          UI
convex/              Schema, RBAC, HTTP, n8n dispatch
n8n/workflows/       Exported workflow JSON (no secrets)
docker-compose.yml   Self-hosted n8n
.env.example         Documented env vars
```
