import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@bipi/shared', '@bipi/db', '@bipi/agent-core'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/agent-avatars/**',
      },
    ],
  },
}

export default nextConfig
