import fs from 'node:fs/promises'
import path from 'node:path'

const CONTENT_DIR = path.resolve('src/content/insights')
const REDIRECTS_FILE = path.resolve('_redirects')
const START = '# BEGIN AUTO WP REDIRECTS\n'
const END = '# END AUTO WP REDIRECTS\n'

async function listMarkdown(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => path.join(dir, e.name))
}

function parseFrontMatter(text) {
  const m = text.match(/^---[\s\S]*?---/)
  if (!m) return {}
  const lines = m[0].replace(/^---|---$/g, '').split(/\r?\n/)
  const fm = {}
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim().replace(/^"|"$/g, '')
    fm[key] = val
  }
  return fm
}

function makeRedirects({ date, slug }) {
  if (!slug) return []
  const y = date?.slice(0, 4)
  const m = date?.slice(5, 7)
  const dest = `/it/insights/${slug}/ 301`
  const lines = []
  if (y && m) {
    lines.push(`/${y}/${m}/${slug}/       ${dest}`)
    lines.push(`/${y}/${m}/${slug}        ${dest}`)
  }
  // fallback common legacy paths
  lines.push(`/blog/${slug}/             ${dest}`)
  lines.push(`/blog/${slug}              ${dest}`)
  return lines
}

async function buildRedirectBlock() {
  const files = await listMarkdown(CONTENT_DIR)
  const allLines = new Set()
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8')
    const fm = parseFrontMatter(text)
    const lines = makeRedirects({ date: fm.date, slug: fm.slug || path.basename(file, '.md') })
    for (const line of lines) allLines.add(line)
  }
  const sorted = Array.from(allLines).sort()
  return START + sorted.join('\n') + '\n' + END
}

async function upsertRedirects() {
  const block = await buildRedirectBlock()
  let current = ''
  try { current = await fs.readFile(REDIRECTS_FILE, 'utf8') } catch {}
  if (!current) {
    await fs.writeFile(REDIRECTS_FILE, block)
    console.log('[redirects] created _redirects with auto section')
    return
  }
  const startIdx = current.indexOf(START)
  const endIdx = current.indexOf(END)
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = current.slice(0, startIdx)
    const after = current.slice(endIdx + END.length)
    current = before + block + after
  } else {
    current = current.trimEnd() + '\n' + block
  }
  await fs.writeFile(REDIRECTS_FILE, current)
  console.log('[redirects] updated _redirects auto section')
}

await upsertRedirects()


