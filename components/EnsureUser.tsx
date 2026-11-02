"use client";

import { ReactNode, useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Ensures a Convex `users` row exists for the Clerk session before
 * authenticated app queries run (avoids requireUser races).
 */
export function EnsureUser({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (me) return;
    let cancelled = false;
    void ensureUser()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to sync profile");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, me, ensureUser]);

  if (isLoading) {
    return <p className="page-shell muted">Loading auth…</p>;
  }

  if (isAuthenticated && !me) {
    return (
      <p className="page-shell muted">
        {error ? `Profile sync failed: ${error}` : "Setting up your LendLoop profile…"}
      </p>
    );
  }

  return <>{children}</>;
}
