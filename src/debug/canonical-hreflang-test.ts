/**
 * Test script per verificare canonical e hreflang URLs
 * 
 * Per eseguire il test:
 * node --loader ts-node/esm src/debug/canonical-hreflang-test.ts
 */

import { getAlternateUrls, getLocalizedRoute, removeLocaleFromPath, addLocaleToPath } from '../utils/i18n'

// Test paths per diverse tipologie di pagine
const testPaths = [
  // Homepage
  '/it/',
  '/en/',
  '/sl/',
  
  // Static pages
  '/it/chi-sono/',
  '/en/about/',
  '/sl/o-meni/',
  
  '/it/servizi/',
  '/en/services/',
  '/sl/storitve/',
  
  '/it/privacy/',
  '/en/privacy/',
  '/sl/zasebnost/',
  
  '/it/cookie-policy/',
  '/en/cookie-policy/',
  '/sl/cookie-policy/',
  
  // Collection pages
  '/it/insights/',
  '/en/insights/',
  '/sl/insights/',
  
  '/it/case-studies/',
  '/en/case-studies/',
  '/sl/case-studies/',
  
  // Dynamic content (examples)
  '/it/insights/test-article/',
  '/en/insights/test-article/',
  '/sl/insights/test-article/',
  
  '/it/insights/categoria/microsoft365/',
  '/en/insights/categoria/microsoft365/',
  '/sl/insights/categoria/microsoft365/',
  
  '/it/case-studies/test-case/',
  '/en/case-studies/test-case/',
  '/sl/case-studies/test-case/',
]

console.log('🔍 Testing Canonical & Hreflang URLs\n')
console.log('=' .repeat(80))

testPaths.forEach(path => {
  console.log(`\n📄 Testing path: ${path}`)
  console.log('-'.repeat(40))
  
  try {
    const alternateUrls = getAlternateUrls(path)
    
    console.log('🔗 Alternate URLs:')
    Object.entries(alternateUrls).forEach(([lang, url]) => {
      console.log(`  ${lang.padEnd(10)}: ${url}`)
    })
    
    // Test della rimozione del locale
    const cleanPath = removeLocaleFromPath(path)
    console.log(`🧹 Clean path: ${cleanPath}`)
    
    // Test di localizzazione per ogni lingua
    console.log('🌍 Localized routes:')
    const locales = ['it', 'en', 'sl'] as const
    locales.forEach(locale => {
      const localizedRoute = getLocalizedRoute(cleanPath, locale)
      console.log(`  ${locale}: ${localizedRoute}`)
    })
    
  } catch (error) {
    console.error(`❌ Error processing ${path}:`, error)
  }
})

console.log('\n' + '='.repeat(80))
console.log('✅ Test completed!')

// Test specifici per edge cases
console.log('\n🧪 Edge Cases Tests:')
console.log('-'.repeat(40))

const edgeCases = [
  '/',           // Root without locale
  '/it',         // Without trailing slash
  '/insights',   // Collection without locale
  '/chi-sono',   // Localized path without locale prefix
]

edgeCases.forEach(path => {
  console.log(`\nEdge case: ${path}`)
  try {
    const cleanPath = removeLocaleFromPath(path)
    const alternateUrls = getAlternateUrls(path)
    console.log(`  Clean: ${cleanPath}`)
    console.log(`  IT URL: ${alternateUrls.it}`)
    console.log(`  EN URL: ${alternateUrls.en}`)
    console.log(`  SL URL: ${alternateUrls.sl}`)
    console.log(`  Default: ${alternateUrls['x-default']}`)
  } catch (error) {
    console.error(`  ❌ Error:`, error)
  }
})

export {}
