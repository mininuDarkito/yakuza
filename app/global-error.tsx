'use client'

import { useEffect } from 'react'
import { hardReload, isChunkLoadError, tryAutoReload } from '@/lib/chunk-recovery'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (isChunkLoadError(error?.message)) tryAutoReload()
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-semibold">Atualização do Sistema</h2>
          <p className="text-sm text-neutral-400">
            Uma nova versão da plataforma foi carregada. Recarregue a página para continuar navegando normalmente.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => hardReload()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Recarregar Página
            </button>
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
