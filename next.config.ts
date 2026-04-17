import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Zvýšení limitu těla requestu pro AI extrakci (upload base64 dokumentů)
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
