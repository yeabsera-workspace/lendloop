import { clerkMiddleware } from "@clerk/nextjs/server";

// Route protection lives in each page via `auth()` + redirect / auth.protect().
// Keep clerkMiddleware so Clerk session/auth state is available app-wide.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
