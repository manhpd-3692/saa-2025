import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Dev server only: lets the IPv6 loopback origin reach HMR and dev assets.
  allowedDevOrigins: ["[::1]"],
  cacheComponents: true,
  partialPrefetching: true,
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
