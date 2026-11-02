"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES, categoryLabel, conditionLabel } from "@/lib/categories";
import { availabilityLabel } from "@/lib/format";

export function BrowseTools() {
  const [category, setCategory] = useState<string>("");
  const tools = useQuery(api.tools.listBrowse, {
    category: category
      ? (category as (typeof CATEGORIES)[number]["value"])
      : undefined,
  });
  const me = useQuery(api.users.me);
  const createRequest = useMutation(api.loans.createRequest);
  const [borrowing, setBorrowing] = useState<Id<"tools"> | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!borrowing) return;
    setBusy(true);
    setError(null);
    try {
      await createRequest({ toolId: borrowing, startDate, endDate });
      setBorrowing(null);
      setStartDate("");
      setEndDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-lg">
      <div className="filter-row">
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tools === undefined && <p className="muted">Loading…</p>}
      {tools?.length === 0 && <p className="muted">No tools match.</p>}

      <ul className="tool-grid">
        {tools?.map((tool) => {
          const isMine = me?._id === tool.ownerId;
          return (
            <li key={tool._id} className="tool-row">
              <div>
                <h3>
                  {tool.name}
                  {tool.ownerTrusted && (
                    <span className="badge badge-trusted">Trusted lender</span>
                  )}
                </h3>
                <p className="meta">
                  {categoryLabel(tool.category)} · {conditionLabel(tool.condition)} ·{" "}
                  {tool.ownerName}
                </p>
                <p className="desc">{tool.description}</p>
                <p className={`status status-${tool.availability}`}>
                  {availabilityLabel(tool.availability)}
                </p>
              </div>
              {!isMine && tool.availability === "available" && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setBorrowing(tool._id)}
                >
                  Request
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {borrowing && (
        <div className="modal-backdrop" role="presentation" onClick={() => setBorrowing(null)}>
          <form
            className="modal panel"
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSubmit}
          >
            <h3>Request to borrow</h3>
            <label>
              Start date
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label>
              End date
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={() => setBorrowing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
