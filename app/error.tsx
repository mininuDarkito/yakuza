'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    const msg = error?.message || ''
    if (msg.includes('ChunkLoadError') || msg.includes('Failed to load chunk')) {
      const key = 'chunk_reload_ts'
      const now = Date.now()
      const last = parseInt(sessionStorage.getItem(key) || '0', 10)
      if (now - last > 10000) {
        sessionStorage.setItem(key, now.toString())
        window.location.reload()
      }
    }
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border p-6 rounded-xl shadow-lg text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Atualização Detectada</h2>
        <p className="text-sm text-muted-foreground">
          O sistema foi atualizado ou ocorreu uma desconexão temporária. Recarregue para carregar as alterações.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors"
          >
            Recarregar Página
          </button>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    </div>
  )
}
