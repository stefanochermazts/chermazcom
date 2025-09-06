#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

let YAML
try {
  YAML = (await import('yaml')).default
} catch (err) {
  console.error('Errore: il pacchetto "yaml" non è installato. Esegui: npm i -D yaml')
  process.exit(1)
}

const ROOT = process.cwd()
const INSIGHTS_DIR = path.join(ROOT, 'src', 'content', 'insights')

const categoryKeywords = [
  { cat: 'sudoku', patterns: [/\bsudoku\b/i, /\bcandidati\b/i, /\bgriglia\b/i] },
  { cat: 'sharepoint', patterns: [/\bsharepoint\b/i, /\bspfx\b/i, /\bliste?\b/i, /\bintranet\b/i] },
  { cat: 'office365', patterns: [/office\s*365/i, /microsoft\s*365/i, /\bteams\b/i, /\bword\b/i, /\bviva\s*engage\b/i, /\bcopilot\b/i] },
  { cat: 'chatbot', patterns: [/\bchatbot\b/i, /\bchatgpt\b/i, /\bclaude\b/i, /\bRAG\b/i, /\bdialogflow\b/i, /intelligenza\s+artificiale/i] },
  { cat: 'wordpress', patterns: [/\bwordpress\b/i, /\bwp\s*rocket\b/i] },
]

const tagByCategory = {
  sudoku: ['sudoku', 'strategie', 'logica', 'tecniche', 'puzzle'],
  sharepoint: ['sharepoint', 'liste', 'intranet', 'microsoft 365', 'sicurezza'],
  office365: ['microsoft 365', 'office 365', 'copilot', 'word', 'teams'],
  chatbot: ['chatbot', 'ai', 'chatgpt', 'dialogflow', 'rag'],
  wordpress: ['wordpress', 'wp rocket', 'performance', 'ottimizzazione'],
}

async function readAllMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      files.push(...(await readAllMarkdownFiles(full)))
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

function extractFrontmatters(raw) {
  // Estrae tutti i blocchi frontmatter iniziali `--- ... ---`
  const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*/g
  let match
  const blocks = []
  let lastIndex = 0
  while ((match = fmRegex.exec(raw)) && match.index === lastIndex) {
    blocks.push(match[1])
    lastIndex = fmRegex.lastIndex
  }
  const body = raw.slice(lastIndex)
  return { blocks, body }
}

function mergeFrontmatterYAML(blocks) {
  const merged = {}
  for (const b of blocks) {
    try {
      const obj = YAML.parse(b) || {}
      Object.assign(merged, obj)
    } catch (e) {
      // ignora blocchi YAML malformati
    }
  }
  return merged
}

function chooseCategory(text) {
  for (const { cat, patterns } of categoryKeywords) {
    if (patterns.some((re) => re.test(text))) return cat
  }
  return null
}

function buildTags(cat, existing = [], text = '') {
  const base = Array.isArray(existing) ? existing.map(String) : []
  const suggest = tagByCategory[cat] ?? []
  const fromText = []
  if (/\bcopilot\b/i.test(text) && !suggest.includes('copilot')) fromText.push('copilot')
  if (/\bsharepoint\b/i.test(text) && !suggest.includes('sharepoint')) fromText.push('sharepoint')
  if (/\bwordpress\b/i.test(text) && !suggest.includes('wordpress')) fromText.push('wordpress')
  if (/\bsudoku\b/i.test(text) && !suggest.includes('sudoku')) fromText.push('sudoku')
  if (/\bchatgpt\b/i.test(text) && !suggest.includes('chatgpt')) fromText.push('chatgpt')
  const all = [...base, ...suggest, ...fromText]
  // normalizza, rimuove duplicati, limita a 5
  const uniq = Array.from(new Set(all.map((t) => String(t).trim()).filter(Boolean)))
  return uniq.slice(0, 5)
}

