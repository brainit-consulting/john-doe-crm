import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  async headers() {
    return [
      {
        // Apply to all routes. The Permissions-Policy allows mic access from
        // the same origin so the browser Web Speech API works on localhost and
        // in production without being blocked by a missing policy header.
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "microphone=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
