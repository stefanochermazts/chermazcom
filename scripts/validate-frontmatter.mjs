#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { parseDocument } from 'yaml'

// Utility: extract frontmatter between --- delimiters at file start
function extractFrontmatter(text) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end === -1) return null
  const fm = text.slice(3, end + 1) // includes leading newline after ---
  const fmStartLine = 1 // frontmatter starts at line 1
  const fmEndLine = fm.split('\n').length
  return { raw: fm, startLine: fmStartLine, endLine: fmEndLine }
}

async function validateFile(filePath) {
  const abs = resolve(filePath)
  const content = await readFile(abs, 'utf8')
  const fm = extractFrontmatter(content)
  if (!fm) return []
  const doc = parseDocument(fm.raw, { prettyErrors: true })
  const errors = []
  if (doc.errors && doc.errors.length) {
    for (const err of doc.errors) {
      const line = (err.linePos && err.linePos[0] && err.linePos[0].line) || 1
      errors.push({ file: filePath, line: line, message: err.message })
    }
  }
  if (doc.warnings && doc.warnings.length) {
    for (const warn of doc.warnings) {
      const line = (warn.linePos && warn.linePos[0] && warn.linePos[0].line) || 1
      errors.push({ file: filePath, line: line, message: `Warning: ${warn.message}` })
    }
  }
  return errors
}

async function main() {
  const root = 'src/content'
  const files = await collectMarkdownFiles(root)
  let totalErrors = 0
  const all = await Promise.all(files.map(validateFile))
  const flat = all.flat()
  if (flat.length) {
    for (const e of flat) {
      console.error(`${e.file}:${e.line} ${e.message}`)
    }
    totalErrors = flat.length
  }
  if (totalErrors > 0) {
    console.error(`\nFrontmatter YAML non valido in ${totalErrors} occorrenza/e.`)
    process.exitCode = 1
  } else {
    console.log('Frontmatter YAML: OK')
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

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


