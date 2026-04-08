import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable Cache Components (PPR) — Next.js 16+
  cacheComponents: true,

  // Turbopack config (top-level in Next.js 16, replaces experimental.turbopack)
  turbopack: {
    resolveAlias: {
      // lightweight-charts ships ESM — ensure Turbopack resolves correctly
      'lightweight-charts': 'lightweight-charts',
    },
  },

  // Allow images from Polygon.io (ticker logos)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.polygon.io', pathname: '/v1/reference/**' },
      { protocol: 'https', hostname: '*.polygon.io' },
    ],
  },

  // Server-side packages that must not be bundled into client chunks
  serverExternalPackages: ['@pinecone-database/pinecone'],
}

export default nextConfig
