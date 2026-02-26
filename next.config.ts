import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["enhanced-resolve", "@tailwindcss/node", "@libsql/client", "@libsql/client/node", "libsql"],
  images: {
    remotePatterns: [
      { hostname: "avatars.githubusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/((?!api/mcp).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
