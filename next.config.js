/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Needed on Next.js 14 for src/instrumentation.ts to run (stable by default in 15+).
    instrumentationHook: true,
    // Without this, webpack bundles `ws` for instrumentation.ts and breaks its
    // native bufferutil addon ("bufferUtil.unmask is not a function").
    serverComponentsExternalPackages: ['ws', 'bufferutil', 'utf-8-validate'],
  },
}

module.exports = nextConfig
