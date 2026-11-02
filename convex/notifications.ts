import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { postToN8nWebhook } from "./lib/notify";

export const getLoanNotifyContext = internalQuery({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const loan = await ctx.db.get(args.loanId);
    if (!loan) return null;
    const tool = await ctx.db.get(loan.toolId);
    const lender = await ctx.db.get(loan.lenderId);
    const borrower = await ctx.db.get(loan.borrowerId);
    return { loan, tool, lender, borrower };
  },
});

/**
 * Fired after loan create / status change. Picks the relevant recipient
 * and posts a minimized signed payload to n8n.
 */
export const dispatchLoanEvent = internalAction({
  args: {
    loanId: v.id("loans"),
    event: v.union(
      v.literal("loan.request_created"),
      v.literal("loan.status_changed"),
    ),
  },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.notifications.getLoanNotifyContext, {
      loanId: args.loanId,
    });
    if (!data?.loan || !data.tool) return;

    const { loan, tool, lender, borrower } = data;

    // Data minimization: notify only the counterparty who needs to act / know.
    let notifyEmail = "";
    let notifyName = "";
    let role: "lender" | "borrower" = "lender";

    if (args.event === "loan.request_created") {
      notifyEmail = lender?.email ?? "";
      notifyName = lender?.name ?? "Lender";
      role = "lender";
    } else {
      // Status changes notify the borrower
      notifyEmail = borrower?.email ?? "";
      notifyName = borrower?.name ?? "Borrower";
      role = "borrower";
    }

    if (!notifyEmail) {
      console.warn("No notify email; skipping n8n dispatch");
      return;
    }

    const result = await postToN8nWebhook(ctx, {
      event: args.event,
      loanId: args.loanId,
      toolName: tool.name,
      status: loan.status,
      startDate: loan.startDate,
      endDate: loan.endDate,
      notifyEmail,
      notifyName,
      role,
    });

    const idempotencyKey = `${args.event}:${args.loanId}:${loan.status}:${loan._creationTime}`;
    await ctx.runMutation(internal.loans.recordNotificationInternal, {
      loanId: args.loanId,
      type:
        args.event === "loan.request_created"
          ? "request_notification"
          : "status_notification",
      message: result.ok
        ? `Webhook delivered (${args.event} → ${notifyEmail})`
        : `Webhook failed: ${result.error ?? "unknown"}`,
      idempotencyKey,
    });
  },
});
