"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { relativeTime } from "@/lib/format";

function friendlyMessage(type: string, message: string): string {
  if (type === "overdue_reminder") {
    // Prefer short bonus-style copy when message is our write-back text
    if (message.startsWith("Reminder sent")) return message;
    return `Reminder sent — ${message}`;
  }
  if (type === "request_notification") {
    return message.includes("failed")
      ? message
      : "Borrow request notification sent";
  }
  if (type === "status_notification") {
    return message.includes("failed")
      ? message
      : "Loan status notification sent";
  }
  return message;
}

export function LoanActivity({ loanId }: { loanId: Id<"loans"> }) {
  const activity = useQuery(api.loans.getActivity, { loanId });

  if (!activity || activity.length === 0) return null;

  const sorted = [...activity].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="activity-block">
      <p className="activity-heading">Automation</p>
      <ul className="activity-list">
        {sorted.slice(0, 4).map((item) => (
          <li key={item._id}>
            <span className="activity-msg">
              {friendlyMessage(item.type, item.message)}
            </span>
            <time dateTime={new Date(item.createdAt).toISOString()}>
              {relativeTime(item.createdAt)}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
