import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../'),
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          // Allow requests from the Chrome extension (chrome-extension:// origin)
          // and the future web app. Authorization is enforced via Bearer JWT,
          // not by origin, so a wildcard here is safe.
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

export default nextConfig
