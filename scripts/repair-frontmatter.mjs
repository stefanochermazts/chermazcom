#!/usr/bin/env node

// Ripara il frontmatter di tutti i file MDX nella cartella src/content
// - Normalizza i delimitatori ---
// - Pulisce virgolette e apostrofi
// - Tenta di parsare il frontmatter con js-yaml
// - Se fallisce, applica fix comuni e riprova
// - Rigenera YAML valido e riscrive il file
// - Effettua un backup del file originale

import fs from 'fs/promises'
import fssync from 'fs'
import path from 'path'
import { glob } from 'glob'
import yaml from 'js-yaml'

const ROOT = process.cwd()
const CONTENT_GLOB = 'src/content/**/*.mdx'
const BACKUP_DIR = path.join('scripts', 'backups', new Date().toISOString().replace(/[:.]/g, '-'))

function ensureDirSync(dir) {
  if (!fssync.existsSync(dir)) {
    fssync.mkdirSync(dir, { recursive: true })
  }
}

function normalizeUnicode(text) {
  if (!text) return text
  return text
    // smart quotes
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    // dashes
    .replace(/[\u2013\u2014]/g, '-')
    // nbsp and other spaces
    .replace(/[\u00A0\u200B-\u200D\uFEFF\u2028\u2029]/g, ' ')
}

function findFrontmatterBlocks(raw) {
  // Rimuove BOM e spazi iniziali
  let text = raw.replace(/^\uFEFF/, '')

  // Cerca sequenze di ---; salta blocchi vuoti o senza chiavi
  let index = 0
  while (true) {
    const start = text.indexOf('---', index)
    if (start !== 0 && index === 0) {
      // Se non inizia con --- prova a tagliare eventuali righe vuote/--- isolate
      const trimmed = text.replace(/^(\s*---\s*\n)+/m, '---\n')
      if (trimmed !== text) {
        text = trimmed
        index = 0
        continue
      }
    }
    if (start === -1) return null
    // trova chiusura
    const close = text.indexOf('\n---', start + 3)
    if (close === -1) return null
    const header = text.slice(start + 3, close).trim() // tra i ---
    // deve contenere almeno una coppia chiave:valore
    if (/^[\s\S]*?:[\s\S]*$/m.test(header)) {
      const body = text.slice(close + 4) // salta "\n---"
      return { header, body, preambleLen: start, closeIdx: close }
    }
    index = close + 4
  }
}

