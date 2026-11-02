"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function SiteHeader() {
  const me = useQuery(api.users.me);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand-mark">
          LendLoop
        </Link>
        <nav className="site-nav" aria-label="Primary">
          <Show when="signed-in">
            <Link href="/browse">Browse</Link>
            <Link href="/listings">My listings</Link>
            <Link href="/requests">My requests</Link>
            <Link href="/incoming">Incoming</Link>
            {me?.role === "admin" && <Link href="/admin">Admin</Link>}
          </Show>
        </nav>
        <div className="site-header-actions">
          <Show when="signed-out">
            <Link href="/sign-in" className="btn btn-primary">
              Sign in to lend or borrow
            </Link>
          </Show>
          <Show when="signed-in">
            {me?.trustedLender && (
              <span className="badge badge-trusted" title="Trusted Lender">
                Trusted
              </span>
            )}
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
