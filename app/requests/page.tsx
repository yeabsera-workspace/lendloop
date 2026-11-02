import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MyRequestsView } from "@/components/RequestViews";

export default async function RequestsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="page-shell">
      <h1 className="page-title">My requests</h1>
      <p className="page-lede">
        Borrow requests you&apos;ve sent, plus automation activity on each loan.
      </p>
      <MyRequestsView />
    </div>
  );
}
