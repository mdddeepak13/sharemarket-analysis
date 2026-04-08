import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // cacheComponents (PPR) disabled until Phase 5 — Base UI TooltipProvider is not PPR-compatible
  // Re-enable after migrating providers to PPR-safe boundaries

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
