#!/usr/bin/env node
// Aggiorna lo status nel frontmatter per IT/EN/SL dello stesso contenuto

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, '..')

function usage() {
  console.log('Uso: node scripts/mark-translations-status.mjs <insight|case-study> <base-slug> <status>')
  console.log('Esempi:')
  console.log('  node scripts/mark-translations-status.mjs insight sicurezza-sharepoint-guida-alla-difesa-dei-tuoi-siti deleted')
  console.log('  node scripts/mark-translations-status.mjs case-study fishtidelog deleted')
}

const type = process.argv[2]
const baseSlug = process.argv[3]
const status = process.argv[4] || 'deleted'

if (!type || !baseSlug) {
  usage()
  process.exit(1)
}

const dirMap = {
  'insight': 'src/content/insights',
  'case-study': 'src/content/case-studies'
}

const targetDir = dirMap[type]
if (!targetDir) {
  console.error('Tipo non valido. Usa "insight" o "case-study"')
  process.exit(1)
}

const locales = [
  { prefix: '', lang: 'it' },
  { prefix: 'en-', lang: 'en' },
  { prefix: 'sl-', lang: 'sl' }
]

async function updateFileIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = matter(raw)
    parsed.data.status = status
    const updated = matter.stringify(parsed.content, parsed.data)
    await fs.writeFile(filePath, updated, 'utf-8')
    console.log(`✅ Aggiornato: ${filePath}`)
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      console.log(`⚠️  Non trovato: ${filePath}`)
    } else {
      console.error(`❌ Errore su ${filePath}:`, err.message)
    }
  }
}

async function run() {
  for (const loc of locales) {
    const filename = `${loc.prefix}${baseSlug}.mdx`
    const fp = path.join(ROOT, targetDir, filename)
    await updateFileIfExists(fp)
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
