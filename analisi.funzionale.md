# Obiettivo

Migrare chermaz.com da WordPress a **Astro + Tailwind** con hosting su **Netlify**, mantenendo SEO/redirect, migliorando performance, accessibilità (WCAG 2.1 AA) e struttura dei contenuti focalizzata sulla consulenza IT.

---

# Prerequisiti (dev)

* Node.js LTS (≥ 20)
* Git
* Editor: Cursor
* Account Netlify
* (Opzionale) Image editor per ottimizzazioni

---

# Roadmap (alto livello)

1. Export contenuti da WordPress
2. Normalizzazione → Markdown/MDX + media localizzati
3. Setup progetto Astro + Tailwind (repo pulita)
4. Implementazione layout, pagine core e routing
5. Migrazione contenuti (Insights/Case Studies) + categorie
6. SEO: redirect, meta, JSON-LD, sitemap, robots
7. Form contatti (Netlify Forms) + privacy
8. Performance & a11y hardening
9. CI/CD su Netlify e DNS cutover
10. Post-launch checks

---

# 1) Export WordPress

## Opzione A — REST API (consigliata)

* Posts: `https://<dominio-wp>/wp-json/wp/v2/posts?per_page=100&page=1`
* Pages: `https://<dominio-wp>/wp-json/wp/v2/pages?per_page=100&page=1`
* Media: `https://<dominio-wp>/wp-json/wp/v2/media?per_page=100&page=1`

## Opzione B — WXR (Tools → Export)

* Scarica XML e usa script di conversione (vedi step 2) per estrarre HTML + media.

**Nota:** individua gli URL delle categorie/tag utili → mappa nuove tassonomie.

---

# 2) Normalizzazione contenuti

Creiamo uno **script Node** per scaricare/convertire post/page in **Markdown** con front‑matter.

## Struttura cartelle target

```
/content
  /insights
    slug-post.md
  /pages
    about.md
  /case-studies
    banca-intranet.md
/public
  /images
```

## Script: `scripts/wp-export-to-md.mjs`

