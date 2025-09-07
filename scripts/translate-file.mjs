#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, parse as parsePath } from 'node:path'
import { parseDocument, stringify } from 'yaml'

/**
 * Translate a single Markdown/MDX file into one or more target languages using OpenAI.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/translate-file.mjs --file src/content/insights/foo.mdx --to en,sl
 * Options:
 *   --file <path>      Path to source .md/.mdx
 *   --to <langs>       Comma-separated target languages (e.g., en or en,sl)
 *   --model <name>     OpenAI model (default: gpt-4o-mini)
 *   --keep-slug        Keep original slug, do not regenerate
 */

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, cur, idx, arr) => {
  if (cur.startsWith('--')) {
    const key = cur.slice(2)
    const next = arr[idx + 1]
    if (!next || next.startsWith('--')) acc.push([key, true])
    else acc.push([key, next])
  }
  return acc
}, []))

const SOURCE_FILE = args.file
const TARGET_LANGS = (args.to ? String(args.to) : '').split(',').map((s) => s.trim()).filter(Boolean)
const MODEL = String(args.model || 'gpt-4o-mini')
const KEEP_SLUG = Boolean(args['keep-slug'])
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!SOURCE_FILE || TARGET_LANGS.length === 0) {
  console.error('Uso: OPENAI_API_KEY=... node scripts/translate-file.mjs --file <path> --to <en[,sl]> [--model gpt-4o-mini] [--keep-slug]')
  process.exit(1)
}
if (!OPENAI_API_KEY) {
  console.error('Errore: variabile OPENAI_API_KEY non impostata.')
  process.exit(1)
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function extractFrontmatterAndBody(text) {
  if (!text.startsWith('---')) return { fmRaw: null, fm: null, body: text }
  const end = text.indexOf('\n---', 3)
  if (end === -1) return { fmRaw: null, fm: null, body: text }
  const fmRaw = text.slice(3, end + 1)
  const body = text.slice(end + 4)
  const doc = parseDocument(fmRaw)
  const fm = doc.toJSON()
  return { fmRaw, fm, body }
}

async function openaiTranslate({ model, sourceLang, targetLang, title, description, excerpt, body }) {
  const system = {
    role: 'system',
    content: 'You are a professional technical translator. Translate Italian content to the target language preserving Markdown/MDX structure, code blocks, inline links, and formatting. Translate alt/caption text, titles, descriptions, and excerpts. Avoid adding notes. Output strictly valid JSON.'
  }
  const user = {
    role: 'user',
    content: JSON.stringify({
      sourceLang,
      targetLang,
      fields: { title, description, excerpt },
      body
    })
  }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [system, user],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`OpenAI API error: ${resp.status} ${text}`)
  }
  const data = await resp.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    throw new Error('Failed to parse OpenAI JSON response')
  }
  const out = {
    title: parsed.title ?? title,
    description: parsed.description ?? description,
    excerpt: parsed.excerpt ?? excerpt,
    body: parsed.body ?? body,
  }
  return out
}

async function main() {
  const raw = await readFile(SOURCE_FILE, 'utf8')
  const { fm, body } = extractFrontmatterAndBody(raw)
  if (!fm) {
    console.error(`Nessun frontmatter trovato in ${SOURCE_FILE}`)
    process.exit(1)
  }

  const sourceLang = fm.lang || 'it'
  const title = fm.title || ''
  const description = fm.description || ''
  const excerpt = fm.excerpt || ''

  for (const targetLang of TARGET_LANGS) {
    if (targetLang === sourceLang) continue
    console.log(`Traduzione → ${targetLang} per ${SOURCE_FILE}`)
    const t = await openaiTranslate({ model: MODEL, sourceLang, targetLang, title, description, excerpt, body })

    // Build new frontmatter
    const newFm = { ...fm, title: t.title, description: t.description, excerpt: t.excerpt, lang: targetLang }
    if (!KEEP_SLUG) newFm.slug = slugify(t.title)

    // Serialize YAML (ensure quotes when needed are handled by yaml.stringify)
    const yamlText = stringify(newFm).trimEnd()
    const outBody = t.body.trimStart()

    // Output path: same directory + /<lang>/<slug>.mdx
    const { dir, name } = parsePath(SOURCE_FILE)
    const baseOutDir = dir
    const fileSlug = newFm.slug || name
    const targetDir = join(baseOutDir, targetLang)
    await mkdir(targetDir, { recursive: true })
    const outPath = join(targetDir, `${fileSlug}.mdx`)

    const finalText = `---\n${yamlText}\n---\n${outBody.startsWith('\n') ? outBody : '\n' + outBody}`
    await writeFile(outPath, finalText, 'utf8')
    console.log(`Creato: ${outPath}`)

    // Piccola attesa per sicurezza rate-limit
    await new Promise((r) => setTimeout(r, 1200))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


