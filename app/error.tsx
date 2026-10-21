'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, AlertTriangle, Home } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isReloading, setIsReloading] = useState(false)
  const msg = error?.message || ''
  const isChunkError =
    msg.includes('ChunkLoadError') ||
    msg.includes('Failed to load chunk') ||
    msg.includes('Loading chunk') ||
    (msg.includes('Failed to fetch') && msg.includes('chunk'))

  const forceHardReload = () => {
    setIsReloading(true)
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name))
        }).catch(() => {})
      }
    } catch {
      // Ignora erro de API de cache
    }

    // Força recarregamento quebrando o cache via query param
    const url = new URL(window.location.href)
    url.searchParams.set('_r', Date.now().toString())
    window.location.replace(url.toString())
  }

  useEffect(() => {
    console.error('[Yakuza Error Boundary]:', error)

    if (isChunkError) {
      const key = 'chunk_reload_attempts'
      const tsKey = 'chunk_reload_ts'
      const now = Date.now()
      const last = parseInt(sessionStorage.getItem(tsKey) || '0', 10)
      const attempts = parseInt(sessionStorage.getItem(key) || '0', 10)

      // Se passou mais de 30 segundos da última tentativa, reseta o contador
      const currentAttempts = now - last > 30000 ? 0 : attempts

      if (currentAttempts < 2) {
        sessionStorage.setItem(key, (currentAttempts + 1).toString())
        sessionStorage.setItem(tsKey, now.toString())
        forceHardReload()
      }
    }
  }, [error, isChunkError])

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-950/90 border border-white/10 p-6 sm:p-8 rounded-2xl shadow-2xl text-center space-y-5 backdrop-blur-xl">
        <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20 text-purple-400">
          {isChunkError ? (
            <RefreshCw className={`w-6 h-6 ${isReloading ? 'animate-spin' : ''}`} />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isChunkError ? 'Atualização Detectada' : 'Ops! Ocorreu um Erro'}
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {isChunkError
              ? 'Uma nova versão do sistema foi publicada ou arquivos de cache expiraram. Recarregue para obter os arquivos atualizados.'
              : 'Ocorreu uma falha inesperada ao carregar esta página. Você pode tentar novamente ou voltar ao início.'}
          </p>
        </div>

        {/* Detalhes para debug quando não for chunk error */}
        {!isChunkError && error?.message && (
          <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-lg text-left overflow-x-auto">
            <p className="text-xs font-mono text-red-300 break-words line-clamp-3">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={forceHardReload}
            disabled={isReloading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-purple-600/30 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
            {isReloading ? 'Atualizando...' : 'Recarregar sem Cache'}
          </button>

          {!isChunkError ? (
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Tentar Novamente
            </button>
          ) : (
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-sm font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              Início
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

