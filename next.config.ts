import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["enhanced-resolve", "@tailwindcss/node"],
  images: {
    remotePatterns: [
      { hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
