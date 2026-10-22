// Healthcheck: a página carrega E um asset estático referenciado por ela responde 200.
// Detecta o caso "servidor no ar, mas sem /_next/static" (origem dos ChunkLoadError em massa).
const base = `http://127.0.0.1:${process.env.PORT || 3000}`

async function main() {
  const page = await fetch(`${base}/logar`)
  if (!page.ok) throw new Error(`/logar => ${page.status}`)
  const html = await page.text()
  const m = html.match(/\/_next\/static\/[^"')\s]+\.(?:js|css)[^"')\s]*/)
  if (!m) return
  const asset = await fetch(base + m[0].replace(/&amp;/g, '&'))
  if (!asset.ok) throw new Error(`${m[0]} => ${asset.status}`)
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error('[healthcheck]', e.message)
    process.exit(1)
  },
)
