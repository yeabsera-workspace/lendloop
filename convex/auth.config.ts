import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      // Set via: npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
