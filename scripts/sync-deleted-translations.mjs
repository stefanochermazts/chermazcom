#!/usr/bin/env node
// Scansiona i contenuti IT (file senza prefisso) di insights e case-studies
// e se trova status: deleted, aggiorna a deleted anche le traduzioni en-/sl-

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, '..')

const TARGETS = [
  'src/content/insights',
  'src/content/case-studies'
]

async function listMdx(dir) {
  const entries = await fs.readdir(path.join(ROOT, dir))
  return entries.filter((f) => (f.endsWith('.mdx') || f.endsWith('.md')) && !f.startsWith('en-') && !f.startsWith('sl-'))
}

async function load(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8')
  return matter(raw)
}

async function save(filePath, fm) {
  const out = matter.stringify(fm.content, fm.data)
  await fs.writeFile(filePath, out, 'utf-8')
}

async function updateTranslationStatus(baseDir, baseSlug) {
  const langs = ['en', 'sl']
  let updated = 0
  const dirPath = path.join(ROOT, baseDir)

  // Leggi tutti i file tradotti e trova quelli che mappano a questo baseSlug tramite frontmatter
  const files = await fs.readdir(dirPath)
  for (const lang of langs) {
    const langFiles = files.filter(f => (f.startsWith(`${lang}-`) && (f.endsWith('.mdx') || f.endsWith('.md'))))
    let matchedFile = null
    for (const f of langFiles) {
      const fp = path.join(dirPath, f)
      try {
        const fm = await load(fp)
        const srcSlug = fm.data?.sourceSlug || ''
        const srcFile = fm.data?.sourceFile || ''
        if (srcSlug === baseSlug || (typeof srcFile === 'string' && srcFile.includes(baseSlug))) {
          matchedFile = { fp, fm, f }
          break
        }
      } catch {}
    }
    if (!matchedFile) {
      console.log(`⚠️  ${lang}: nessuna traduzione trovata per slug base "${baseSlug}" in ${baseDir}`)
      continue
    }
    if (matchedFile.fm.data.status !== 'deleted') {
      matchedFile.fm.data.status = 'deleted'
      await save(matchedFile.fp, matchedFile.fm)
      console.log(`✅ ${lang}: ${baseDir}/${matchedFile.f} → status: deleted`)
      updated++
    } else {
      console.log(`ℹ️  ${lang}: ${baseDir}/${matchedFile.f} già deleted`)
    }
  }
  return updated
}

async function run() {
  let total = 0
  for (const dir of TARGETS) {
    const files = await listMdx(dir)
    for (const f of files) {
      const fp = path.join(ROOT, dir, f)
      const fm = await load(fp)
      if ((fm.data.status || 'publish') === 'deleted') {
        const baseSlug = f.replace(/\.(mdx?|MDX?)$/, '')
        const count = await updateTranslationStatus(dir, baseSlug, fm)
        total += count
      }
    }
  }
  console.log(`\n✅ Completato. Traduzioni aggiornate: ${total}`)
}

run().catch((e) => { console.error(e); process.exit(1) })


