import { ActionCtx } from "../_generated/server";
import { getWebhookSecret, signPayload } from "./hmac";

export type RequestNotifyPayload = {
  event: "loan.request_created" | "loan.status_changed";
  loanId: string;
  toolName: string;
  status: string;
  startDate: string;
  endDate: string;
  /** Minimal recipient info — only what the workflow needs */
  notifyEmail: string;
  notifyName: string;
  role: "lender" | "borrower";
};

/**
 * POST a signed, minimized payload to the n8n request-notification webhook.
 * Failures are logged; they do not roll back the loan mutation (fire-and-forget
 * from an action scheduled after the mutation).
 */
export async function postToN8nWebhook(
  _ctx: ActionCtx,
  payload: RequestNotifyPayload,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const url = process.env.N8N_REQUEST_WEBHOOK_URL;
  if (!url) {
    console.warn("N8N_REQUEST_WEBHOOK_URL not set; skipping notification");
    return { ok: false, error: "webhook_url_missing" };
  }

  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const secret = getWebhookSecret();
  const signature = await signPayload(secret, body, timestamp);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LendLoop-Timestamp": timestamp,
        "X-LendLoop-Signature": signature,
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("n8n webhook failed", res.status, text);
      return { ok: false, status: res.status, error: text };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.error("n8n webhook error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
