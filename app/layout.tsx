import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/theme-provider' // Importação do novo Provider
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Yakuza Raw',
  description: 'Gerencie suas vendas, grupos e produtos',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Remove o parâmetro de cache _r da URL após carregar com sucesso
                try {
                  if (window.location.search.indexOf('_r=') !== -1) {
                    var cleanUrl = new URL(window.location.href);
                    cleanUrl.searchParams.delete('_r');
                    window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
                  }
                } catch(e) {}

                function forceReload() {
                  try {
                    if ('caches' in window) {
                      caches.keys().then(function(names) {
                        names.forEach(function(n) { caches.delete(n); });
                      });
                    }
                  } catch(e) {}
                  var url = new URL(window.location.href);
                  url.searchParams.set('_r', Date.now().toString());
                  window.location.replace(url.toString());
                }

                function tryReload() {
                  var key = 'chunk_reload_attempts';
                  var tsKey = 'chunk_reload_ts';
                  var now = Date.now();
                  var last = parseInt(sessionStorage.getItem(tsKey) || '0', 10);
                  var attempts = parseInt(sessionStorage.getItem(key) || '0', 10);
                  if (now - last > 30000) {
                    attempts = 0;
                  }
                  if (attempts < 2) {
                    sessionStorage.setItem(key, (attempts + 1).toString());
                    sessionStorage.setItem(tsKey, now.toString());
                    forceReload();
                  }
                }

                window.addEventListener('error', function(e) {
                  var msg = e && (e.message || '');
                  var target = e && e.target;
                  var isChunkError = (typeof msg === 'string' && (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Failed to load chunk') !== -1)) ||
                    (target && target.tagName === 'SCRIPT' && target.src && target.src.indexOf('/_next/static/') !== -1) ||
                    (target && target.tagName === 'LINK' && target.href && target.href.indexOf('/_next/static/') !== -1);
                  if (isChunkError) {
                    tryReload();
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e && e.reason;
                  var msg = (reason && (reason.message || reason.name || reason.toString())) || '';
                  if (typeof msg === 'string' && (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Failed to load chunk') !== -1)) {
                    tryReload();
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased relative min-h-screen">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  )
}
