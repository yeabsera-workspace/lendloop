import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MyListings } from "@/components/MyListings";

export default async function ListingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="page-shell">
      <h1 className="page-title">My listings</h1>
      <p className="page-lede">
        Publish tools you&apos;re willing to lend. Edit or delete only your own.
      </p>
      <MyListings />
    </div>
  );
}
