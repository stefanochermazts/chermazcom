import it from '../i18n/it.json'
import en from '../i18n/en.json'
import sl from '../i18n/sl.json'

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
export function getAlternateUrls(path: string, baseUrl: string = 'https://www.chermaz.com'): Record<Locale | 'x-default', string> {
  const cleanPath = removeLocaleFromPath(path)
  const urls: Record<string, string> = {}
  
  for (const locale of locales) {
    urls[locale] = `${baseUrl}${addLocaleToPath(cleanPath, locale)}`
  }
  
  urls['x-default'] = `${baseUrl}${addLocaleToPath(cleanPath, defaultLocale)}`
  
  return urls
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
