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

function hasBreakoutUsage(text) {
  return /<\s*BreakoutImage\b/.test(text)
}

function hasBreakoutImport(text) {
  return /import\s+BreakoutImage\s+from\s+['"][^'"]*BreakoutImage\.astro['"]/.test(text)
}

function addBreakoutImport(text) {
  if (!text.startsWith('---')) return text
  const end = text.indexOf('\n---', 3)
  if (end === -1) return text
  const head = text.slice(0, end + 4)
  const body = text.slice(end + 4)
  const importLine = `import BreakoutImage from '../../components/BreakoutImage.astro'`
  return head + `\n${importLine}\n` + body
}

async function processFile(file) {
  const raw = await readFile(file, 'utf8')
  if (!hasBreakoutUsage(raw)) return false
  if (hasBreakoutImport(raw)) return false
  const fixed = addBreakoutImport(raw)
  if (fixed !== raw) {
    await writeFile(file, fixed, 'utf8')
    console.log(`Force-fixed BreakoutImage import: ${file}`)
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
  console.log(`Force-fix completato. File aggiornati: ${count}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
