import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@bipi/shared', '@bipi/db', '@bipi/agent-core'],
}

export default nextConfig
