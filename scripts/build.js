/**
 * Build de produção "à prova de cache":
 *  1. gera um NEXT_DEPLOYMENT_ID único por build (proteção contra version skew:
 *     cliente com JS antigo falando com servidor novo => navegação "hard" em vez de 404 de chunk);
 *  2. prisma generate + next build;
 *  3. copia `.next/static` e `public` para `.next/standalone` (o standalone não faz isso sozinho).
 *
 * Em CI/Docker você pode definir NEXT_DEPLOYMENT_ID (ex.: git SHA) para sobrescrever.
 */
const { spawnSync } = require('child_process')
const { syncStandaloneAssets } = require('./sync-standalone')

const isWin = process.platform === 'win32'

if (!process.env.NEXT_DEPLOYMENT_ID) {
  process.env.NEXT_DEPLOYMENT_ID = `build-${Date.now().toString(36)}`
}
console.log(`[build] NEXT_DEPLOYMENT_ID=${process.env.NEXT_DEPLOYMENT_ID}`)

function run(cmd, args) {
  const r = spawnSync(isWin ? `${cmd}.cmd` : cmd, args, {
    stdio: 'inherit',
    env: process.env,
    shell: isWin,
  })
  if (r.status !== 0) process.exit(r.status || 1)
}

run('npx', ['prisma', 'generate'])
run('npx', ['next', 'build'])

syncStandaloneAssets({ force: true, log: console.log })
