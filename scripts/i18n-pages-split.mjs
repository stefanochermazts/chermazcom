import { readdir, mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'

const base = 'src/content/pages'

async function ensure() {
  for (const lang of ['it','en','sl']) await mkdir(join(base, lang), { recursive: true })
}

async function moveAndStub() {
  await ensure()
  const entries = await readdir(base)
  for (const name of entries) {
    if (['it','en','sl'].includes(name)) continue
    const fp = join(base, name)
    const st = await stat(fp).catch(()=>null)
    if (!st || !st.isFile()) continue
    if (!name.endsWith('.md') && !name.endsWith('.mdx')) continue
    await rename(fp, join(base, 'it', name))
    const title = name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase())
    const stub = (lang) => `---\n`+
      `title: "${title}"\nslug: ${title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}\nstatus: draft\nlang: ${lang}\n---\n\n<!-- TODO: ${lang.toUpperCase()} -->\n`
    for (const lang of ['en','sl']) {
      const target = join(base, lang, name)
      await writeFile(target, stub(lang), { flag: 'wx' }).catch(()=>{})
    }
  }
}

moveAndStub().catch((e)=>{ console.error(e); process.exit(1) })


