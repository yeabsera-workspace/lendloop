import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { IncomingRequestsView } from "@/components/RequestViews";

export default async function IncomingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="page-shell">
      <h1 className="page-title">Incoming requests</h1>
      <p className="page-lede">
        Approve, decline, or mark loans returned on tools you own.
      </p>
      <IncomingRequestsView />
    </div>
  );
}
