import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude functions from ESLint during build
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src'],
  },
};

export default nextConfig;