async function processFile(file) {
  const raw = await fs.readFile(file, 'utf8')
  const { blocks, body } = extractFrontmatters(raw)
  let fm = mergeFrontmatterYAML(blocks)

  // testo per il matching categorie
  const title = String(fm.title ?? '')
  const excerpt = String(fm.excerpt ?? '')
  const textForCategory = `${title}\n${excerpt}\n${body}`
  const category = chooseCategory(textForCategory)
  if (category) {
    fm.categories = [category]
  }

  // normalizza tags
  fm.tags = buildTags(category, fm.tags, textForCategory)

  // assicurati di mantenere campi comuni
  const ordered = {}
  for (const k of ['title', 'slug', 'date', 'status', 'excerpt', 'categories', 'tags', 'lang']) {
    if (fm[k] !== undefined) ordered[k] = fm[k]
  }
  // aggiungi eventuali altri campi rimasti
  for (const [k, v] of Object.entries(fm)) {
    if (!(k in ordered)) ordered[k] = v
  }

  const newFrontmatter = `---\n${YAML.stringify(ordered)}---\n\n`
  // Normalizza eventuali sequenze letterali "\n" all'inizio
  let cleanedBody = body.replace(/^\\n+/, '')

  // Rimuovi eventuale blocco YAML "fantasma" nel body: righe di chiavi YAML seguite da una riga '---'
  {
    const lines = cleanedBody.split('\n')
    let i = 0
    const keyLine = /^(?:\s*"?)\s*(title|slug|date|status|excerpt|categories|tags|lang)\s*:/i
    // salta eventuali righe vuote o letterali "\\n"
    while (i < lines.length && (/^\s*$/.test(lines[i]) || /^\\n\s*$/.test(lines[i]))) i++
    let j = i
    let sawKey = false
    while (j < lines.length && keyLine.test(lines[j])) { sawKey = true; j++ }
    if (sawKey && j < lines.length && /^---\s*$/.test(lines[j])) {
      cleanedBody = lines.slice(j + 1).join('\n')
    }
  }
  // Rimuovi righe TOC anomale all'inizio del contenuto: &nbsp;, "Table of Contents", "Toggle..."
  const leadingNbsp = /^(?:\s|\\n)*&nbsp;\s*\n/i
  const leadingToc = /^(?:\s|\\n)*Table of Contents\s*\n/i
  const leadingToggle = /^(?:\s|\\n)*Toggle[^\n]*\n?/i
  let changed = true
  while (changed) {
    changed = false
    if (leadingNbsp.test(cleanedBody)) {
      cleanedBody = cleanedBody.replace(leadingNbsp, '')
      changed = true
    }
    if (leadingToc.test(cleanedBody)) {
      cleanedBody = cleanedBody.replace(leadingToc, '')
      changed = true
    }
    if (leadingToggle.test(cleanedBody)) {
      cleanedBody = cleanedBody.replace(leadingToggle, '')
      changed = true
    }
  }
  // Compatta righe vuote multiple all'inizio
  cleanedBody = cleanedBody.replace(/^(\s*\n){2,}/, '\n')

  // Se nel prefisso ci sono marker TOC ("Table of Contents" o "Toggle"), tronca tutto fino al primo heading markdown
  {
    const hasTocMarker = /^(?:[\s\S]{0,400})(Table of Contents|Toggle)/i.test(cleanedBody)
    if (hasTocMarker) {
      const lines = cleanedBody.split('\n')
      const firstHeadingIdx = lines.findIndex((ln) => /^#{1,6}\s/.test(ln.trim()))
      if (firstHeadingIdx > -1) {
        cleanedBody = lines.slice(firstHeadingIdx).join('\n')
      }
    }
  }

  // Tronca SEMPRE tutto fino al primo H2 (## ) se presente
  {
    const lines = cleanedBody.split('\n')
    const firstH2Idx = lines.findIndex((ln) => /^##\s+/.test(ln.trim()))
    if (firstH2Idx > -1) {
      cleanedBody = lines.slice(firstH2Idx).join('\n')
    }
  }
  const newContent = newFrontmatter + cleanedBody.trimStart()
  await fs.writeFile(file, newContent, 'utf8')
  return { file, category: category ?? null, tags: ordered.tags ?? [] }
}

async function main() {
  const files = await readAllMarkdownFiles(INSIGHTS_DIR)
  const results = []
  for (const f of files) {
    try {
      const r = await processFile(f)
      results.push(r)
      console.log(`✔ ${path.relative(ROOT, f)} → cat: ${r.category ?? 'n/a'} tags: ${r.tags.join(', ')}`)
    } catch (e) {
      console.error(`✖ ${path.relative(ROOT, f)}: ${e.message}`)
    }
  }
  console.log(`\nCompletato. File processati: ${results.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


