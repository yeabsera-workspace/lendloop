import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
  assertLoanParticipant,
  getCurrentUser,
  requireAdmin,
  requireUserMutation,
} from "./lib/auth";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function assertDateRange(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("Dates must be YYYY-MM-DD");
  }
  if (endDate < startDate) throw new Error("endDate must be on or after startDate");
  if (startDate < todayISO()) throw new Error("startDate cannot be in the past");
}

export const createRequest = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const borrower = await requireUserMutation(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.removed) throw new Error("Tool not found");
    if (tool.ownerId === borrower._id) {
      throw new Error("Cannot borrow your own tool");
    }
    assertDateRange(args.startDate, args.endDate);

    const blocking = await ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", args.toolId))
      .collect();
    const conflict = blocking.find(
      (l) =>
        (l.status === "pending" ||
          l.status === "approved" ||
          l.status === "active") &&
        !(args.endDate < l.startDate || args.startDate > l.endDate),
    );
    if (conflict) throw new Error("Tool not available for those dates");

    const loanId = await ctx.db.insert("loans", {
      toolId: args.toolId,
      borrowerId: borrower._id,
      lenderId: tool.ownerId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      reminderCount: 0,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.dispatchLoanEvent, {
      loanId,
      event: "loan.request_created",
    });

    return loanId;
  },
});

export const approve = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await requireUserMutation(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Loan not found");
    if (user.role !== "admin" && loan.lenderId !== user._id) {
      throw new Error("Forbidden: only the lender can approve");
    }
    if (loan.status !== "pending") throw new Error("Request is not pending");

    // Activate immediately if start date is today or past; else approved/reserved
    const status = loan.startDate <= todayISO() ? "active" : "approved";
    await ctx.db.patch(args.loanId, { status });

    await ctx.scheduler.runAfter(0, internal.notifications.dispatchLoanEvent, {
      loanId: args.loanId,
      event: "loan.status_changed",
    });
  },
});

export const decline = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await requireUserMutation(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Loan not found");
    if (user.role !== "admin" && loan.lenderId !== user._id) {
      throw new Error("Forbidden: only the lender can decline");
    }
    if (loan.status !== "pending") throw new Error("Request is not pending");

    await ctx.db.patch(args.loanId, { status: "declined" });

    await ctx.scheduler.runAfter(0, internal.notifications.dispatchLoanEvent, {
      loanId: args.loanId,
      event: "loan.status_changed",
    });
  },
});

export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await requireUserMutation(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Loan not found");
    if (user.role !== "admin" && loan.lenderId !== user._id) {
      throw new Error("Forbidden: only the lender can mark returned");
    }
    if (loan.status !== "active" && loan.status !== "approved") {
      throw new Error("Loan is not active");
    }

    await ctx.db.patch(args.loanId, { status: "returned" });

    await ctx.scheduler.runAfter(0, internal.notifications.dispatchLoanEvent, {
      loanId: args.loanId,
      event: "loan.status_changed",
    });
  },
});

export const activateApprovedDue = mutation({
  args: {},
  handler: async (ctx) => {
    // Optional helper: flip approved → active when start date arrives
    const user = await requireUserMutation(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .collect();
    const today = todayISO();
    for (const loan of loans) {
      if (loan.status === "approved" && loan.startDate <= today) {
        await ctx.db.patch(loan._id, { status: "active" });
      }
    }
  },
});

export const myRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect();
    return await enrichLoans(ctx, loans);
  },
});

export const incomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .collect();
    return await enrichLoans(ctx, loans);
  },
});

export const adminAllLoans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const loans = await ctx.db.query("loans").collect();
    return await enrichLoans(ctx, loans);
  },
});

export const getActivity = query({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Loan not found");
    assertLoanParticipant(user, loan);

    return await ctx.db
      .query("automationActivity")
      .withIndex("by_loan", (q) => q.eq("loanId", args.loanId))
      .collect();
  },
});

async function enrichLoans(
  ctx: { db: QueryCtx["db"] },
  loans: Doc<"loans">[],
) {
  const enriched = [];
  for (const loan of loans) {
    const tool = await ctx.db.get(loan.toolId);
    const borrower = await ctx.db.get(loan.borrowerId);
    const lender = await ctx.db.get(loan.lenderId);
    enriched.push({
      ...loan,
      toolName: tool?.name ?? "Unknown tool",
      toolCategory: tool?.category ?? "other",
      borrowerName: borrower?.name ?? "Neighbor",
      lenderName: lender?.name ?? "Neighbor",
      lenderTrusted: lender?.trustedLender ?? false,
      isOverdue:
        (loan.status === "active" || loan.status === "approved") &&
        loan.endDate < todayISO(),
    });
  }
  return enriched.sort((a, b) => b._creationTime - a._creationTime);
}

/** Internal: used by HTTP overdue endpoint */
export const listOverdueInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const today = todayISO();
    const active = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const approved = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    const overdue = [...active, ...approved].filter((l) => l.endDate < today);
    const result = [];
    for (const loan of overdue) {
      const borrower = await ctx.db.get(loan.borrowerId);
      const tool = await ctx.db.get(loan.toolId);
      if (!borrower?.email) continue;
      result.push({
        loanId: loan._id,
        toolName: tool?.name ?? "tool",
        endDate: loan.endDate,
        borrowerEmail: borrower.email,
        borrowerName: borrower.name,
        reminderCount: loan.reminderCount,
      });
    }
    return result;
  },
});

/** Internal idempotent reminder write-back */
export const recordReminderInternal = internalMutation({
  args: {
    loanId: v.id("loans"),
    idempotencyKey: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationActivity")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();

    if (existing) {
      return { ok: true, duplicate: true, activityId: existing._id };
    }

    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Loan not found");

    // Bonus UI prefers short relative copy, e.g. "Reminder sent … ago"
    const displayMessage = args.message.startsWith("Reminder sent")
      ? args.message
      : `Reminder sent — ${args.message}`;

    const activityId = await ctx.db.insert("automationActivity", {
      loanId: args.loanId,
      type: "overdue_reminder",
      message: displayMessage,
      idempotencyKey: args.idempotencyKey,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.loanId, {
      lastReminderAt: Date.now(),
      reminderCount: loan.reminderCount + 1,
    });

    return { ok: true, duplicate: false, activityId };
  },
});

export const recordNotificationInternal = internalMutation({
  args: {
    loanId: v.id("loans"),
    type: v.union(
      v.literal("request_notification"),
      v.literal("status_notification"),
    ),
    message: v.string(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationActivity")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();
    if (existing) {
      return { ok: true, duplicate: true, activityId: existing._id };
    }

    const activityId = await ctx.db.insert("automationActivity", {
      loanId: args.loanId,
      type: args.type,
      message: args.message,
      idempotencyKey: args.idempotencyKey,
      createdAt: Date.now(),
    });
    return { ok: true, duplicate: false, activityId };
  },
});
