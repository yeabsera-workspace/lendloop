"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { categoryLabel } from "@/lib/categories";

export function AdminPanel() {
  const me = useQuery(api.users.me);
  const users = useQuery(api.users.listUsers);
  const loans = useQuery(api.loans.adminAllLoans);
  const tools = useQuery(api.tools.listBrowse, {});
  const setTrusted = useMutation(api.users.setTrustedLender);
  const removeTool = useMutation(api.tools.adminRemove);

  if (me === undefined) return <p className="muted">Loading…</p>;
  if (!me || me.role !== "admin") {
    return <p className="error">Admin access required.</p>;
  }

  return (
    <div className="stack-lg">
      <section className="panel">
        <h3>Users</h3>
        <ul className="admin-list">
          {users?.map((u) => (
            <li key={u._id}>
              <div>
                <strong>{u.name}</strong>
                <span className="muted">
                  {" "}
                  · {u.email} · {u.role}
                  {u.trustedLender ? " · Trusted" : ""}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  void setTrusted({
                    userId: u._id,
                    trusted: !u.trustedLender,
                  })
                }
              >
                {u.trustedLender ? "Revoke trusted" : "Mark trusted"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h3>All listings</h3>
        <ul className="admin-list">
          {tools?.map((t) => (
            <li key={t._id}>
              <div>
                <strong>{t.name}</strong>
                <span className="muted">
                  {" "}
                  · {categoryLabel(t.category)} · {t.ownerName}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void removeTool({ toolId: t._id })}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h3>All loans</h3>
        <ul className="admin-list">
          {loans?.map((l) => (
            <li key={l._id}>
              <div>
                <strong>{l.toolName}</strong>
                <span className="muted">
                  {" "}
                  · {l.status} · {l.borrowerName} ← {l.lenderName} ·{" "}
                  {l.startDate} → {l.endDate}
                  {l.isOverdue ? " · OVERDUE" : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
