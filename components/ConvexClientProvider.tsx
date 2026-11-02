"use client";

import { ReactNode, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = useMemo(() => {
    if (!url) return null;
    return new ConvexReactClient(url);
  }, [url]);

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <p className="max-w-md text-[var(--ink-muted)]">
          Missing <code>NEXT_PUBLIC_CONVEX_URL</code>. Copy{" "}
          <code>.env.example</code> → <code>.env.local</code> and run{" "}
          <code>npx convex dev</code>.
        </p>
      </div>
    );
  }

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
