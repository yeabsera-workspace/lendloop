"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { categoryLabel } from "@/lib/categories";

export function PublicToolList() {
  const tools = useQuery(api.tools.listPublicAvailable);

  if (tools === undefined) {
    return <p className="muted">Loading available tools…</p>;
  }

  if (tools.length === 0) {
    return (
      <p className="muted">
        No tools listed yet. Sign in to be the first lender on the block.
      </p>
    );
  }

  return (
    <ul className="tool-public-list">
      {tools.map((tool) => (
        <li key={tool._id}>
          <span className="tool-name">{tool.name}</span>
          <span className="tool-cat">{categoryLabel(tool.category)}</span>
        </li>
      ))}
    </ul>
  );
}
