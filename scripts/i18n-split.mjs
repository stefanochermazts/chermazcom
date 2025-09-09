import { readdir, stat, mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'

const roots = [
  { dir: 'src/content/insights' },
  { dir: 'src/content/case-studies' },
]

async function ensureDirs(base) {
  for (const lang of ['it', 'en', 'sl']) {
    await mkdir(join(base, lang), { recursive: true })
  }
}

function slugToTitle(slug) {
  try {
    const name = slug.replace(/\.[^.]+$/, '')
    return name
      .split('/')
      .pop()
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase())
  } catch {
    return slug
  }
}

async function createStub(base, lang, filename) {
  const title = slugToTitle(filename)
  const fm = `---\n` +
    `title: "${title}"\n` +
    `status: draft\n` +
    `lang: ${lang}\n` +
    `---\n\n` +
    `<!-- TODO: Traduzione ${lang.toUpperCase()} -->\n`
  const target = join(base, lang, filename)
  try {
    await writeFile(target, fm, { flag: 'wx' })
  } catch {}
}

async function processDir(base) {
  await ensureDirs(base)
  const entries = await readdir(base)
  for (const name of entries) {
    if (['it', 'en', 'sl'].includes(name)) continue
    const fp = join(base, name)
    const st = await stat(fp)
    if (st.isDirectory()) continue
    if (!name.endsWith('.md') && !name.endsWith('.mdx')) continue

    // Move to it/
    const target = join(base, 'it', name)
    await rename(fp, target)

    // Create en/sl stubs if missing
    await createStub(base, 'en', name)
    await createStub(base, 'sl', name)
  }
}

async function main() {
  for (const { dir } of roots) {
    await processDir(dir)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


