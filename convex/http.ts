import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getWebhookSecret, verifySignature } from "./lib/hmac";

const http = httpRouter();

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, X-LendLoop-Timestamp, X-LendLoop-Signature",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

async function requireSigned(
  request: Request,
  body: string,
): Promise<Response | null> {
  const timestamp = request.headers.get("X-LendLoop-Timestamp") ?? "";
  const signature = request.headers.get("X-LendLoop-Signature") ?? "";
  let secret: string;
  try {
    secret = getWebhookSecret();
  } catch {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: corsHeaders(),
    });
  }

  const ok = await verifySignature(secret, body, timestamp, signature);
  if (!ok) {
    return new Response(JSON.stringify({ error: "invalid_signature" }), {
      status: 401,
      headers: corsHeaders(),
    });
  }
  return null;
}

/** n8n daily job: fetch overdue loans (signed GET, empty body). */
http.route({
  path: "/n8n/overdue",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

http.route({
  path: "/n8n/overdue",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const denied = await requireSigned(request, "");
    if (denied) return denied;

    const overdue = await ctx.runQuery(internal.loans.listOverdueInternal, {});
    return new Response(JSON.stringify({ overdue }), {
      status: 200,
      headers: corsHeaders(),
    });
  }),
});

/**
 * n8n write-back after sending a reminder.
 * Body: { loanId, idempotencyKey, message }
 * Idempotent on idempotencyKey.
 */
http.route({
  path: "/n8n/reminders",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

http.route({
  path: "/n8n/reminders",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const denied = await requireSigned(request, body);
    if (denied) return denied;

    let parsed: {
      loanId?: string;
      idempotencyKey?: string;
      message?: string;
    };
    try {
      parsed = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    if (!parsed.loanId || !parsed.idempotencyKey || !parsed.message) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    try {
      const result = await ctx.runMutation(internal.loans.recordReminderInternal, {
        loanId: parsed.loanId as Id<"loans">,
        idempotencyKey: parsed.idempotencyKey,
        message: parsed.message,
      });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders(),
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : "write_failed",
        }),
        { status: 400, headers: corsHeaders() },
      );
    }
  }),
});

export default http;
