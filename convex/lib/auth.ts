import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

export async function getIdentityOrThrow(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      'Unauthenticated: Convex got no Clerk JWT. Need JWT template "convex".',
    );
  }
  return identity;
}

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/** Queries: must already have a users row. */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      'Unauthenticated: Convex got no Clerk JWT. Need a Clerk JWT template named "convex" (aud: "convex").',
    );
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) {
    throw new Error("User profile not found. Call users.ensureUser first.");
  }
  return user;
}

/** Mutations: create the users row on first authenticated write if missing. */
export async function requireUserMutation(
  ctx: MutationCtx,
): Promise<Doc<"users">> {
  const identity = await getIdentityOrThrow(ctx);
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (existing) return existing;

  const anyUser = await ctx.db.query("users").first();
  const id = await ctx.db.insert("users", {
    clerkId: identity.subject,
    email: identity.email ?? "",
    name: identity.name ?? identity.nickname ?? "Neighbor",
    role: anyUser ? "user" : "admin",
    trustedLender: false,
  });
  const user = await ctx.db.get(id);
  if (!user) throw new Error("Failed to create user profile");
  return user;
}

export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
  return user;
}

export function assertOwnsTool(user: Doc<"users">, tool: Doc<"tools">) {
  if (user.role === "admin") return;
  if (tool.ownerId !== user._id) {
    throw new Error("Forbidden: not the tool owner");
  }
}

export function assertLoanParticipant(user: Doc<"users">, loan: Doc<"loans">) {
  if (user.role === "admin") return;
  if (loan.borrowerId !== user._id && loan.lenderId !== user._id) {
    throw new Error("Forbidden: not a party to this loan");
  }
}

export function assertCanEditTool(user: Doc<"users">, tool: Doc<"tools">) {
  if (user.role === "admin") return;
  if (tool.ownerId !== user._id) {
    throw new Error("Forbidden: can only edit your own listings");
  }
}

export type UserId = Id<"users">;
