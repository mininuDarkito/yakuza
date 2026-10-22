process.env.TZ = 'America/Sao_Paulo';

/**
 * Cache-Control das páginas HTML / RSC / API.
 * HTML nunca pode ser cacheado: ele referencia chunks com hash do build.
 * Um HTML antigo (navegador, proxy, CDN) apontando para chunks de um deploy anterior
 * é a causa do ChunkLoadError / 404 em /_next/static/chunks/*.
 * Os assets em /_next/static continuam `immutable` (o Next controla isso).
 */
const NO_STORE = 'no-store, no-cache, must-revalidate, max-age=0'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Pacotes externos que possuem binários ou arquivos não-JS (ex: browsers.json no Playwright)
  // Devem ser mantidos como pacotes externos e não empacotados pelo bundler
  serverExternalPackages: ['playwright', 'playwright-core'],
  // Identifica o deploy: o Next anexa ?dpl=<id> nos assets e, se cliente e servidor
  // forem de versões diferentes, força navegação "hard" em vez de quebrar com chunk 404.
  // Gerado por scripts/build.js (ou defina NEXT_DEPLOYMENT_ID no CI/Docker).
  ...(process.env.NEXT_DEPLOYMENT_ID ? { deploymentId: process.env.NEXT_DEPLOYMENT_ID } : {}),
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
  async headers() {
    return [
      {
        // Tudo, exceto assets versionados (/_next/static, /_next/image) e arquivos com extensão (public/*)
        source: '/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)',
        headers: [
          { key: 'Cache-Control', value: NO_STORE },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Cloudflare-CDN-Cache-Control', value: 'no-store' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default nextConfig
