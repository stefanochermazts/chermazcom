/**
 * Sistema di gestione del consenso cookie GDPR-compliant
 * Gestisce le preferenze utente e il blocco/sblocco degli script di terze parti
 */

export type CookieCategory = 'necessary' | 'analytics' | 'marketing' | 'preferences'

export interface CookiePreferences {
  necessary: boolean    // Sempre true, non disabilitabile
  analytics: boolean    // Matomo, Google Analytics
  marketing: boolean    // Google Ads, Facebook Pixel, etc.
  preferences: boolean  // Tema, lingua, impostazioni UX
  timestamp: number     // Quando è stato dato il consenso
  version: string       // Versione della policy accettata
}

export interface CookieInfo {
  name: string
  category: CookieCategory
  purpose: string
  duration: string
  provider: string
  essential: boolean
}

// Configurazione cookie utilizzati nel sito
export const COOKIE_CONFIG: CookieInfo[] = [
  // Cookie necessari (sempre abilitati)
  {
    name: 'cookie-consent',
    category: 'necessary',
    purpose: 'Memorizza le preferenze di consenso cookie dell\'utente',
    duration: '1 anno',
    provider: 'chermaz.com',
    essential: true
  },
  {
    name: 'theme',
    category: 'necessary',
    purpose: 'Memorizza la preferenza di tema (chiaro/scuro)',
    duration: 'Sessione',
    provider: 'chermaz.com',
    essential: true
  },
  
  // Cookie analytics
  {
    name: '_pk_*',
    category: 'analytics',
    purpose: 'Matomo Analytics - statistiche anonime di utilizzo del sito',
    duration: '13 mesi',
    provider: 'statistics.crowdm.it',
    essential: false
  },
  {
    name: '_pk_id.*',
    category: 'analytics',
    purpose: 'Matomo Analytics - identificatore visitatore anonimo',
    duration: '13 mesi',
    provider: 'statistics.crowdm.it',
    essential: false
  },
  {
    name: '_pk_ses.*',
    category: 'analytics',
    purpose: 'Matomo Analytics - informazioni sessione',
    duration: '30 minuti',
    provider: 'statistics.crowdm.it',
    essential: false
  }
]

export const CONSENT_VERSION = '1.0'
export const CONSENT_DURATION_DAYS = 365

/**
 * Carica le preferenze di consenso dal localStorage
 */
export function loadConsent(): CookiePreferences | null {
  try {
    const stored = localStorage.getItem('cookie-consent')
    if (!stored) return null
    
    const consent = JSON.parse(stored) as CookiePreferences
    
    // Verifica se il consenso è ancora valido
    const maxAge = CONSENT_DURATION_DAYS * 24 * 60 * 60 * 1000 // 1 anno in ms
    if (Date.now() - consent.timestamp > maxAge) {
      localStorage.removeItem('cookie-consent')
      return null
    }
    
    return consent
  } catch {
    return null
  }
}

/**
 * Salva le preferenze di consenso nel localStorage
 */
export function saveConsent(preferences: Omit<CookiePreferences, 'timestamp' | 'version'>): void {
  const consent: CookiePreferences = {
    ...preferences,
    necessary: true, // I cookie necessari sono sempre abilitati
    timestamp: Date.now(),
    version: CONSENT_VERSION
  }
  
  localStorage.setItem('cookie-consent', JSON.stringify(consent))
  
  // Applica le preferenze immediatamente
  applyConsent(consent)
}

/**
 * Applica le preferenze di consenso (attiva/disattiva script)
 */
export function applyConsent(consent: CookiePreferences): void {
  // Gestione Analytics (Matomo)
  if (consent.analytics) {
    enableAnalytics()
  } else {
    disableAnalytics()
  }
  
  // Qui si possono aggiungere altri script quando necessario
  // es. Marketing: Google Ads, Facebook Pixel, etc.
}

/**
 * Abilita Matomo Analytics
 */
function enableAnalytics(): void {
  // Se Matomo non è già caricato, lo inizializziamo
  if (typeof window !== 'undefined' && !(window as any)._paq) {
    (window as any)._paq = (window as any)._paq || []
    const _paq = (window as any)._paq
    
    _paq.push(['trackPageView'])
    _paq.push(['enableLinkTracking'])
    
    const u = "https://statistics.crowdm.it/"
    _paq.push(['setTrackerUrl', u + 'matomo.php'])
    _paq.push(['setSiteId', '8'])
    
    const d = document
    const g = d.createElement('script')
    const s = d.getElementsByTagName('script')[0]
    g.async = true
    g.src = u + 'matomo.js'
    s.parentNode?.insertBefore(g, s)
  }
}

/**
 * Disabilita Matomo Analytics
 */
function disableAnalytics(): void {
  if (typeof window !== 'undefined' && (window as any)._paq) {
    // Rimuovi cookie di Matomo
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=")
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
      if (name.startsWith('_pk_')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.chermaz.com`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      }
    })
    
    // Disabilita tracking futuro
    if ((window as any)._paq) {
      (window as any)._paq.push(['optUserOut'])
    }
  }
}

/**
 * Controlla se il consenso è necessario (prima visita o consenso scaduto)
 */
export function needsConsent(): boolean {
  return loadConsent() === null
}

/**
 * Revoca tutto il consenso (tranne i necessari)
 */
export function revokeConsent(): void {
  const defaultConsent: CookiePreferences = {
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: true, // Tema e lingua possono rimanere
    timestamp: Date.now(),
    version: CONSENT_VERSION
  }
  
  localStorage.setItem('cookie-consent', JSON.stringify(defaultConsent))
  applyConsent(defaultConsent)
  
  // Ricarica la pagina per applicare le modifiche
  window.location.reload()
}

/**
 * Accetta tutti i cookie
 */
export function acceptAllCookies(): void {
  saveConsent({
    necessary: true,
    analytics: true,
    marketing: true,
    preferences: true
  })
}

/**
 * Accetta solo i cookie necessari
 */
export function acceptNecessaryOnly(): void {
  saveConsent({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: true
  })
}

/**
 * Ottieni informazioni sui cookie per categoria
 */
export function getCookiesByCategory(category: CookieCategory): CookieInfo[] {
  return COOKIE_CONFIG.filter(cookie => cookie.category === category)
}

/**
 * Inizializza il sistema di consenso al caricamento della pagina
 */
export function initializeConsent(): void {
  const consent = loadConsent()
  if (consent) {
    applyConsent(consent)
  }
}
