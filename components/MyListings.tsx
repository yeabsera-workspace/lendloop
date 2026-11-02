"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  CATEGORIES,
  CONDITIONS,
  categoryLabel,
  conditionLabel,
} from "@/lib/categories";

type FormState = {
  name: string;
  category: (typeof CATEGORIES)[number]["value"];
  condition: (typeof CONDITIONS)[number]["value"];
  description: string;
};

const empty: FormState = {
  name: "",
  category: "power_tools",
  condition: "good",
  description: "",
};

export function MyListings() {
  const listings = useQuery(api.tools.myListings);
  const create = useMutation(api.tools.create);
  const update = useMutation(api.tools.update);
  const remove = useMutation(api.tools.remove);
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<Id<"tools"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await update({ toolId: editing, ...form });
      } else {
        await create(form);
      }
      setForm(empty);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-lg">
      <form className="panel form-grid" onSubmit={onSubmit}>
        <h3>{editing ? "Edit listing" : "List a tool"}</h3>
        <label>
          Name
          <input
            required
            maxLength={80}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          Category
          <select
            value={form.category}
            onChange={(e) =>
              setForm({
                ...form,
                category: e.target.value as FormState["category"],
              })
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Condition
          <select
            value={form.condition}
            onChange={(e) =>
              setForm({
                ...form,
                condition: e.target.value as FormState["condition"],
              })
            }
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="full">
          Short description
          <textarea
            required
            maxLength={500}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        {error && <p className="error full">{error}</p>}
        <div className="btn-row full">
          {editing && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditing(null);
                setForm(empty);
              }}
            >
              Cancel edit
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : editing ? "Update" : "Publish listing"}
          </button>
        </div>
      </form>

      <ul className="tool-grid">
        {listings === undefined && <li className="muted">Loading…</li>}
        {listings?.length === 0 && (
          <li className="muted">You have not listed any tools yet.</li>
        )}
        {listings?.map((tool) => (
          <li key={tool._id} className="tool-row">
            <div>
              <h3>
                {tool.name}
                {tool.removed && <span className="badge">Removed</span>}
              </h3>
              <p className="meta">
                {categoryLabel(tool.category)} · {conditionLabel(tool.condition)}
              </p>
              <p className="desc">{tool.description}</p>
            </div>
            {!tool.removed && (
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditing(tool._id);
                    setForm({
                      name: tool.name,
                      category: tool.category,
                      condition: tool.condition,
                      description: tool.description,
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => void remove({ toolId: tool._id })}
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
