#!/usr/bin/env node

/**
 * Script per inizializzare forzatamente la cache considerando TUTTE le traduzioni esistenti come aggiornate
 * Usa questo quando sai che tutte le traduzioni sono corrette e non vuoi ri-tradurre
 * Usage: node scripts/force-init-cache.mjs [--dry-run] [--verbose]
 */

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'
import matter from 'gray-matter'
import FileCache from './file-cache.mjs'

const cache = new FileCache()

function parseArgs() {
  const args = {
    dryRun: false,
    verbose: false
  }

  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--verbose') {
      args.verbose = true
    }
  }

  return args
}

async function findAllMdxFiles() {
  const collections = ['insights', 'case-studies', 'pages']
  const allFiles = []
  
  for (const collection of collections) {
    const contentDir = path.join(process.cwd(), 'src', 'content', collection)
    const pattern = path.join(contentDir, '*.mdx').replace(/\\/g, '/')
    
    try {
      const files = await glob(pattern)
      allFiles.push(...files)
    } catch (error) {
      console.log(`⚠️  Collection ${collection} non trovata`)
    }
  }
  
  return allFiles
}

function getLanguageFromFile(filePath, frontmatter) {
  const basename = path.basename(filePath)
  
  // Determina lingua dal filename o frontmatter
  if (basename.startsWith('en-')) return 'en'
  if (basename.startsWith('sl-')) return 'sl'
  if (frontmatter.lang === 'en') return 'en'
  if (frontmatter.lang === 'sl') return 'sl'
  return 'it' // default
}

function findSourceFile(translatedFile, frontmatter, allFiles) {
  // Se ha sourceFile nel frontmatter, usalo
  if (frontmatter.sourceFile) {
    const sourcePath = path.resolve(process.cwd(), frontmatter.sourceFile)
    if (allFiles.some(f => path.resolve(f) === sourcePath)) {
      return frontmatter.sourceFile
    }
  }
  
  // Se ha sourceSlug, cerca file con quello slug
  if (frontmatter.sourceSlug) {
    const dir = path.dirname(translatedFile)
    const sourceFile = path.join(dir, `${frontmatter.sourceSlug}.mdx`)
    if (allFiles.includes(sourceFile)) {
      return sourceFile
    }
  }
  
  // Fallback: rimuovi prefisso lingua dal nome file
  const basename = path.basename(translatedFile)
  if (basename.startsWith('en-') || basename.startsWith('sl-')) {
    const originalName = basename.replace(/^(en-|sl-)/, '')
    const dir = path.dirname(translatedFile)
    const sourceFile = path.join(dir, originalName)
    if (allFiles.includes(sourceFile)) {
      return sourceFile
    }
  }
  
  return null
}

async function findExistingImages(sourceFile) {
  const slug = path.basename(sourceFile, path.extname(sourceFile))
  const imagesDir = path.join(process.cwd(), 'public', 'posts', slug)
  
  const imageTypes = ['cover', 'card', 'og']
  const existingImages = {}
  
  for (const type of imageTypes) {
    const imagePath = path.join(imagesDir, `${type}.webp`)
    try {
      await fs.access(imagePath)
      existingImages[type] = true
    } catch {
      existingImages[type] = false
    }
  }
  
  return existingImages
}

