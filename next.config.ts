import type { NextConfig } from "next";

/**
 * Kudo images are Go-signed read URLs of the private `kudo-images` bucket
 * (F006 INT-001, opaque keys per Codex R01). Only that path of the project's
 * Supabase Storage may be used as an image source. Components render them
 * `unoptimized`: the URLs are short-lived and per viewer, so the optimizer
 * must not cache them (and the local Storage host is a loopback IP).
 */
function kudoImagePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabase || !URL.canParse(supabase)) return []; // a malformed value must not break config loading
  const { protocol, hostname, port } = new URL(supabase);
  return [
    {
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
      port,
      pathname: "/storage/v1/object/sign/kudo-images/**",
    },
  ];
}

const nextConfig: NextConfig = {
  /* config options here */
  // Dev server only: lets the IPv6 loopback origin reach HMR and dev assets.
  allowedDevOrigins: ["[::1]"],
  images: { remotePatterns: kudoImagePatterns() },
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
