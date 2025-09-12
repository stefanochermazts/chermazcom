#!/usr/bin/env node

/**
 * Script per inizializzare la cache analizzando lo stato attuale dei file
 * Usage: node scripts/init-cache.mjs [--dry-run] [--verbose]
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

async function initializeCache(dryRun = false, verbose = false) {
  console.log('🔄 Inizializzazione cache dal stato attuale...')
  
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
  
  // Inizializza cache per file italiani (sorgenti)
  let processedSources = 0
  let processedTranslations = 0
  let processedImages = 0
  
  for (const sourceFile of filesByLang.it) {
    // Aggiorna entry sorgente
    const updated = await cache.updateSourceFile(sourceFile)
    if (updated) {
      processedSources++
      
      // Cerca traduzioni esistenti
      for (const lang of ['en', 'sl']) {
        const translations = filesByLang[lang].filter(f => {
          const info = fileInfo.get(f)
          const source = findSourceFile(f, info.frontmatter, allFiles)
          return source === sourceFile
        })
        
        for (const translatedFile of translations) {
          await cache.markTranslationComplete(sourceFile, lang, translatedFile)
          processedTranslations++
          
          if (verbose) {
            console.log(`   ✅ ${lang.toUpperCase()}: ${path.basename(sourceFile)} → ${path.basename(translatedFile)}`)
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
          console.log(`   🖼️  Immagini: ${path.basename(sourceFile)} → ${imageTypes.join(', ')}`)
        }
      }
    }
  }
  
  console.log('\n📈 Risultati inizializzazione:')
  console.log(`✅ File sorgente processati: ${processedSources}`)
  console.log(`✅ Traduzioni rilevate: ${processedTranslations}`)
  console.log(`✅ Set di immagini rilevati: ${processedImages}`)
  
  // Mostra statistiche finali
  const stats = await cache.getStats()
  console.log('\n📊 Statistiche cache:')
  console.log(`   File totali: ${stats.totalFiles}`)
  console.log(`   Con traduzioni: ${stats.withTranslations}`)
  console.log(`   Con immagini: ${stats.withImages}`)
  console.log(`   Dimensione cache: ${(stats.cacheSize / 1024).toFixed(1)} KB`)
  
  console.log('\n🎉 Cache inizializzata con successo!')
  console.log('\n💡 Ora puoi usare gli script veloci:')
  console.log('   node scripts/translate-mdx-fast.mjs --target=en --dry-run')
  console.log('   node scripts/generate-covers-fast.mjs --dry-run')
}

async function main() {
  const args = parseArgs()
  
  console.log('🚀 Cache Initializer - Chermaz.com')
  console.log('==================================')
  
  if (args.dryRun) {
    console.log('🔍 Modalità DRY RUN - nessuna modifica verrà applicata')
  }
  
  try {
    await initializeCache(args.dryRun, args.verbose)
  } catch (error) {
    console.error('❌ Errore durante inizializzazione:', error.message)
    process.exit(1)
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