async function forceInitializeCache(dryRun = false, verbose = false) {
  console.log('🔄 Inizializzazione FORZATA della cache...')
  console.log('⚠️  Tutte le traduzioni esistenti saranno considerate AGGIORNATE')
  
  // Trova tutti i file MDX
  const allFiles = await findAllMdxFiles()
  console.log(`📁 Trovati ${allFiles.length} file MDX totali`)
  
  // Separa per lingua
  const filesByLang = { it: [], en: [], sl: [] }
  const fileInfo = new Map()
  
  for (const file of allFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      const { data: frontmatter } = matter(content)
      const lang = getLanguageFromFile(file, frontmatter)
      
      filesByLang[lang].push(file)
      fileInfo.set(file, { frontmatter, lang })
      
      if (verbose) {
        console.log(`   ${lang.toUpperCase()}: ${path.basename(file)}`)
      }
    } catch (error) {
      console.log(`⚠️  Errore leggendo ${file}: ${error.message}`)
    }
  }
  
  console.log(`📊 File per lingua: IT=${filesByLang.it.length}, EN=${filesByLang.en.length}, SL=${filesByLang.sl.length}`)
  
  if (dryRun) {
    console.log('\n🔍 [DRY RUN] - Nessuna modifica applicata')
    return
  }
  
  // Reset cache per partire puliti
  await cache.reset()
  console.log('🗑️  Cache resettata')
  
  let processedSources = 0
  let processedTranslations = 0
  let processedImages = 0
  
  // Elabora ogni file italiano (sorgente)
  for (const sourceFile of filesByLang.it) {
    if (verbose) {
      console.log(`\n📝 Processando: ${path.basename(sourceFile)}`)
    }
    
    // FORZA aggiornamento hash/timestamp per file sorgente
    // Questo fa sì che la cache consideri il file come "base" corrente
    const updated = await cache.updateSourceFile(sourceFile)
    if (updated) {
      processedSources++
      
      // Cerca traduzioni esistenti per questo file
      for (const lang of ['en', 'sl']) {
        const translations = filesByLang[lang].filter(f => {
          const info = fileInfo.get(f)
          const source = findSourceFile(f, info.frontmatter, allFiles)
          return source === sourceFile
        })
        
        for (const translatedFile of translations) {
          // FORZA il marking come completato
          await cache.markTranslationComplete(sourceFile, lang, translatedFile)
          processedTranslations++
          
          if (verbose) {
            console.log(`   ✅ ${lang.toUpperCase()}: ${path.basename(translatedFile)}`)
          }
        }
      }
      
      // Cerca immagini esistenti
      const existingImages = await findExistingImages(sourceFile)
      const hasImages = Object.values(existingImages).some(exists => exists)
      
      if (hasImages) {
        const imageTypes = Object.entries(existingImages)
          .filter(([_, exists]) => exists)
          .map(([type, _]) => type)
        
        await cache.markImagesComplete(sourceFile, imageTypes)
        processedImages++
        
        if (verbose) {
          console.log(`   🖼️  Immagini: ${imageTypes.join(', ')}`)
        }
      }
    }
  }
  
  // STEP CRITICO: Ora forza l'aggiornamento degli hash per tutti i file sorgente
  // in modo che la cache li consideri come "versione corrente"
  console.log('\n🔧 Forzando sincronizzazione hash per tutti i file sorgente...')
  
  for (const sourceFile of filesByLang.it) {
    // Re-calcola e salva hash corrente come "baseline"
    await cache.updateSourceFile(sourceFile)
  }
  
  console.log('\n📈 Risultati inizializzazione FORZATA:')
  console.log(`✅ File sorgente processati: ${processedSources}`)
  console.log(`✅ Traduzioni FORZATE come aggiornate: ${processedTranslations}`)
  console.log(`✅ Set di immagini rilevati: ${processedImages}`)
  
  // Mostra statistiche finali
  const stats = await cache.getStats()
  console.log('\n📊 Statistiche cache:')
  console.log(`   File totali: ${stats.totalFiles}`)
  console.log(`   Con traduzioni: ${stats.withTranslations}`)
  console.log(`   Con immagini: ${stats.withImages}`)
  console.log(`   Dimensione cache: ${(stats.cacheSize / 1024).toFixed(1)} KB`)
  
  console.log('\n🎉 Cache FORZATA inizializzata con successo!')
  console.log('🔒 Tutte le traduzioni esistenti sono ora considerate AGGIORNATE')
  console.log('\n💡 Verifica con:')
  console.log('   node scripts/translate-mdx-fast.mjs --target=en --dry-run')
  console.log('   node scripts/generate-covers-fast.mjs --dry-run')
}

async function main() {
  const args = parseArgs()
  
  console.log('🚀 FORCE Cache Initializer - Chermaz.com')
  console.log('========================================')
  
  if (args.dryRun) {
    console.log('🔍 Modalità DRY RUN - nessuna modifica verrà applicata')
  }
  
  console.log('⚠️  ATTENZIONE: Questo script considera TUTTE le traduzioni esistenti come corrette e aggiornate')
  console.log('⚠️  Usa questo solo se sei sicuro che non vuoi ri-tradurre nulla')
  
  try {
    await forceInitializeCache(args.dryRun, args.verbose)
  } catch (error) {
    console.error('❌ Errore durante inizializzazione forzata:', error.message)
    process.exit(1)
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
