#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = 'src/content/insights'

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) yield* walk(full)
    else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdx'))) yield full
  }
}

function replaceTwoColWithBreakout(text) {
  // Replace only the FIRST <TwoCol ...>...</TwoCol> block with <BreakoutImage src="..." alt="..." />
  // We assume a simple opening tag with attributes on one line and a closing tag `</TwoCol>`.
  const openTagRe = /<TwoCol\b[^>]*>/
  const m = text.match(openTagRe)
  if (!m) return { text, changed: false }
  const start = m.index
  const afterOpen = start + m[0].length
  const closeIdx = text.indexOf('</TwoCol>', afterOpen)
  if (closeIdx === -1) return { text, changed: false }

  const openTag = m[0]
  const srcMatch = openTag.match(/src\s*=\s*"([^"]*)"|src\s*=\s*'([^']*)'|src\s*=\s*\{\s*"([^"]*)"\s*\}/)
  const altMatch = openTag.match(/alt\s*=\s*"([^"]*)"|alt\s*=\s*'([^']*)'/)
  const src = (srcMatch && (srcMatch[1] || srcMatch[2] || srcMatch[3])) || ''
  const alt = (altMatch && (altMatch[1] || altMatch[2])) || ''

  const before = text.slice(0, start)
  const after = text.slice(closeIdx + '</TwoCol>'.length)
  const replacement = `\nimport BreakoutImage from '../../components/BreakoutImage.astro'\n\n<BreakoutImage src="${src}" alt="${alt}" />\n\n`
  // Ensure single import presence: if file already has import BreakoutImage, skip duplicate import
  let headEnd = text.indexOf('\n---', 3)
  if (headEnd !== -1) headEnd = headEnd + 4
  const head = headEnd !== -1 ? text.slice(0, headEnd) : ''
  const body = headEnd !== -1 ? text.slice(headEnd) : text
  const alreadyImported = /import\s+BreakoutImage\s+from\s+['"][^'"]*BreakoutImage\.astro['"]/.test(body)
  const heroBlock = alreadyImported ? `\n<BreakoutImage src="${src}" alt="${alt}" />\n\n` : replacement

  const newBody = body.replace(openTagRe, heroBlock).replace(/[\s\S]*?(<BreakoutImage[\s\S]*?>)/, '$1')
  const newText = head + newBody.replace('</TwoCol>', '')
  return { text: newText, changed: true }
}

async function processFile(file) {
  const raw = await readFile(file, 'utf8')
  const { text, changed } = replaceTwoColWithBreakout(raw)
  if (changed && text !== raw) {
    await writeFile(file, text, 'utf8')
    console.log(`Convertito hero immagine: ${file}`)
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
  console.log(`Completato. File convertiti: ${count}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


