process.env.TZ = 'America/Sao_Paulo';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // experimental option removed as instrumentation is enabled by default in Next.js 16
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
}

export default nextConfig
