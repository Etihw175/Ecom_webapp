import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Admin can paste any external image URL for a product (Phase 5); local files (/products, /uploads) need no entry.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
