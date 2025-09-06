#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const INSIGHTS_DIR = path.join(ROOT, 'src', 'content', 'insights')

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(full)
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) yield full
  }
}

function splitFrontmatter(raw) {
  if (!raw.startsWith('---')) return { fm: null, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { fm: null, body: raw }
  const fmBlock = raw.slice(0, end + 4)
  const body = raw.slice(end + 4).replace(/^\s*\n/, '')
  return { fm: fmBlock, body }
}

async function convert(file) {
  const raw = await fs.readFile(file, 'utf8')
  const { fm, body } = splitFrontmatter(raw)

  const mdxHeader = [
    "import TwoCol from '../../components/TwoCol.astro'",
    '',
    '<TwoCol src="" alt="" width={1200} height={800} caption="">',
    '',
    '</TwoCol>',
    '',
  ].join('\n')

  const newContent = (fm ?? '') + '\n' + mdxHeader + '\n' + body
  const target = file.replace(/\.md$/, '.mdx')
  await fs.writeFile(target, newContent, 'utf8')
  await fs.unlink(file)
  return target
}

async function main() {
  const files = []
  for await (const f of walk(INSIGHTS_DIR)) files.push(f)
  if (!files.length) {
    console.log('Nessun file .md trovato in insights.')
    return
  }
  for (const f of files) {
    const out = await convert(f)
    console.log(`✔ Converted: ${path.relative(ROOT, f)} → ${path.relative(ROOT, out)}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })


