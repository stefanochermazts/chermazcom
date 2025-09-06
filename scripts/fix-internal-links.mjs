import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve('content')

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const res = path.resolve(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(res)
    } else if (entry.isFile() && res.endsWith('.md')) {
      yield res
    }
  }
}

function rewriteLinks(text) {
  let out = text
  // 1) Rendi relativi i link assoluti verso chermaz.com
  out = out.replace(/https?:\/\/(?:www\.)?chermaz\.com/gi, '')
  // 2) Mappa vecchi permalink data-based a /insights/slug/
  out = out.replace(/\/(20\d{2})\/(0?[1-9]|1[0-2])\/([a-z0-9\-]+)\/?/gi, (m, y, mo, slug) => `/insights/${slug}/`)
  return out
}

let changedCount = 0
for await (const file of walk(ROOT)) {
  const before = await fs.readFile(file, 'utf8')
  const after = rewriteLinks(before)
  if (after !== before) {
    await fs.writeFile(file, after)
    changedCount++
    console.log('[fix] updated', path.relative(process.cwd(), file))
  }
}
console.log(`[fix] done. files changed: ${changedCount}`)


