"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { categoryLabel } from "@/lib/categories";
import { LoanActivity } from "./LoanActivity";

export function MyRequestsView() {
  const loans = useQuery(api.loans.myRequests);

  return (
    <LoanList
      empty="No borrow requests yet. Browse tools to request one."
      loans={loans}
      mode="borrower"
    />
  );
}

export function IncomingRequestsView() {
  const loans = useQuery(api.loans.incomingRequests);
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const markReturned = useMutation(api.loans.markReturned);

  return (
    <LoanList
      empty="No incoming requests on your tools."
      loans={loans}
      mode="lender"
      onApprove={(id) => void approve({ loanId: id })}
      onDecline={(id) => void decline({ loanId: id })}
      onReturned={(id) => void markReturned({ loanId: id })}
    />
  );
}

function LoanList({
  loans,
  empty,
  mode,
  onApprove,
  onDecline,
  onReturned,
}: {
  loans:
    | Array<{
        _id: Parameters<typeof LoanActivity>[0]["loanId"];
        toolName: string;
        toolCategory: string;
        startDate: string;
        endDate: string;
        status: string;
        borrowerName: string;
        lenderName: string;
        lenderTrusted: boolean;
        isOverdue: boolean;
        lastReminderAt?: number;
        reminderCount: number;
      }>
    | undefined;
  empty: string;
  mode: "borrower" | "lender";
  onApprove?: (id: Parameters<typeof LoanActivity>[0]["loanId"]) => void;
  onDecline?: (id: Parameters<typeof LoanActivity>[0]["loanId"]) => void;
  onReturned?: (id: Parameters<typeof LoanActivity>[0]["loanId"]) => void;
}) {
  if (loans === undefined) return <p className="muted">Loading…</p>;
  if (loans.length === 0) return <p className="muted">{empty}</p>;

  return (
    <ul className="loan-list">
      {loans.map((loan) => (
        <li key={loan._id} className="panel loan-card">
          <div className="loan-head">
            <h3>{loan.toolName}</h3>
            <span className={`status status-${loan.status}`}>{loan.status}</span>
          </div>
          <p className="meta">
            {categoryLabel(loan.toolCategory)} · {loan.startDate} → {loan.endDate}
          </p>
          <p className="meta">
            {mode === "borrower"
              ? `Lender: ${loan.lenderName}${loan.lenderTrusted ? " ★" : ""}`
              : `Borrower: ${loan.borrowerName}`}
          </p>
          {loan.isOverdue && <p className="error">Overdue</p>}
          {loan.lastReminderAt && (
            <p className="muted small">
              Last reminder sent{" "}
              {new Date(loan.lastReminderAt).toLocaleDateString()}
              {loan.reminderCount > 1 ? ` (${loan.reminderCount} total)` : ""}
            </p>
          )}
          <LoanActivity loanId={loan._id} />
          {mode === "lender" && (
            <div className="btn-row">
              {loan.status === "pending" && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onApprove?.(loan._id)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => onDecline?.(loan._id)}
                  >
                    Decline
                  </button>
                </>
              )}
              {(loan.status === "active" || loan.status === "approved") && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onReturned?.(loan._id)}
                >
                  Mark returned
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
