import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve('src/content/insights')

async function* mdFiles(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) continue
    if (e.isFile() && p.endsWith('.md')) yield p
  }
}

function ensureExcerpt(md) {
  const body = md.split('\n---\n').slice(2).join('\n---\n') || md
  const text = body.replace(/<[^>]+>/g,'').replace(/\*|\#/g,'').trim()
  return text.slice(0, 160)
}

function upsertFrontMatter(content, updates) {
  const m = content.match(/^---[\s\S]*?---/)
  let fm = m ? m[0] : '---\n---'
  let rest = content.slice(fm.length)
  for (const [key, val] of Object.entries(updates)) {
    const re = new RegExp(`^${key}:.*$`, 'm')
    if (re.test(fm)) {
      fm = fm.replace(re, `${key}: ${val}`)
    } else {
      fm = fm.replace(/---\s*$/, `${key}: ${val}\n---`)
    }
  }
  return fm + rest
}

let changed = 0
for await (const file of mdFiles(ROOT)) {
  const before = await fs.readFile(file, 'utf8')
  const excerpt = ensureExcerpt(before)
  const after = upsertFrontMatter(before, { lang: 'it', excerpt: JSON.stringify(excerpt) })
  if (after !== before) {
    await fs.writeFile(file, after)
    changed++
    console.log('[normalize] updated', path.relative(process.cwd(), file))
  }
}
console.log('[normalize] done. files changed:', changed)


