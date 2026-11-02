import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect("/browse");

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <Suspense>
        <SignIn forceRedirectUrl="/browse" signUpForceRedirectUrl="/browse" />
      </Suspense>
    </div>
  );
}
