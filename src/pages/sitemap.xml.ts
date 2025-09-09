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
  '/privacy'
]

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
    
    // Add insights pages
    urls.push(`${baseUrl}${addLocaleToPath('/insights', locale)}`)
    const ins = insights.filter(i => i.id.startsWith(`${locale}/`))
    for (const insight of ins) {
      const full = insight.slug ?? insight.id.replace(/\.mdx?$/, '')
      const local = full.replace(new RegExp(`^${locale}/`), '')
      urls.push(`${baseUrl}${addLocaleToPath(`/insights/${local}`, locale)}`)
    }
    
    // Add case studies pages
    urls.push(`${baseUrl}${addLocaleToPath('/case-studies', locale)}`)
    const cs = caseStudies.filter(c => c.id.startsWith(`${locale}/`))
    for (const caseStudy of cs) {
      const full = caseStudy.slug ?? caseStudy.id.replace(/\.mdx?$/, '')
      const local = full.replace(new RegExp(`^${locale}/`), '')
      urls.push(`${baseUrl}${addLocaleToPath(`/case-studies/${local}`, locale)}`)
    }
    
    // Add insights categories
    const categories = [...new Set(ins.filter(p => p.id.startsWith(`${locale}/`)).flatMap(p => p.data.categories || []))]
    for (const category of categories) {
      urls.push(`${baseUrl}${addLocaleToPath(`/insights/categoria/${category}`, locale)}`)
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
