import fs from 'node:fs/promises'
import path from 'node:path'

const SITE = process.env.SITE || 'https://www.chermaz.com'
const OUT_FILE = path.resolve('public/sitemap.xml')
const langs = ['it','en','sl']

function url(loc) {
  return `<url><loc>${loc}</loc></url>`
}

async function main() {
  const urls = new Set()
  // Home per lingua
  for (const l of langs) urls.add(`${SITE}/${l}/`)
  // Pagine statiche principali (aggiungi se necessario)
  const staticPaths = ['about','services','insights','case-studies','contact','privacy']
  for (const l of langs) {
    for (const p of staticPaths) urls.add(`${SITE}/${l}/${p}/`)
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n`+
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+
  `${[...urls].map(url).join('\n')}\n`+
  `</urlset>`
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true })
  await fs.writeFile(OUT_FILE, xml)
  console.log(`[sitemap] wrote ${OUT_FILE} with ${urls.size} urls`)
}

main()


