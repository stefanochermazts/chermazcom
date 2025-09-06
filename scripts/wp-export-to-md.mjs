import fs from 'node:fs/promises'
import path from 'node:path'

const BASE = process.env.WP_BASE || 'https://chermaz.com'
const OUT = path.resolve('content')
const IMG = path.resolve('public/images/wp')

await fs.mkdir(path.join(OUT, 'insights'), { recursive: true })
await fs.mkdir(path.join(OUT, 'pages'), { recursive: true })
await fs.mkdir(path.join(OUT, 'case-studies'), { recursive: true })
await fs.mkdir(IMG, { recursive: true })

async function getAll(type) {
  let page = 1, out = []
  while (true) {
    const url = `${BASE}/wp-json/wp/v2/${type}?per_page=100&page=${page}`
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept': 'application/json'
        }
      })
      if (!res.ok) {
        console.error(`[wp-export] ${type} page ${page}: HTTP ${res.status} ${res.statusText}`)
        break
      }
      const data = await res.json()
      if (!Array.isArray(data) || !data.length) break
      out = out.concat(data)
      page++
      await new Promise(r => setTimeout(r, 250))
    } catch (err) {
      console.error(`[wp-export] fetch error on ${url}:`, err?.message || err)
      break
    }
  }
  console.log(`[wp-export] fetched ${out.length} ${type}`)
  return out
}

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function downloadImage(src) {
  try {
    const url = src.startsWith('http') ? src : BASE + src
    const res = await fetch(url)
    if (!res.ok) return null
    const ext = (url.split('.').pop() || 'jpg').split('?')[0]
    const name = slugify(url.split('/').slice(-2).join('-'))
    const file = `${name}.${ext}`
    const buf = await res.arrayBuffer()
    await fs.writeFile(path.join(IMG, file), Buffer.from(buf))
    return `/images/wp/${file}`
  } catch { return null }
}

function htmlToMd(html) {
  return html
    .replaceAll('\r', '')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<br\s*\/?>(?=\n?)/gi, '\n')
    .replace(/<[^>]+>/g, '')
}

async function convertPost(p) {
  const title = p.title?.rendered?.trim() || 'Senza titolo'
  const slug = p.slug || slugify(title)
  const html = p.content?.rendered || ''
  // Scarica immagini e sostituisci src via regex
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const srcs = new Set()
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) srcs.add(match[1])
  }
  const srcToLocal = {}
  for (const src of srcs) {
    const local = await downloadImage(src)
    if (local) srcToLocal[src] = local
  }
  const replacedHtml = html.replace(imgRegex, (m, src) => {
    return srcToLocal[src] ? m.replace(src, srcToLocal[src]) : m
  })

  const bodyMd = htmlToMd(replacedHtml)
  const date = p.date?.slice(0, 10)

  const fm = `---\ntitle: "${title.replace(/"/g, '\\"')}"\nslug: ${slug}\ndate: ${date}\nstatus: ${p.status}\nexcerpt: "${(p.excerpt?.rendered || '').replace(/<[^>]+>/g, '').replace(/"/g, '\\"').slice(0, 140)}"\ncategories: ${JSON.stringify(p.categories || [])}\ntags: ${JSON.stringify(p.tags || [])}\n---\n\n`

  return { slug, md: fm + bodyMd }
}

async function main() {
  const posts = await getAll('posts')
  for (const p of posts) {
    const { slug, md } = await convertPost(p)
    await fs.writeFile(path.join(OUT, 'insights', `${slug}.md`), md)
  }
  const pages = await getAll('pages')
  for (const p of pages) {
    const { slug, md } = await convertPost(p)
    await fs.writeFile(path.join(OUT, 'pages', `${slug}.md`), md)
  }
  console.log(`[wp-export] wrote ${posts.length} posts and ${pages.length} pages`)
}

main()


