import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components / PPR omitted: Clerk auth() + Convex client pages are
  // request-time dynamic; enabling cacheComponents would require Suspense
  // boundaries around every auth gate without much benefit for this app.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
