import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/browse");

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <Suspense>
        <SignUp forceRedirectUrl="/browse" signInForceRedirectUrl="/browse" />
      </Suspense>
    </div>
  );
}
