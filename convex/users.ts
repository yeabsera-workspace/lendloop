import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  getIdentityOrThrow,
  getCurrentUser,
  requireAdmin,
} from "./lib/auth";

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await getIdentityOrThrow(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      const email = identity.email ?? existing.email;
      const name =
        identity.name ?? identity.nickname ?? existing.name ?? "Neighbor";
      if (email !== existing.email || name !== existing.name) {
        await ctx.db.patch(existing._id, { email, name });
      }
      return existing._id;
    }

    // First user becomes admin for local demo convenience; otherwise "user".
    const anyUser = await ctx.db.query("users").first();
    const role = anyUser ? "user" : "admin";

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? "",
      name: identity.name ?? identity.nickname ?? "Neighbor",
      role,
      trustedLender: false,
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const setTrustedLender = mutation({
  args: {
    userId: v.id("users"),
    trusted: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");
    await ctx.db.patch(args.userId, { trustedLender: args.trusted });
    return { ok: true };
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");
    await ctx.db.patch(args.userId, { role: args.role });
    return { ok: true };
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").collect();
  },
});
