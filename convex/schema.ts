import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const CATEGORIES = [
  "power_tools",
  "garden",
  "kitchen",
  "camping",
  "automotive",
  "cleaning",
  "other",
] as const;

export const CONDITIONS = ["new", "excellent", "good", "fair"] as const;

export const LOAN_STATUSES = [
  "pending",
  "approved",
  "declined",
  "active",
  "returned",
] as const;

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    trustedLender: v.boolean(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.union(
      v.literal("power_tools"),
      v.literal("garden"),
      v.literal("kitchen"),
      v.literal("camping"),
      v.literal("automotive"),
      v.literal("cleaning"),
      v.literal("other"),
    ),
    condition: v.union(
      v.literal("new"),
      v.literal("excellent"),
      v.literal("good"),
      v.literal("fair"),
    ),
    description: v.string(),
    removed: v.boolean(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"])
    .index("by_removed", ["removed"]),

  loans: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("active"),
      v.literal("returned"),
    ),
    lastReminderAt: v.optional(v.number()),
    reminderCount: v.number(),
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_status", ["status"])
    .index("by_status_endDate", ["status", "endDate"]),

  automationActivity: defineTable({
    loanId: v.id("loans"),
    type: v.union(
      v.literal("request_notification"),
      v.literal("overdue_reminder"),
      v.literal("status_notification"),
    ),
    message: v.string(),
    idempotencyKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_loan", ["loanId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),
});
