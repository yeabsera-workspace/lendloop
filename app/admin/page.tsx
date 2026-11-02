import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="page-shell">
      <h1 className="page-title">Admin</h1>
      <p className="page-lede">
        Remove any listing, view all loans, and mark trusted lenders. Enforced
        in Convex — UI alone is not enough.
      </p>
      <AdminPanel />
    </div>
  );
}
