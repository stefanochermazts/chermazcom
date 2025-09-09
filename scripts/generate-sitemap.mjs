import fs from 'node:fs/promises'
import fssync from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const SITE = process.env.SITE || 'https://www.chermaz.com'
const OUT_FILE = path.resolve('public/sitemap.xml')
const ROOT = process.cwd()

const locales = ['it','en','sl']
const defaultLocale = 'it'

// Mappatura delle rotte localizzate (come in src/utils/i18n.ts)
const routeMappings = {
  it: {
    '/': '/',
    '/chi-sono': '/about',
    '/servizi': '/services',
    '/case-studies': '/case-studies',
    '/insights': '/insights',
    '/contatti': '/contact',
    '/privacy': '/privacy'
  },
  en: {
    '/': '/',
    '/about': '/about',
    '/services': '/services',
    '/case-studies': '/case-studies',
    '/insights': '/insights',
    '/contact': '/contact',
    '/privacy': '/privacy'
  },
  sl: {
    '/': '/',
    '/o-meni': '/about',
    '/storitve': '/services',
    '/case-studies': '/case-studies',
    '/insights': '/insights',
    '/kontakt': '/contact',
    '/zasebnost': '/privacy'
  }
}

function addLocaleToPath(p, locale) {
  const clean = removeLocaleFromPath(p)
  return `/${locale}${clean === '/' ? '' : clean}`
}

function removeLocaleFromPath(p) {
  const segs = p.split('/').filter(Boolean)
  if (segs.length && locales.includes(segs[0])) return '/' + segs.slice(1).join('/')
  return p
}

function getLocalizedRoute(canonicalPath, locale) {
  const clean = removeLocaleFromPath(canonicalPath)
  const mapping = routeMappings[locale]
  for (const [localized, canonical] of Object.entries(mapping)) {
    if (canonical === clean) return addLocaleToPath(localized, locale)
  }
  return addLocaleToPath(clean, locale)
}

function detectLocaleFromFilename(name) {
  if (name.startsWith('en-')) return 'en'
  if (name.startsWith('sl-')) return 'sl'
  return 'it'
}

function localizeSlug(full) {
  return full.replace(/^(en-|sl-)/, '')
}

function normalizeCategory(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function listMdx(dir) {
  return fssync.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
}

async function main() {
  const urls = new Set()

  // Pagine statiche per lingua
  const staticCanonicals = ['/', '/about', '/services', '/case-studies', '/insights', '/contact', '/privacy']
  for (const l of locales) {
    for (const canonical of staticCanonicals) {
      urls.add(`${SITE}${getLocalizedRoute(canonical, l)}/`.replace(/\/+$/, '/'))
    }
  }

  // Insights
  const insightsDir = path.join(ROOT, 'src', 'content', 'insights')
  const insightFiles = fssync.existsSync(insightsDir) ? await listMdx(insightsDir) : []
  const insightsByLocale = { it: [], en: [], sl: [] }
  for (const f of insightFiles) {
    const loc = detectLocaleFromFilename(f)
    insightsByLocale[loc].push(f)
  }
  for (const l of locales) {
    // index
    urls.add(`${SITE}${getLocalizedRoute('/insights', l)}/`.replace(/\/+$/, '/'))
    // detail
    for (const file of insightsByLocale[l]) {
      const raw = await fs.readFile(path.join(insightsDir, file), 'utf-8')
      const parsed = matter(raw)
      const base = localizeSlug(parsed.data.slug || file.replace(/\.mdx?$/, ''))
      urls.add(`${SITE}${getLocalizedRoute(`/insights/${base}`, l)}/`.replace(/\/+$/, '/'))
    }
    // categorie
    const categories = new Set()
    for (const file of insightsByLocale[l]) {
      const raw = await fs.readFile(path.join(insightsDir, file), 'utf-8')
      const parsed = matter(raw)
      for (const c of (parsed.data.categories || [])) categories.add(normalizeCategory(c))
    }
    for (const cat of categories) {
      urls.add(`${SITE}${getLocalizedRoute(`/insights/categoria/${cat}`, l)}/`.replace(/\/+$/, '/'))
    }
  }

  // Case studies
  const csDir = path.join(ROOT, 'src', 'content', 'case-studies')
  const csFiles = fssync.existsSync(csDir) ? await listMdx(csDir) : []
  const csByLocale = { it: [], en: [], sl: [] }
  for (const f of csFiles) {
    const loc = detectLocaleFromFilename(f)
    csByLocale[loc].push(f)
  }
  for (const l of locales) {
    urls.add(`${SITE}${getLocalizedRoute('/case-studies', l)}/`.replace(/\/+$/, '/'))
    for (const file of csByLocale[l]) {
      const raw = await fs.readFile(path.join(csDir, file), 'utf-8')
      const parsed = matter(raw)
      const base = localizeSlug(parsed.data.slug || file.replace(/\.mdx?$/, ''))
      urls.add(`${SITE}${getLocalizedRoute(`/case-studies/${base}`, l)}/`.replace(/\/+$/, '/'))
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n`+
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+
    `${[...urls].sort().map(loc => `  <url><loc>${loc}</loc></url>`).join('\n')}\n`+
    `</urlset>`

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true })
  await fs.writeFile(OUT_FILE, xml)
  console.log(`[sitemap] wrote ${OUT_FILE} with ${urls.size} urls`)
}

main()


