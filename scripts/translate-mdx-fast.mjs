#!/usr/bin/env node

/**
 * Script ottimizzato per tradurre file MDX usando cache per evitare riletture
 * Usage: node scripts/translate-mdx-fast.mjs [--target=en|sl] [--collection=insights|case-studies|pages] [--dry-run] [--sample=5] [--force]
 */

import fs from 'fs/promises'
import path from 'path'
import OpenAI from 'openai'
import { glob } from 'glob'
import yaml from 'js-yaml'
import FileCache from './file-cache.mjs'

const cache = new FileCache()

function slugify(input) {
  return String(input || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

async function pathExists(p) {
  try { await fs.access(p); return true } catch { return false }
}

// Configurazione
const CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
  maxTokens: 4000,
  temperature: 0.7
}

const LANGUAGES = {
  en: {
    name: 'English',
    prefix: 'en-',
    prompt: 'Translate the following MDX content from Italian to English. Maintain the exact same structure, frontmatter fields, and MDX components. Only translate the text content, keeping all technical terms, code examples, and component syntax unchanged:'
  },
  sl: {
    name: 'Slovenian', 
    prefix: 'sl-',
    prompt: 'Translate the following MDX content from Italian to Slovenian. Maintain the exact same structure, frontmatter fields, and MDX components. Only translate the text content, keeping all technical terms, code examples, and component syntax unchanged:'
  }
}

function parseArgs() {
  const args = {
    targetLang: 'en',
    collection: 'insights',
    dryRun: false,
    sample: null,
    force: false,
    verbose: false
  }

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--target=')) {
      args.targetLang = arg.split('=')[1]
    } else if (arg.startsWith('--collection=')) {
      args.collection = arg.split('=')[1]
    } else if (arg.startsWith('--sample=')) {
      args.sample = parseInt(arg.split('=')[1])
    } else if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--force') {
      args.force = true
    } else if (arg === '--verbose') {
      args.verbose = true
    }
  }

  return args
}

async function findAllSourceFiles(collection) {
  const contentDir = path.join(process.cwd(), 'src', 'content', collection)
  const pattern = path.join(contentDir, '*.mdx').replace(/\\/g, '/')
  const files = await glob(pattern)
  
  // Filtra solo file italiani (senza prefisso en- o sl-)
  return files.filter(file => {
    const basename = path.basename(file)
    return !basename.startsWith('en-') && !basename.startsWith('sl-')
  })
}

async function translateContent(content, targetLang) {
  if (!CONFIG.apiKey) {
    throw new Error('OPENAI_API_KEY non configurata')
  }

  const openai = new OpenAI({ apiKey: CONFIG.apiKey })
  const prompt = LANGUAGES[targetLang].prompt

  try {
    const response = await openai.chat.completions.create({
      model: CONFIG.model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: content }
      ],
      max_tokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('❌ Errore OpenAI:', error.message)
    throw error
  }
}

async function updateSlugInContent(content, newSlug) {
  // Aggiorna slug nel frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!frontmatterMatch) return content

  const frontmatter = yaml.load(frontmatterMatch[1]) || {}
  frontmatter.slug = newSlug
  
  const updatedFrontmatter = yaml.dump(frontmatter, { 
    lineWidth: -1, 
    quotingType: '"' 
  }).trim()
  
  return `---\n${updatedFrontmatter}\n---\n${frontmatterMatch[2]}`
}

