#!/usr/bin/env node
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

// Quote scalar values containing ':' in the frontmatter for keys we care about
const KEYS = new Set(['title', 'description', 'excerpt'])

async function main() {
  const root = 'src/content'
  const files = await collectMarkdownFiles(root)
  let changed = 0
  for (const file of files) {
    const before = await readFile(file, 'utf8')
    const after = fixFile(before)
    if (after !== before) {
      await writeFile(file, after, 'utf8')
      console.log(`Updated: ${file}`)
      changed++
    }
  }
  if (changed === 0) {
    console.log('Nessuna modifica necessaria.')
  } else {
    console.log(`Modifiche applicate: ${changed}`)
  }
}

function fixFile(text) {
  if (!text.startsWith('---')) return text
  const end = text.indexOf('\n---', 3)
  if (end === -1) return text
  const header = text.slice(0, end + 4) // include closing --- and trailing newline
  const body = text.slice(end + 4)

  const lines = header.split('\n')
  for (let i = 1; i < lines.length - 1; i++) {
    const line = lines[i]
    // ignore arrays, objects, or indented lines (likely nested)
    if (/^\s/.test(line)) continue
    const m = /^(\w[\w-]*)\s*:\s*(.*)$/.exec(line)
    if (!m) continue
    const key = m[1]
    let value = m[2]
    if (!KEYS.has(key)) continue
    // skip if already quoted or empty
    if (/^".*"$/.test(value) || /^'.*'$/.test(value) || value.trim() === '') continue
    if (value.includes(':')) {
      // escape inner quotes
      value = value.replace(/"/g, '\\"')
      lines[i] = `${key}: "${value}"`
    }
  }
  return lines.join('\n') + body
}

async function collectMarkdownFiles(dir) {
  const result = []
  await walk(dir, result)
  return result
}

async function walk(currentDir, out) {
  const entries = await readdir(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name)
    if (entry.isDirectory()) {
      await walk(fullPath, out)
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        out.push(fullPath)
      }
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})


