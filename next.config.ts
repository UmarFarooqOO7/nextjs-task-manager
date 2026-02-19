import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["enhanced-resolve", "@tailwindcss/node", "better-sqlite3"],
};

export default nextConfig;