async function translateFile(sourceFile, targetLang, dryRun = false, verbose = false) {
  const startTime = Date.now()
  
  try {
    // Leggi file sorgente
    const content = await fs.readFile(sourceFile, 'utf-8')
    
    // Estrai informazioni dal frontmatter originale
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) {
      throw new Error('Frontmatter non trovato')
    }
    
    const originalFrontmatter = yaml.load(frontmatterMatch[1]) || {}
    const originalSlug = originalFrontmatter.slug || path.basename(sourceFile, '.mdx')
    
    // Genera slug tradotto
    const prefix = LANGUAGES[targetLang].prefix
    const targetSlug = `${prefix}${originalSlug}`
    
    // Genera path file tradotto
    const sourceDir = path.dirname(sourceFile)
    const targetFile = path.join(sourceDir, `${targetSlug}.mdx`)
    
    if (verbose) {
      console.log(`📝 Traducendo: ${path.basename(sourceFile)} → ${path.basename(targetFile)}`)
    }
    
    if (dryRun) {
      console.log(`[DRY RUN] ${sourceFile} → ${targetFile}`)
      return { success: true, targetFile, duration: Date.now() - startTime }
    }
    
    // Traduci contenuto
    const translatedContent = await translateContent(content, targetLang)
    if (!translatedContent) {
      throw new Error('Traduzione vuota ricevuta da OpenAI')
    }
    
    // Aggiorna slug nel contenuto tradotto
    const finalContent = await updateSlugInContent(translatedContent, targetSlug)
    
    // Scrivi file tradotto
    await fs.writeFile(targetFile, finalContent, 'utf-8')
    
    // Aggiorna cache
    await cache.markTranslationComplete(sourceFile, targetLang, targetFile)
    
    const duration = Date.now() - startTime
    console.log(`✅ ${path.basename(sourceFile)} → ${targetLang} (${duration}ms)`)
    
    return { success: true, targetFile, duration }
    
  } catch (error) {
    console.error(`❌ Errore traducendo ${path.basename(sourceFile)}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  const args = parseArgs()
  
  console.log('🚀 Fast MDX Translator con cache')
  console.log('================================')
  console.log(`Target: ${LANGUAGES[args.targetLang].name}`)
  console.log(`Collection: ${args.collection}`)
  
  if (args.dryRun) {
    console.log('🔍 Modalità DRY RUN - nessun file verrà modificato')
  }
  
  if (args.force) {
    console.log('⚡ Modalità FORCE - ignora cache')
  }
  
  // Trova tutti i file sorgente
  const sourceFiles = await findAllSourceFiles(args.collection)
  console.log(`📁 Trovati ${sourceFiles.length} file sorgente`)
  
  // Determina quali file necessitano traduzione
  let filesToTranslate
  if (args.force) {
    filesToTranslate = sourceFiles.map(file => ({ file, reason: 'forced' }))
  } else {
    filesToTranslate = await cache.getFilesNeedingTranslation(sourceFiles, args.targetLang)
  }
  
  if (filesToTranslate.length === 0) {
    console.log('✅ Tutte le traduzioni sono aggiornate!')
    return
  }
  
  console.log(`📋 ${filesToTranslate.length} file necessitano traduzione:`)
  for (const { file, reason } of filesToTranslate.slice(0, 5)) {
    console.log(`   - ${path.basename(file)} (${reason})`)
  }
  if (filesToTranslate.length > 5) {
    console.log(`   ... e altri ${filesToTranslate.length - 5} file`)
  }
  
  // Applica campionamento se richiesto
  let finalFiles = filesToTranslate
  if (args.sample) {
    finalFiles = filesToTranslate.slice(0, args.sample)
    console.log(`🎯 Processando solo ${finalFiles.length} file (sample)`)
  }
  
  // Processa traduzioni
  const results = { success: 0, failed: 0, totalTime: 0 }
  
  for (const { file } of finalFiles) {
    const result = await translateFile(file, args.targetLang, args.dryRun, args.verbose)
    
    if (result.success) {
      results.success++
      results.totalTime += result.duration
    } else {
      results.failed++
    }
    
    // Pausa breve per evitare rate limiting
    if (!args.dryRun) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  // Report finale
  console.log('\n📊 Risultati:')
  console.log(`✅ Successi: ${results.success}`)
  console.log(`❌ Fallimenti: ${results.failed}`)
  if (results.success > 0 && results.totalTime > 0) {
    console.log(`⏱️  Tempo medio: ${Math.round(results.totalTime / results.success)}ms per file`)
  }
  
  // Statistiche cache
  if (args.verbose) {
    const cacheStats = await cache.getStats()
    console.log('\n📈 Cache stats:')
    console.log(`   File in cache: ${cacheStats.totalFiles}`)
    console.log(`   Con traduzioni: ${cacheStats.withTranslations}`)
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
