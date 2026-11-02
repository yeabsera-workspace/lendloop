# n8n workflows

Import these into n8n (UI → **Workflows → Import from File**). Order:

1. `03-error-handler.json` first.
2. `01-request-notification.json` — webhook `POST /webhook/lendloop-request`.
3. `02-overdue-reminders.json` — cron daily 09:00 UTC.

After import, open workflows 01 and 02 → **Settings → Error Workflow** → select **LendLoop — Error handler** (export JSON references the name; n8n binds by id locally).

## Secrets (not in JSON)

Set in Docker Compose / n8n environment:

| Env | Description |
| --- | --- |
| `LENDLOOP_WEBHOOK_SECRET` | Same as Convex `N8N_WEBHOOK_SECRET` |
| `CONVEX_HTTP_URL` | e.g. `https://….convex.site` (from Docker: `http://host.docker.internal:3211`) |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` | Required so Code nodes can read `$env.*` |

HMAC Code nodes use a **pure-JS HMAC-SHA256** helper (n8n task runners block `require('crypto')` and have no global `crypto`).

## HMAC contract

```
signature = hex(HMAC_SHA256(secret, `${timestamp}.${rawBody}`))
headers:
  X-LendLoop-Timestamp: <unix ms>
  X-LendLoop-Signature: <hex digest>
```

GET `/n8n/overdue` uses an empty body (`""`).

## Idempotency

Reminder write-back key: `overdue:{loanId}:{YYYY-MM-DD}` — safe to retry.
