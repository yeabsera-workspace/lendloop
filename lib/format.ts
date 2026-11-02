import { formatDistanceToNow } from "date-fns";

export function relativeTime(ts: number): string {
  return formatDistanceToNow(ts, { addSuffix: true });
}

export function availabilityLabel(status: string): string {
  switch (status) {
    case "available":
      return "Available";
    case "on_loan":
      return "On loan";
    case "reserved":
      return "Reserved";
    case "pending_request":
      return "Pending request";
    default:
      return status;
  }
}
