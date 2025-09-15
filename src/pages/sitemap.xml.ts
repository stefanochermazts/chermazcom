import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { locales, addLocaleToPath, routeMappings } from '../utils/i18n'

const baseUrl = 'https://www.chermaz.com'

// Static pages for each locale
const staticPages = [
  '/',
  '/about',
  '/services', 
  '/case-studies',
  '/insights',
  '/contact',
  '/privacy',
  '/ai-playground'
]

function detectLocaleFromId(id: string): 'it' | 'en' | 'sl' {
  if (id.startsWith('en-')) return 'en'
  if (id.startsWith('sl-')) return 'sl'
  return 'it'
}

function localizeSlug(full: string): string {
  // Rimuovi prefissi en-/sl- dal valore slug/id per il segmento URL locale
  return full.replace(/^(en-|sl-)/, '')
}

function normalizeCategory(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const GET: APIRoute = async () => {
  // Get all insights and case studies
  const insights = await getCollection('insights')
  const caseStudies = await getCollection('caseStudies')
  
  const urls: string[] = []
  
  // Add static pages for all locales
  for (const locale of locales) {
    const mapping = routeMappings[locale]
    
    for (const page of staticPages) {
      const localizedPath = mapping[page] || page
      const fullPath = addLocaleToPath(localizedPath, locale)
      urls.push(`${baseUrl}${fullPath}`)
    }

    // Index pages
    urls.push(`${baseUrl}${addLocaleToPath('/insights', locale)}`)
    urls.push(`${baseUrl}${addLocaleToPath('/case-studies', locale)}`)

    // Insights per-locale
    const insForLocale = insights.filter((i) => detectLocaleFromId(i.id) === locale)
    for (const insight of insForLocale) {
      const full = insight.slug ?? insight.id.replace(/\.mdx?$/, '')
      const local = localizeSlug(full)
      urls.push(`${baseUrl}${addLocaleToPath(`/insights/${local}`, locale)}`)
    }

    // Case studies per-locale
    const csForLocale = caseStudies.filter((c) => detectLocaleFromId(c.id) === locale)
    for (const cs of csForLocale) {
      const full = cs.slug ?? cs.id.replace(/\.mdx?$/, '')
      const local = localizeSlug(full)
      urls.push(`${baseUrl}${addLocaleToPath(`/case-studies/${local}`, locale)}`)
    }

    // Insights categories per-locale
    const categories = new Set<string>()
    for (const p of insForLocale) {
      const cats = (p.data.categories ?? []) as string[]
      for (const c of cats) categories.add(normalizeCategory(c))
    }
    for (const cat of categories) {
      urls.push(`${baseUrl}${addLocaleToPath(`/insights/categoria/${cat}`, locale)}`)
    }
  }
  
  // Generate XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(url => `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
