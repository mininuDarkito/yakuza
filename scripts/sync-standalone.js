/**
 * Sincroniza os assets estáticos e dependências nativas para dentro do build `standalone`.
 *
 * 1. O `server.js` gerado por `output: 'standalone'` NÃO copia `public/` nem
 *    `.next/static/`. Sem isso, todo `/_next/static/chunks/*.js|css` responde 404.
 * 2. Pacotes externos como `playwright-core` exigem arquivos não-código (`browsers.json`)
 *    que o bundler/file-tracer do Next.js não inclui no standalone. Sem eles, o servidor
 *    lança: "Cannot find module '.../playwright-core/browsers.json'".
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

function findFilesRecursive(dir, filename, results = []) {
  if (!fs.existsSync(dir)) return results
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        findFilesRecursive(fullPath, filename, results)
      } else if (entry.name === filename) {
        results.push(fullPath)
      }
    }
  } catch {}
  return results
}

function findDirsRecursive(dir, dirName, results = []) {
  if (!fs.existsSync(dir)) return results
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === dirName) {
          results.push(fullPath)
        }
        findDirsRecursive(fullPath, dirName, results)
      }
    }
  } catch {}
  return results
}

/**
 * Garante que o arquivo browsers.json do Playwright esteja presente no standalone.
 */
function syncPlaywrightAssets(log) {
  // Localiza browsers.json de origem
  const sourceCandidates = [
    path.join(ROOT, 'node_modules', 'playwright-core', 'browsers.json'),
    ...findFilesRecursive(path.join(ROOT, 'node_modules', '.pnpm'), 'browsers.json'),
  ]
  const sourceBrowsersJson = sourceCandidates.find((f) => fs.existsSync(f))

  if (!sourceBrowsersJson) {
    log('[sync-standalone] Aviso: browsers.json do playwright-core não encontrado na raiz.')
    return
  }

  // Encontra todas as pastas playwright-core em standalone
  const standaloneModules = path.join(STANDALONE, 'node_modules')
  if (!fs.existsSync(standaloneModules)) {
    fs.mkdirSync(standaloneModules, { recursive: true })
  }

  const targetDirs = findDirsRecursive(standaloneModules, 'playwright-core')

  // Se não encontrou nenhuma pasta playwright-core em standalone, cria uma direta
  if (targetDirs.length === 0) {
    const directTarget = path.join(standaloneModules, 'playwright-core')
    fs.mkdirSync(directTarget, { recursive: true })
    targetDirs.push(directTarget)
  }

  let copiedCount = 0
  for (const dir of targetDirs) {
    const dest = path.join(dir, 'browsers.json')
    try {
      fs.copyFileSync(sourceBrowsersJson, dest)
      copiedCount++
    } catch (e) {
      log(`[sync-standalone] Erro ao copiar browsers.json para ${dir}: ${e.message}`)
    }
  }

  log(`[sync-standalone] browsers.json do Playwright copiado para ${copiedCount} local(is).`)
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
  if (!upToDate) {
    replaceDir(srcStatic, destStatic)
    if (fs.existsSync(srcPublic)) replaceDir(srcPublic, destPublic)
    if (buildId) fs.writeFileSync(stamp, buildId)
    log(`[sync-standalone] assets estáticos sincronizados (build ${buildId || 'desconhecido'}).`)
  }

  // Sempre sincroniza dependências externas que o standalone pode omitir
  syncPlaywrightAssets(log)

  return true
}

module.exports = { syncStandaloneAssets }

if (require.main === module) {
  syncStandaloneAssets({ force: true, log: console.log })
}