```js
import fs from 'node:fs/promises'
import path from 'node:path'
import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'

const BASE = 'https://<dominio-wp>'
const OUT = path.resolve('content')
const IMG = path.resolve('public/images/wp')
await fs.mkdir(OUT + '/insights', { recursive: true })
await fs.mkdir(OUT + '/pages', { recursive: true })
await fs.mkdir(OUT + '/case-studies', { recursive: true })
await fs.mkdir(IMG, { recursive: true })

async function getAll(type){
  let page=1, out=[]
  while(true){
    const res = await fetch(`${BASE}/wp-json/wp/v2/${type}?per_page=100&page=${page}`)
    if(!res.ok) break
    const data = await res.json()
    if(!data.length) break
    out = out.concat(data)
    page++
  }
  return out
}

function slugify(s){
  return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
}

async function downloadImage(src){
  try {
    const url = src.startsWith('http') ? src : BASE + src
    const res = await fetch(url)
    if(!res.ok) return null
    const ext = (url.split('.').pop()||'jpg').split('?')[0]
    const name = slugify(url.split('/').slice(-2).join('-'))
    const file = `${name}.${ext}`
    const buf = await res.arrayBuffer()
    await fs.writeFile(path.join(IMG, file), Buffer.from(buf))
    return `/images/wp/${file}`
  } catch { return null }
}

function htmlToMd(html){
  // conversione semplice: preserva paragrafi e titoli; puoi sostituire con unified/remark
  return html
    .replaceAll('\r','')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<br\s*\/?>(?=\n?)/gi, '\n')
    .replace(/<[^>]+>/g,'')
}

async function convertPost(p){
  const title = p.title?.rendered?.trim() || 'Senza titolo'
  const slug = p.slug || slugify(title)
  const dom = new JSDOM(p.content?.rendered || '')
  const doc = dom.window.document

  // Scarica immagini e rimpiazza src
  const imgs = [...doc.querySelectorAll('img')]
  for(const img of imgs){
    const local = await downloadImage(img.getAttribute('src'))
    if(local) img.setAttribute('src', local)
  }

  const bodyHtml = doc.body.innerHTML
  const bodyMd = htmlToMd(bodyHtml)
  const date = p.date?.slice(0,10)

  const fm = `---\ntitle: "${title.replace(/"/g,'\"')}"\nslug: ${slug}\ndate: ${date}\nstatus: ${p.status}\nexcerpt: "${(p.excerpt?.rendered||'').replace(/<[^>]+>/g,'').replace(/"/g,'\"').slice(0,140)}"\ncategories: ${JSON.stringify(p.categories||[])}\ntags: ${JSON.stringify(p.tags||[])}\n---\n\n`

  return { slug, md: fm + bodyMd }
}

async function main(){
  const posts = await getAll('posts')
  for(const p of posts){
    const { slug, md } = await convertPost(p)
    await fs.writeFile(path.join(OUT, 'insights', `${slug}.md`), md)
  }
  const pages = await getAll('pages')
  for(const p of pages){
    const { slug, md } = await convertPost(p)
    await fs.writeFile(path.join(OUT, 'pages', `${slug}.md`), md)
  }
  console.log('Done.')
}

main()
```

## `package.json` — script utili

```json
{
  "scripts": {
    "wp:export": "node scripts/wp-export-to-md.mjs"
  },
  "type": "module",
  "dependencies": {
    "jsdom": "^24.0.0",
    "node-fetch": "^3.3.2"
  }
}
```

---

# 3) Setup Astro + Tailwind (repo)

```bash
npm create astro@latest chermaz.com -- --template basics --typescript strict --git false
cd chermaz.com
npm i -D tailwindcss postcss autoprefixer @tailwindcss/typography
npx tailwindcss init -p
```

**tailwind.config.cjs**

```js
module.exports = { content: ['./src/**/*.{astro,html,md,mdx,js,ts,jsx,tsx}'], theme:{ extend:{} }, plugins:[require('@tailwindcss/typography')] }
```

**src/styles/globals.css**

```css
@tailwind base; @tailwind components; @tailwind utilities;
*:focus { outline: 2px solid #1f63ff; outline-offset: 2px; }
```

**astro.config.mjs**

```js
import { defineConfig } from 'astro/config'
export default defineConfig({ site: 'https://www.chermaz.com' })
```

---

# 4) Layout, pagine core e routing

* `src/layouts/Base.astro` (metadati, JSON-LD, Header/Footer)
* Pagine: `/`, `/about`, `/services/*`, `/case-studies/*`, `/insights`, `/contact`, `/privacy`
* Collezioni contenuti (Astro Content Collections) per **insights** e **case‑studies** (schema + slug)

**Esempio schema collection** `src/content/config.ts`

```ts
import { defineCollection, z } from 'astro:content'
const insights = defineCollection({
  type: 'content',
  schema: z.object({ title: z.string(), date: z.string(), excerpt: z.string().optional() })
})
export const collections = { insights }
```

**Listing** `src/pages/insights/index.astro`

```astro
---
import Base from '../../layouts/Base.astro'
import { getCollection } from 'astro:content'
const posts = await getCollection('insights')
---
<Base title="Insights — chermaz.com" description="Approfondimenti su M365, AI, Compliance.">
  <section class="mx-auto max-w-3xl px-4 py-12 prose">
    <h1>Insights</h1>
    <ul>
      {posts.sort((a,b)=>a.data.date<b.data.date?1:-1).map(p => (
        <li><a href={`/insights/${p.slug}/`}>{p.data.title}</a></li>
      ))}
    </ul>
  </section>
</Base>
```

---

# 5) Migrazione contenuti

* Esegui `npm run wp:export` → copia i `.md` nelle collection giuste
* Rivedi **front‑matter** (title, date, excerpt) e **URL interni**
* Carica media ottimizzati in `/public/images/wp`

---

# 6) SEO e Redirect

## Netlify

**netlify.toml**

```toml
[build]
  command = "astro build"
  publish = "dist"
[dev]
  command = "astro dev"

[[plugins]]
  package = "@netlify/headers"
```

**\_redirects** (root)

```
# WordPress → nuove sezioni
/wp-admin/*              / 301!
/category/sudoku/*       https://sudoku.chermaz.com/:splat 301!
/tag/sudoku/*            https://sudoku.chermaz.com/:splat 301!
# esempi slug vecchi → nuovi
/2024/03/old-post/       /insights/old-post/ 301
```

**\_headers** (root)

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cache-Control: public, max-age=0, s-maxage=31536000
```

**Sitemap & robots**

* Genera sitemap automatica o aggiungi `/sitemap.xml`
* `robots.txt` con `Sitemap: https://www.chermaz.com/sitemap.xml`

**Meta & JSON‑LD**

* Title, description, OG tags per pagina
* JSON‑LD Person/Organization/Service

---

# 7) Form Contatti (Netlify Forms)

**contact.astro** (estratto)

```astro
<form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field">
  <input type="hidden" name="form-name" value="contact" />
  <p class="hidden"><label>Don’t fill this out: <input name="bot-field" /></label></p>
  <!-- campi form -->
  <button type="submit">Invia</button>
</form>
```

**Nota**: aggiungi pagina di successo `/contact/success`.

---

# 8) Performance & A11y hardening

* Immagini responsive `<img srcset>` o componenti `<Image />`
* Lazy‑loading, dimensioni esplicite
* Contrasto ≥ 4.5:1, focus visibile, `aria-label` su link icona
* Heading gerarchici, `main` con `id="contenuto"`
* Lighthouse > 95 su Performance/SEO/Best Practices/Accessibility

---

# 9) CI/CD Netlify + DNS

```bash
# installa CLI
npm i -g netlify-cli

# login & init
netlify login
netlify init  # associa repo e sito

# deploy test
netlify deploy --build

# deploy prod
netlify deploy --prod
```

* Punta il DNS (CNAME su `your-site.netlify.app`)
* Verifica HTTPS automatico (Let’s Encrypt)

---

# 10) Post‑launch checklist

* Verifica redirect (campione 20 URL storici)
* Search Console: nuova proprietà + sitemap
* GA4/Matomo (solo con consenso; cookie banner se necessario)
* Monitor Core Web Vitals
* Broken links scan

---

# Deliverable operativi (subito eseguibili in Cursor)

* Repo Astro con layout base (Base.astro, Header/Footer, Hero)
* Script `wp-export-to-md.mjs` per estrarre/convertire contenuti
* File di piattaforma: `netlify.toml`, `_redirects`, `_headers`, `robots.txt`, `sitemap.xml`
* Collezioni Astro per **insights** e **case-studies**

---

# Prossimi step

1. Crea repo e incolla i file base
2. Esegui lo script di export → rivedi front‑matter
3. Implementa pagine Servizi/Case Studies con i tuoi contenuti
4. Configura Netlify (init, deploy test, DNS)
5. Esegui checklist SEO/a11y/performance
