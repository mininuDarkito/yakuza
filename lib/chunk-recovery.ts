/**
 * Recuperação centralizada de ChunkLoadError / assets 404 (client-side).
 *
 * Usada por app/error.tsx e app/global-error.tsx. O script inline de app/layout.tsx
 * (captura erros de <script>/<link> antes do React hidratar) usa as MESMAS chaves de
 * sessionStorage, então os contadores são compartilhados e nunca causam loop infinito.
 *
 * Observação: isso só ajuda quando o servidor realmente tem os arquivos novos. Se o servidor
 * não serve /_next/static (404 real), nenhum reload resolve — veja scripts/sync-standalone.js.
 */

const ATTEMPTS_KEY = 'chunk_reload_attempts'
const TS_KEY = 'chunk_reload_ts'
const MAX_ATTEMPTS = 2
const WINDOW_MS = 30_000

export function isChunkLoadError(message: string | undefined | null): boolean {
  const msg = message || ''
  return (
    msg.includes('ChunkLoadError') ||
    msg.includes('Failed to load chunk') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    (msg.includes('Failed to fetch') && msg.includes('chunk'))
  )
}

/** Limpa Cache Storage + Service Workers e recarrega a página com cache-buster. */
export function hardReload(): void {
  if (typeof window === 'undefined') return

  try {
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n))).catch(() => {})
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {})
    }
  } catch {
    // Ignora indisponibilidade das APIs de cache
  }

  const url = new URL(window.location.href)
  url.searchParams.set('_r', Date.now().toString())
  window.location.replace(url.toString())
}

/**
 * Recarrega automaticamente no máximo MAX_ATTEMPTS vezes por janela de 30s.
 * @returns true se disparou o reload
 */
export function tryAutoReload(): boolean {
  if (typeof window === 'undefined') return false

  const now = Date.now()
  const last = parseInt(sessionStorage.getItem(TS_KEY) || '0', 10)
  const attempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0', 10)
  const current = now - last > WINDOW_MS ? 0 : attempts

  if (current >= MAX_ATTEMPTS) return false

  sessionStorage.setItem(ATTEMPTS_KEY, String(current + 1))
  sessionStorage.setItem(TS_KEY, String(now))
  hardReload()
  return true
}
