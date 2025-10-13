import it from '../i18n/it.json'
import en from '../i18n/en.json'
import sl from '../i18n/sl.json'
import { getCollection, type CollectionEntry } from 'astro:content'

export type Locale = 'it' | 'en' | 'sl'

export const locales: Locale[] = ['it', 'en', 'sl']
export const defaultLocale: Locale = 'it'

const translations = {
  it,
  en,
  sl
}

/**
 * Get translation for a given key and locale
 */
export function t(key: string, locale: Locale = defaultLocale): string {
  const keys = key.split('.')
  let value: any = translations[locale]
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Fallback to default locale
      value = translations[defaultLocale]
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey]
        } else {
          return key // Return key if not found
        }
      }
      break
    }
  }
  
  return typeof value === 'string' ? value : key
}

/**
 * Get locale from URL path
 */
export function getLocaleFromUrl(url: URL | string): Locale {
  const pathname = typeof url === 'string' ? url : url.pathname
  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0] as Locale
  
  if (locales.includes(firstSegment)) {
    return firstSegment
  }
  
  return defaultLocale
}

/**
 * Remove locale prefix from path
 */
export function removeLocaleFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean)
  const firstSegment = segments[0] as Locale
  
  if (locales.includes(firstSegment)) {
    return '/' + segments.slice(1).join('/')
  }
  
  return path
}

/**
 * Add locale prefix to path
 */
export function addLocaleToPath(path: string, locale: Locale): string {
  const cleanPath = removeLocaleFromPath(path)
  return `/${locale}${cleanPath === '/' ? '' : cleanPath}`
}

/**
 * Get localized URL for a path
 */
export function getLocalizedUrl(path: string, locale: Locale): string {
  return addLocaleToPath(path, locale)
}

/**
 * Get alternate URLs for all locales
 */
export async function getAlternateUrls(path: string, baseUrl: string = 'https://www.chermaz.com'): Promise<Record<Locale | 'x-default', string>> {
  const base = (baseUrl || '').replace(/\/$/, '') || 'https://www.chermaz.com'
  const cleanPath = removeLocaleFromPath(path)
  const urls: Record<string, string> = {}

  // Helpers per estrarre info dal path corrente
  const segments = path.split('/').filter(Boolean)
  const currentLocale: Locale = locales.includes(segments[0] as Locale) ? (segments[0] as Locale) : defaultLocale
  const isInsightsDetail = /^\/insights\//.test(cleanPath)
  const isCaseStudyDetail = /^\/case-studies\//.test(cleanPath)
  const isCategory = /\/categoria\//.test(cleanPath)

  // Recupera mapping slug localizzati per una collezione
  async function buildEntryIndex(collectionName: 'insights' | 'caseStudies') {
    const entries = await getCollection(collectionName)
    type EntryInfo = {
      locale: Locale
      localSlug: string
      sourceSlug?: string
    }
    const list: EntryInfo[] = []
    for (const e of entries) {
      const id = e.id.replace(/\\/g, '/')
      const isEn = id.startsWith('en-')
      const isSl = id.startsWith('sl-')
      const locale: Locale = isEn ? 'en' : isSl ? 'sl' : 'it'
      const full = e.slug ?? id.replace(/\.mdx?$/, '')
      const localSlug = locale === 'en' ? full.replace(/^en-/, '') : locale === 'sl' ? full.replace(/^sl-/, '') : full.replace(/^it\//, '')
      const sourceSlug = (e.data as any)?.sourceSlug as string | undefined
      list.push({ locale, localSlug, sourceSlug })
    }
    return list
  }

  if (isInsightsDetail || isCaseStudyDetail) {
    const slugSegment = cleanPath.split('/').filter(Boolean).slice(-1)[0] || ''
    const section = isInsightsDetail ? 'insights' : 'case-studies'
    const entries = await buildEntryIndex(isInsightsDetail ? 'insights' : 'caseStudies')

    // Trova l'entry corrente per dedurre l'eventuale sourceSlug IT
    const currentEntry = entries.find(e => e.locale === currentLocale && e.localSlug === slugSegment)
    const itBaseSlug = currentLocale === 'it' ? slugSegment : (currentEntry?.sourceSlug || slugSegment)

    for (const locale of locales) {
      let localizedSlug: string | undefined
      if (locale === 'it') {
        localizedSlug = entries.find(e => e.locale === 'it' && e.localSlug === itBaseSlug)?.localSlug
      } else {
        // Preferisci corrispondenza via sourceSlug
        localizedSlug = entries.find(e => e.locale === locale && e.sourceSlug === itBaseSlug)?.localSlug
        // Fallback: EN spesso mantiene lo stesso slug IT
        if (!localizedSlug && locale === 'en') {
          localizedSlug = entries.find(e => e.locale === 'en' && e.localSlug === itBaseSlug)?.localSlug
        }
      }
      urls[locale] = `${base}/${locale}/${section}/${(localizedSlug || slugSegment)}/`
    }
    const itSlugForDefault = entries.find(e => e.locale === 'it' && e.localSlug === itBaseSlug)?.localSlug || slugSegment
    urls['x-default'] = `${base}/it/${section}/${itSlugForDefault}/`
    return urls as Record<Locale | 'x-default', string>
  }

  if (isCategory) {
    for (const locale of locales) {
      urls[locale] = `${base}${addLocaleToPath(cleanPath, locale)}`
    }
    urls['x-default'] = `${base}${addLocaleToPath(cleanPath, defaultLocale)}`
    return urls as Record<Locale | 'x-default', string>
  }

  // Pagine statiche
  for (const locale of locales) {
    const localizedPath = getLocalizedRoute(cleanPath, locale)
    urls[locale] = `${base}${localizedPath}`
  }
  const defaultPath = getLocalizedRoute(cleanPath, defaultLocale)
  urls['x-default'] = `${base}${defaultPath}`
  return urls as Record<Locale | 'x-default', string>
}

/**
 * Route mappings for different locales
 */
export const routeMappings: Record<Locale, Record<string, string>> = {
  it: {
    '/': '/',
    '/chi-sono': '/about',
    '/servizi': '/services',
    '/case-studies': '/case-studies',
    '/insights': '/insights',
    '/contatti': '/contact',
    '/privacy': '/privacy',
    '/cookie-policy': '/cookie-policy'
  },
  en: {
    '/': '/',
    '/about': '/about',
    '/services': '/services',
    '/case-studies': '/case-studies',
    '/insights': '/insights',
    '/contact': '/contact',
    '/privacy': '/privacy',
    '/cookie-policy': '/cookie-policy'
  },
  sl: {
    '/': '/',
    '/o-meni': '/about',
    '/storitve': '/services',
    '/case-studies': '/case-studies',
    '/insights': '/insights',
    '/kontakt': '/contact',
    '/zasebnost': '/privacy',
    '/cookie-policy': '/cookie-policy'
  }
}

/**
 * Get localized route for a path
 */
export function getLocalizedRoute(path: string, locale: Locale): string {
  const cleanPath = removeLocaleFromPath(path)
  const mapping = routeMappings[locale]
  
  // Find the route in the mapping
  for (const [localizedPath, canonicalPath] of Object.entries(mapping)) {
    if (canonicalPath === cleanPath) {
      return addLocaleToPath(localizedPath, locale)
    }
  }
  
  // If no mapping found, return the original path with locale
  return addLocaleToPath(cleanPath, locale)
}
