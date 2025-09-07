#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { run } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * Bulk translate all content files in src/content that do not have a sibling translation.
 * Assumes each source file has fm.lang and outputs to a subdir named after target lang under the same folder.
 *
 * Usage:
 *   OPENAI_API_KEY=... node scripts/translate-content.mjs --to en,sl [--model gpt-4o-mini] [--keep-slug]
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

const TARGET_LANGS = (args.to ? String(args.to) : '').split(',').map((s) => s.trim()).filter(Boolean)
const MODEL = String(args.model || 'gpt-4o-mini')
const KEEP_SLUG = Boolean(args['keep-slug'])

if (TARGET_LANGS.length === 0) {
  console.error('Uso: OPENAI_API_KEY=... node scripts/translate-content.mjs --to <en[,sl]> [--model gpt-4o-mini] [--keep-slug]')
  process.exit(1)
}

const root = 'src/content'

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      // skip language folders (en, sl, it) to avoid recursion into outputs
      if (['en', 'sl', 'it'].includes(entry.name)) continue
      yield* walk(full)
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      yield full
    }
  }
}

function execNode(cmd) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('node:child_process')
    const [exe, ...rest] = cmd.split(' ')
    const p = spawn(exe, rest, { stdio: 'inherit', env: process.env })
    p.on('exit', (code) => {
      if (code === 0) resolve(undefined)
      else reject(new Error(`Command failed: ${cmd}`))
    })
  })
}

async function main() {
  const files = []
  for await (const f of walk(root)) files.push(f)

  for (const file of files) {
    for (const lang of TARGET_LANGS) {
      const outDir = join(file.substring(0, file.lastIndexOf('/')), lang)
      try {
        const s = await stat(outDir)
        if (s.isDirectory()) continue // already has translation dir; skip naive
      } catch {}
      const cmd = `node scripts/translate-file.mjs --file ${file} --to ${lang} --model ${MODEL} ${KEEP_SLUG ? '--keep-slug' : ''}`.trim()
      await execNode(cmd)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