function sanitizeHeaderLines(header) {
  const lines = header.split('\n')
  const fixed = []
  for (let line of lines) {
    let l = normalizeUnicode(line)
    // unifica indentazione liste
    l = l.replace(/^\s*-\s*$/g, '- ""')

    // Fix comuni per title/excerpt/description
    if (/^(title|excerpt|description):\s*(.*)$/.test(l)) {
      const [, key, valueRaw] = l.match(/^(title|excerpt|description):\s*(.*)$/) || []
      let v = valueRaw.trim()
      // rimuovi eventuali commenti html residui
      v = v.replace(/<!--.*?-->/g, '').trim()
      // rimuovi doppi apici finali/iniziali duplicati
      v = v.replace(/^"+/, '"').replace(/"+$/, '"')
      v = v.replace(/^'+/, "'").replace(/'+$/, "'")
      // se è single-quoted, raddoppia apostrofi interni
      if (/^'.*'$/.test(v)) {
        const inner = v.slice(1, -1).replace(/'/g, "''")
        v = `'${inner}'`
      }
      // se è double-quoted, escape i doppi apici interni
      if (/^".*"$/.test(v)) {
        const inner = v.slice(1, -1).replace(/"/g, '\\"')
        v = `"${inner}"`
      }
      // se non quotato e contiene : o # o ' o ", aggiungi doppi apici
      if (!/^['"].*['"]$/.test(v) && /[:#'"\\]/.test(v)) {
        v = `"${v.replace(/"/g, '\\"')}"`
      }
      l = `${key}: ${v}`
    }

    // normalizza liste YAML tipo - voce
    if (/^\s*-\s+[^\s].*$/.test(l)) {
      // ok
    }

    fixed.push(l)
  }
  return fixed.join('\n')
}

function objectifyHeader(header) {
  try {
    return yaml.load(header) || {}
  } catch (e) {
    return null
  }
}

function coerceTypes(data) {
  const out = { ...data }
  // Garantisce che title esista
  if (!out.title || String(out.title).trim() === '') out.title = ''
  // Coerci liste
  for (const key of ['tags', 'categories']) {
    if (out[key] && !Array.isArray(out[key])) {
      out[key] = [String(out[key])]
    }
  }
  // date: lasciare com'è se stringa; se Date convertirla in ISO yyyy-mm-dd
  if (out.date instanceof Date) {
    out.date = out.date.toISOString()
  }
  return out
}

function stringifyHeader(data) {
  // Mantieni ordine chiavi più comuni
  const ordered = {}
  const order = ['title', 'slug', 'date', 'status', 'lang', 'excerpt', 'description', 'categories', 'tags', 'image', 'ogImage', 'kpi', 'sector']
  for (const key of order) if (key in data) ordered[key] = data[key]
  for (const key of Object.keys(data)) if (!(key in ordered)) ordered[key] = data[key]

  // Imposta valori vuoti sensati come stringhe vuote, non null/undefined
  for (const [k, v] of Object.entries(ordered)) {
    if (v === undefined || v === null) ordered[k] = ''
  }

  const dumped = yaml.dump(ordered, { lineWidth: 120, noRefs: true })
  return dumped.endsWith('\n') ? dumped : dumped + '\n'
}

async function backupFile(absPath) {
  const rel = path.relative(ROOT, absPath)
  const dest = path.join(BACKUP_DIR, rel)
  ensureDirSync(path.dirname(dest))
  await fs.copyFile(absPath, dest)
}

async function repairFile(file) {
  const abs = path.resolve(file)
  const raw = await fs.readFile(abs, 'utf-8')

  const fm = findFrontmatterBlocks(raw)
  if (!fm) {
    // File senza frontmatter valido: crea frontmatter minimale con title dal filename/H1
    const base = path.basename(file, '.mdx')
    const h1Match = raw.match(/^#\s+(.+)$/m)
    const inferredTitle = h1Match ? h1Match[1].trim() : base.replace(/[-_]+/g, ' ')
    const headerObj = coerceTypes({ title: inferredTitle })
    const newHeader = stringifyHeader(headerObj)
    const rebuilt = `---\n${newHeader}---\n\n${raw}`
    await backupFile(abs)
    await fs.writeFile(abs, rebuilt, 'utf-8')
    return { status: 'created', reason: 'no-valid-frontmatter' }
  }

  let header = fm.header
  header = normalizeUnicode(header)
  header = sanitizeHeaderLines(header)

  // Tentativo 1: parse diretto
  let data = objectifyHeader(header)

  // Tentativo 2: fix quote/apostrofi e riprova
  if (!data) {
    let fixed = header
    // chiudi doppi apici non chiusi a fine linea
    fixed = fixed.replace(/:(\s*)"([^"\n]*)$/gm, (m, sp, val) => `:${sp}"${val}\"`)
    // chiudi apici singoli non chiusi a fine linea
    fixed = fixed.replace(/:(\s*)'([^'\n]*)$/gm, (m, sp, val) => `:${sp}'${val}''`)
    // raddoppia apostrofi interni per single-quoted
    fixed = fixed.replace(/:\s*'([^']*)'/g, (m, inner) => `: '${inner.replace(/'/g, "''")}'`)
    data = objectifyHeader(fixed)
    header = fixed
  }

  // Tentativo 3: forza quotatura di tutti i valori scalari
  if (!data) {
    const forced = header.replace(/^(\s*)([A-Za-z0-9_]+):\s*(.+)$/gm, (m, ind, key, val) => {
      // lascia intatte liste/oggetti multilinea
      if (val.trim().startsWith('-') || val.trim().startsWith('>') || val.trim().startsWith('|')) return m
      const v = val.trim()
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) return `${ind}${key}: "${v}"`
      if (/^\[.*\]$/.test(v)) return `${ind}${key}: ${v}`
      return `${ind}${key}: "${v.replace(/"/g, '\\"')}"`
    })
    data = objectifyHeader(forced)
    header = forced
  }

  if (!data) {
    // Ultima spiaggia: genera un header minimale conservando alcune chiavi basilari tramite regex
    const base = path.basename(file, '.mdx')
    const h1Match = fm.body.match(/^#\s+(.+)$/m)
    const inferredTitle = h1Match ? h1Match[1].trim() : base.replace(/[-_]+/g, ' ')
    const minimal = coerceTypes({ title: inferredTitle })
    const newHeader = stringifyHeader(minimal)
    const rebuilt = `---\n${newHeader}---\n\n${fm.body}`
    await backupFile(abs)
    await fs.writeFile(abs, rebuilt, 'utf-8')
    return { status: 'replaced-minimal', reason: 'unparsable' }
  }

  const coerced = coerceTypes(data)
  // Assicurati che title non sia vuoto
  if (!coerced.title || String(coerced.title).trim() === '') {
    const base = path.basename(file, '.mdx')
    const h1Match = fm.body.match(/^#\s+(.+)$/m)
    coerced.title = h1Match ? h1Match[1].trim() : base.replace(/[-_]+/g, ' ')
  }

  const newHeader = stringifyHeader(coerced)
  const rebuilt = `---\n${newHeader}---\n\n${fm.body.replace(/^\s+/, '')}`

  if (rebuilt !== raw) {
    await backupFile(abs)
    await fs.writeFile(abs, rebuilt, 'utf-8')
    return { status: 'repaired' }
  }
  return { status: 'unchanged' }
}

async function main() {
  console.log('🔧 Repairing MDX frontmatter...')
  ensureDirSync(BACKUP_DIR)
  const files = await glob(CONTENT_GLOB)
  let repaired = 0, created = 0, minimal = 0, unchanged = 0
  for (const file of files) {
    try {
      const res = await repairFile(file)
      if (res.status === 'repaired') { repaired++; console.log(`✅ Repaired: ${file}`) }
      else if (res.status === 'created') { created++; console.log(`🆕 Created FM: ${file}`) }
      else if (res.status === 'replaced-minimal') { minimal++; console.log(`⚠️ Minimal FM: ${file}`) }
      else { unchanged++ }
    } catch (e) {
      console.error(`❌ Error: ${file}: ${e.message}`)
    }
  }
  console.log(`\n📊 Done. Repaired: ${repaired}, Minimal: ${minimal}, Created: ${created}, Unchanged: ${unchanged}`)
  console.log(`🗃️  Backups in: ${BACKUP_DIR}`)
}

main().catch(err => { console.error(err); process.exit(1) })
