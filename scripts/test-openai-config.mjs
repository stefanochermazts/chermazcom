#!/usr/bin/env node

/**
 * Script per testare la configurazione OpenAI
 */

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Carica variabili .env se esiste
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log('📄 File .env trovato e caricato')
} else {
  console.log('⚠️  File .env non trovato nella root del progetto')
}

function testOpenAIConfig() {
  console.log('🔍 Test Configurazione OpenAI\n')
  
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY non trovata')
    console.log('🔧 Configurazione richiesta:')
    console.log('   1. Locale: aggiungi OPENAI_API_KEY al file .env')
    console.log('   2. Netlify: aggiungi la variabile nel dashboard o via CLI')
    console.log('      netlify env:set OPENAI_API_KEY sk-your-key-here')
    process.exit(1)
  }
  
  // Verifica formato chiave
  if (!apiKey.startsWith('sk-')) {
    console.log('⚠️  Formato chiave OpenAI non valido')
    console.log('   Le chiavi OpenAI iniziano con "sk-"')
    process.exit(1)
  }
  
  // Verifica lunghezza
  if (apiKey.length < 20) {
    console.log('⚠️  Chiave OpenAI troppo corta')
    process.exit(1)
  }
  
  console.log('✅ OPENAI_API_KEY configurata correttamente')
  console.log(`   Formato: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`)
  console.log(`   Lunghezza: ${apiKey.length} caratteri`)
  
  // Test ambiente
  console.log('\n📊 Informazioni ambiente:')
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'non impostato'}`)
  console.log(`   PWD: ${process.env.PWD || 'non disponibile'}`)
  
  console.log('\n🎯 Pronto per utilizzare il playground!')
}

testOpenAIConfig()
