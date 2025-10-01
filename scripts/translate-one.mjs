#!/usr/bin/env node

/**
 * Translate a single MDX file to a target language (en|sl) following Chermaz.com i18n rules.
 * - No subfolders; output filename is prefixed (en- or sl-)
 * - Frontmatter: update slug (with prefix), lang, keep other fields
 * - Preserve MDX structure
 *
 * Usage:
 *   OPENAI_API_KEY=... node scripts/translate-one.mjs --file src/content/insights/foo.mdx --to en [--force]
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'yaml'
import OpenAI from 'openai'

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
const TARGET_LANG = String(args.to || '')
const FORCE = Boolean(args.force)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MODEL = process.env.I18N_OPENAI_MODEL || 'gpt-4o-mini'

if (!SOURCE_FILE || !TARGET_LANG) {
  console.error('Uso: OPENAI_API_KEY=... node scripts/translate-one.mjs --file <path.mdx> --to <en|sl> [--force]')
  process.exit(1)
}
if (!OPENAI_API_KEY) {
  console.error('Errore: OPENAI_API_KEY non impostata')
  process.exit(1)
}
if (!['en', 'sl'].includes(TARGET_LANG)) {
  console.error('Errore: --to deve essere "en" o "sl"')
  process.exit(1)
}

const PREFIX = TARGET_LANG === 'en' ? 'en-' : 'sl-'

function extractFrontmatterAndBody(text) {
  if (!text.startsWith('---')) return { fm: null, body: text }
  const end = text.indexOf('\n---', 3)
  if (end === -1) return { fm: null, body: text }
  const fmRaw = text.slice(3, end + 1)
  const body = text.slice(end + 4)
  const fm = yaml.parse(fmRaw)
  return { fm, body }
}

function buildPrefixedSlug(originalSlug) {
  return `${PREFIX}${String(originalSlug || '')}`
}

async function openaiTranslate({ sourceLang, targetLang, title, description, excerpt, body }) {
  const client = new OpenAI({ apiKey: OPENAI_API_KEY })
  const system = {
    role: 'system',
    content: 'You are a professional translator. Translate Italian MDX into the target language, preserving Markdown/MDX structure, code, links, and components. Translate only human-readable text. Return strict JSON.'
  }
  const user = {
    role: 'user',
    content: JSON.stringify({ sourceLang, targetLang, fields: { title, description, excerpt }, body })
  }
  const resp = await client.chat.completions.create({
    model: MODEL,
    messages: [system, user],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  })
  const content = resp.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')
  const parsed = JSON.parse(content)
  return {
    title: parsed.title ?? title,
    description: parsed.description ?? description,
    excerpt: parsed.excerpt ?? excerpt,
    body: parsed.body ?? body
  }
}

async function main() {
  const raw = await fs.readFile(SOURCE_FILE, 'utf8')
  const { fm, body } = extractFrontmatterAndBody(raw)
  if (!fm) {
    console.error('Frontmatter non trovato nel file sorgente')
    process.exit(1)
  }

  const dir = path.dirname(SOURCE_FILE)
  const baseName = path.basename(SOURCE_FILE, '.mdx')

  // Calcola destinazione secondo regole (nessuna sottocartella; prefisso nel filename)
  const targetSlugPrefixed = buildPrefixedSlug(fm.slug || baseName)
  const targetPath = path.join(dir, `${targetSlugPrefixed}.mdx`)

  if (!FORCE) {
    try {
      await fs.access(targetPath)
      console.log(`⏭️  Skip: esiste già ${path.basename(targetPath)}`)
      process.exit(0)
    } catch {}
  }

  const t = await openaiTranslate({
    sourceLang: fm.lang || 'it',
    targetLang: TARGET_LANG,
    title: fm.title || '',
    description: fm.description || '',
    excerpt: fm.excerpt || '',
    body
  })

  // Aggiorna frontmatter secondo regole repo
  const newFm = { ...fm, title: t.title, description: t.description, excerpt: t.excerpt, lang: TARGET_LANG, slug: targetSlugPrefixed }
  // Serializza YAML mantenendo ordine basilare
  const yamlText = yaml.stringify(newFm).trimEnd()
  const outBody = t.body.trimStart()
  const finalText = `---\n${yamlText}\n---\n${outBody.startsWith('\n') ? outBody : '\n' + outBody}`

  await fs.writeFile(targetPath, finalText, 'utf8')
  console.log(`✅ Creato: ${targetPath}`)
}

main().catch((err) => {
  console.error('❌ Errore traduzione:', err.message)
  process.exit(1)
})







