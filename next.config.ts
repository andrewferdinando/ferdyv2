import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude functions from ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
    dirs: ['src'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'opzmnjkzsmsxusgledap.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
