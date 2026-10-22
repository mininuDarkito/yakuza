/**
 * Sincroniza os assets estáticos para dentro do build `standalone`.
 *
 * O `server.js` gerado por `output: 'standalone'` NÃO copia `public/` nem
 * `.next/static/`. Sem isso, todo `/_next/static/chunks/*.js|css` responde 404
 * (ChunkLoadError / "Atualização Detectada"). Este módulo corrige isso e é
 * usado tanto pelo `postbuild` (scripts/build.js) quanto pelo `server-start.js`
 * (rede de segurança local).
 *
 * A cópia é sempre "limpa" (apaga o destino antes) para que hashes antigos
 * não se acumulem e nenhum chunk de build anterior sobreviva.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC_NEXT = path.join(ROOT, '.next')
const STANDALONE = path.join(SRC_NEXT, 'standalone')

function readBuildId(dir) {
  try {
    return fs.readFileSync(path.join(dir, 'BUILD_ID'), 'utf8').trim()
  } catch {
    return null
  }
}

function replaceDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.cpSync(src, dest, { recursive: true })
}

/**
 * @param {{ force?: boolean, log?: (m: string) => void }} [opts]
 * @returns {boolean} true se houve (re)cópia
 */
function syncStandaloneAssets(opts = {}) {
  const log = opts.log || (() => {})

  if (!fs.existsSync(path.join(STANDALONE, 'server.js'))) return false

  const srcStatic = path.join(SRC_NEXT, 'static')
  const destStatic = path.join(STANDALONE, '.next', 'static')
  const srcPublic = path.join(ROOT, 'public')
  const destPublic = path.join(STANDALONE, 'public')

  if (!fs.existsSync(srcStatic)) {
    log('[sync-standalone] .next/static não encontrado — rode `npm run build` primeiro.')
    return false
  }

  // Marca de versão: o BUILD_ID do build atual fica gravado ao lado dos assets copiados.
  const buildId = readBuildId(SRC_NEXT)
  const stamp = path.join(destStatic, '..', '.static-build-id')
  let current = null
  try {
    current = fs.readFileSync(stamp, 'utf8').trim()
  } catch {}

  const upToDate = !opts.force && fs.existsSync(destStatic) && buildId && current === buildId
  if (upToDate) return false

  replaceDir(srcStatic, destStatic)
  if (fs.existsSync(srcPublic)) replaceDir(srcPublic, destPublic)
  if (buildId) fs.writeFileSync(stamp, buildId)

  log(`[sync-standalone] assets sincronizados (build ${buildId || 'desconhecido'}).`)
  return true
}

module.exports = { syncStandaloneAssets }

if (require.main === module) {
  syncStandaloneAssets({ force: true, log: console.log })
}
