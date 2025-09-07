#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseDocument } from 'yaml'

const ROOT = 'src/content/insights'

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      yield* walk(full)
    } else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdx'))) {
      yield full
    }
  }
}

function extractFrontmatter(text) {
  if (!text.startsWith('---')) return { fm: null, bodyStart: 0 }
  const end = text.indexOf('\n---', 3)
  if (end === -1) return { fm: null, bodyStart: 0 }
  const fmRaw = text.slice(3, end + 1)
  const doc = parseDocument(fmRaw)
  return { fm: doc.toJSON() || {}, bodyStart: end + 4 }
}

function setTwoColSrc(content, newSrc) {
  // Cases to handle:
  // <TwoCol src="" ...>
  // <TwoCol src='' ...>
  // <TwoCol ... src={""} ...>
  // <TwoCol ...> (no src): insert src as first attribute
  let changed = false

  // Replace empty src values
  const patterns = [
    /(<TwoCol\b[^>]*\bsrc\s*=\s*")\s*("[^>]*>)/, // src=""
    /(<TwoCol\b[^>]*\bsrc\s*=\s*')\s*('[^>]*>)/, // src=''
    /(<TwoCol\b[^>]*\bsrc\s*=\s*\{\s*")\s*("\s*\}[^>]*>)/, // src={""}
  ]
  for (const re of patterns) {
    if (re.test(content)) {
      content = content.replace(re, `$1${newSrc}$2`)
      changed = true
      return { content, changed }
    }
  }

  // If no src attribute present, insert one right after component name
  const openTag = /<TwoCol\b(\s|>)/
  const m = content.match(openTag)
  if (m) {
    content = content.replace(/<TwoCol\b/, `<TwoCol src="${newSrc}"`)
    changed = true
  }
  return { content, changed }
}

async function processFile(file) {
  const raw = await readFile(file, 'utf8')
  const { fm, bodyStart } = extractFrontmatter(raw)
  if (!fm) return false
  const candidate = fm.image || fm.ogImage || fm.featuredImage
  if (!candidate || String(candidate).trim() === '') return false

  const before = raw
  const after = (() => {
    const head = raw.slice(0, bodyStart)
    const body = raw.slice(bodyStart)
    const { content, changed } = setTwoColSrc(body, String(candidate).trim())
    return { text: head + content, changed }
  })()

  if (after.changed && after.text !== before) {
    await writeFile(file, after.text, 'utf8')
    console.log(`Aggiornato: ${file}`)
    return true
  }
  return false
}

async function main() {
  let count = 0
  for await (const f of walk(ROOT)) {
    const ok = await processFile(f)
    if (ok) count++
  }
  console.log(`Completato. File modificati: ${count}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


