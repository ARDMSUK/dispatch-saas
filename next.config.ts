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
  }
} as any;

export default nextConfig;
