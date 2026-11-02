import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  assertCanEditTool,
  getCurrentUser,
  requireAdmin,
  requireUserMutation,
} from "./lib/auth";

const categoryValidator = v.union(
  v.literal("power_tools"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("automotive"),
  v.literal("cleaning"),
  v.literal("other"),
);

const conditionValidator = v.union(
  v.literal("new"),
  v.literal("excellent"),
  v.literal("good"),
  v.literal("fair"),
);

/** Public: name + category only, no owner details. */
export const listPublicAvailable = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_removed", (q) => q.eq("removed", false))
      .collect();

    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const approvedLoans = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    const busyToolIds = new Set(
      [...activeLoans, ...approvedLoans].map((l) => l.toolId),
    );

    return tools
      .filter((t) => !busyToolIds.has(t._id))
      .map((t) => ({
        _id: t._id,
        name: t.name,
        category: t.category,
      }));
  },
});

/** Authenticated browse: full tool info + availability + trusted badge. */
export const listBrowse = query({
  args: {
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, args) => {
    // Soft gate: UI waits for ensureUser; avoid hard throw during the race.
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let tools = await ctx.db
      .query("tools")
      .withIndex("by_removed", (q) => q.eq("removed", false))
      .collect();

    if (args.category) {
      tools = tools.filter((t) => t.category === args.category);
    }

    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const approvedLoans = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    const pendingLoans = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const loanByTool = new Map<string, string>();
    for (const l of [...activeLoans, ...approvedLoans]) {
      loanByTool.set(l.toolId, l.status);
    }
    for (const l of pendingLoans) {
      if (!loanByTool.has(l.toolId)) loanByTool.set(l.toolId, "pending");
    }

    const result = [];
    for (const tool of tools) {
      const owner = await ctx.db.get(tool.ownerId);
      const status = loanByTool.get(tool._id);
      result.push({
        ...tool,
        ownerName: owner?.name ?? "Neighbor",
        ownerTrusted: owner?.trustedLender ?? false,
        availability: status
          ? status === "active"
            ? "on_loan"
            : status === "approved"
              ? "reserved"
              : "pending_request"
          : ("available" as const),
      });
    }
    return result;
  },
});

export const myListings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUserMutation(ctx);
    const name = args.name.trim();
    const description = args.description.trim();
    if (!name || name.length > 80) throw new Error("Invalid name");
    if (!description || description.length > 500)
      throw new Error("Invalid description");

    return await ctx.db.insert("tools", {
      ownerId: user._id,
      name,
      category: args.category,
      condition: args.condition,
      description,
      removed: false,
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUserMutation(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.removed) throw new Error("Tool not found");
    assertCanEditTool(user, tool);

    const name = args.name.trim();
    const description = args.description.trim();
    if (!name || name.length > 80) throw new Error("Invalid name");
    if (!description || description.length > 500)
      throw new Error("Invalid description");

    await ctx.db.patch(args.toolId, {
      name,
      category: args.category,
      condition: args.condition,
      description,
    });
  },
});

export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await requireUserMutation(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.removed) throw new Error("Tool not found");

    // Users: own only. Admins: any listing.
    if (user.role !== "admin") {
      assertCanEditTool(user, tool);
    }

    await ctx.db.patch(args.toolId, { removed: true });
  },
});

export const adminRemove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    await ctx.db.patch(args.toolId, { removed: true });
  },
});
