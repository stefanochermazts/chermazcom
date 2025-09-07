#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = 'src/content'

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) yield* walk(full)
    else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdx'))) yield full
  }
}

function fixMalformedFrontmatter(text) {
  // Fix "---import" pattern where import is attached to closing frontmatter
  const malformedPattern = /^(---\n[\s\S]*?\n)---(import\s+[^\n]+)/m
  if (malformedPattern.test(text)) {
    return text.replace(malformedPattern, '$1---\n$2')
  }
  return text
}

async function processFile(file) {
  const raw = await readFile(file, 'utf8')
  const fixed = fixMalformedFrontmatter(raw)
  if (fixed !== raw) {
    await writeFile(file, fixed, 'utf8')
    console.log(`Fixed malformed frontmatter: ${file}`)
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
  console.log(`Completato. File aggiornati: ${count}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
