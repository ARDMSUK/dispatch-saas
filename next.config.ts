import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    outputFileTracingExcludes: {
      '/api/**/*': [
        'node_modules/@swc/core',
        'node_modules/typescript',
        'node_modules/prettier',
        'node_modules/@types',
        'node_modules/leaflet'
      ]
    }
  },
  async headers() {
    return [
      {
        // Allow CORS for the external widget API
        source: "/api/widget/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key" },
        ]
      }
    ];
  }
} as any;

export default nextConfig;
