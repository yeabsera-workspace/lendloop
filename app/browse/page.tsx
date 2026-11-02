import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BrowseTools } from "@/components/BrowseTools";

export default async function BrowsePage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="page-shell">
      <h1 className="page-title">Browse tools</h1>
      <p className="page-lede">
        Filter by category, check availability, and request a date range.
      </p>
      <BrowseTools />
    </div>
  );
}
