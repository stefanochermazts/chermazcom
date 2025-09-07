#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, sep, dirname } from 'node:path'

const ROOT = 'src/content'

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) yield* walk(full)
    else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdx'))) yield full
  }
}

const usageRegex = (name) => new RegExp(`<\\s*${name}\\b`)
const importRegex = (name) => new RegExp(`import\\s+${name}\\s+from\\s+['\"][^'\"]*${name}\\.astro['\"]`)

function hasUsage(text, name) {
  return usageRegex(name).test(text)
}

function hasImport(text, name) {
  return importRegex(name).test(text)
}

function computeImportPath(filePath, targetWithinSrc) {
  // filePath like src/content/insights/[...].mdx → need relative to src/<targetWithinSrc>
  const dir = dirname(filePath)
  const parts = dir.split(sep)
  const srcIdx = parts.indexOf('src')
  const afterSrc = parts.slice(srcIdx + 1)
  const ups = afterSrc.length
  const prefix = '../'.repeat(ups)
  return `${prefix}${targetWithinSrc}`
}

function insertImport(text, importLine) {
  // Insert right after frontmatter if present; else at top
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3)
    if (end !== -1) {
      const head = text.slice(0, end + 4)
      const body = text.slice(end + 4)
      return head + `\n${importLine}\n` + body
    }
  }
  return `${importLine}\n${text}`
}

function ensureBlankLineAfterImports(text) {
  // After frontmatter, ensure a blank line after the last consecutive import
  let headEnd = -1
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3)
    if (end !== -1) headEnd = end + 4
  }
  const head = headEnd !== -1 ? text.slice(0, headEnd) : ''
  const body = headEnd !== -1 ? text.slice(headEnd) : text

  const lines = body.split(/\n/)
  let i = 0
  // skip initial empty lines
  while (i < lines.length && lines[i].trim() === '') i++
  // collect import lines
  let lastImportIdx = -1
  while (i < lines.length && /^\s*import\s+/.test(lines[i])) {
    lastImportIdx = i
    i++
  }
  if (lastImportIdx !== -1) {
    // Ensure next line is blank
    if (lines[lastImportIdx + 1] !== undefined && lines[lastImportIdx + 1].trim() !== '') {
      lines.splice(lastImportIdx + 1, 0, '')
    }
  }
  const newBody = lines.join('\n')
  return head + newBody
}

function normalizeImportBlock(text) {
  // Move all import lines (not in code fences) to the top of the body (after fm)
  let headEnd = -1
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3)
    if (end !== -1) headEnd = end + 4
  }
  const head = headEnd !== -1 ? text.slice(0, headEnd) : ''
  const body = headEnd !== -1 ? text.slice(headEnd) : text

  const lines = body.split(/\n/)
  const out = []
  const imports = []
  let inCodeFence = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // toggle code fence state (``` or ~~~)
    if (/^\s*(```|~~~)/.test(line)) {
      inCodeFence = !inCodeFence
    }
    if (!inCodeFence && /^\s*import\s+/.test(line)) {
      imports.push(line)
    } else {
      out.push(line)
    }
  }
  // dedupe while preserving order
  const seen = new Set()
  const deduped = []
  for (const imp of imports) {
    if (!seen.has(imp)) {
      seen.add(imp)
      deduped.push(imp)
    }
  }
  // assemble: optional blank line between head and import block is added by join below
  const trimmedOut = out.join('\n').replace(/^\n+/, '')
  const importBlock = deduped.length ? deduped.join('\n') + '\n' : ''
  const needsBlank = importBlock && !/^\n/.test(trimmedOut)
  const newBody = importBlock + (needsBlank ? '\n' : '') + trimmedOut
  return head + newBody
}

async function processFile(file) {
  let raw = await readFile(file, 'utf8')
  let changed = false

  // BreakoutImage
  if (hasUsage(raw, 'BreakoutImage') && !hasImport(raw, 'BreakoutImage')) {
    const importPath = computeImportPath(file, 'components/BreakoutImage.astro')
    const importLine = `import BreakoutImage from '${importPath}'`
    raw = insertImport(raw, importLine)
    changed = true
    console.log(`Aggiunto import BreakoutImage: ${file}`)
  }

  // FAQSection
  if (hasUsage(raw, 'FAQSection') && !hasImport(raw, 'FAQSection')) {
    const importPathFaq = computeImportPath(file, 'components/Accordion/FAQSection.astro')
    const importLineFaq = `import FAQSection from '${importPathFaq}'`
    raw = insertImport(raw, importLineFaq)
    changed = true
    console.log(`Aggiunto import FAQSection: ${file}`)
  }

  // Ensure blank line after import block
  const movedImports = normalizeImportBlock(raw)
  const withSpacing = ensureBlankLineAfterImports(movedImports)
  if (withSpacing !== raw) {
    raw = withSpacing
    changed = true
  }

  if (changed) {
    await writeFile(file, raw, 'utf8')
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


