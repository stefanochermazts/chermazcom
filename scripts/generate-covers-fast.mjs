#!/usr/bin/env node

/**
 * Script ottimizzato per generare immagini usando cache per evitare riletture
 * Usage: node scripts/generate-covers-fast.mjs [--dry-run] [--sample=5] [--force] [--verbose]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'
import sharp from 'sharp'
import matter from 'gray-matter'
import FileCache from './file-cache.mjs'

const cache = new FileCache()

// Configurazione
const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(ROOT, '..')
const CONTENT_DIR = path.join(PROJECT_ROOT, 'src', 'content', 'insights')
const POSTS_DIR = path.join(PROJECT_ROOT, 'public', 'posts')

const buildPrompt = (title) => `Una singola illustrazione vettoriale, stile flat, minimale e professionale, senza testo e senza watermark. Palette primaria: #164cd6 e #1f63ff, con toni pastello neutri. Soggetto centrale leggibile anche in piccolo. Tema: ${title}. Sfondo semplice/chiaro, niente persone realistiche. Inquadratura 16:9-safe, soggetto centrato.`

const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function log(msg) {
  process.stdout.write(`${msg}\n`)
}

function parseArgs() {
  const args = {
    dryRun: false,
    sample: null,
    force: false,
    verbose: false
  }

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--sample=')) {
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

function getAllMdxFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => (f.endsWith('.md') || f.endsWith('.mdx')) && !/^en-|^sl-/.test(f)) // solo IT
    .map((f) => path.join(dir, f))
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function isItalianContent(parsed) {
  if (!parsed?.data) return true
  if (!parsed.data.lang) return true
  return String(parsed.data.lang).toLowerCase() === 'it'
}

async function generateImage(prompt, outputPath, format = 'webp', quality = 80) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY non configurata')
  }

  try {
    // Genera immagine con DALL-E
    const response = await ai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024', // 16:9 aspect ratio
      quality: 'standard',
      response_format: 'url'
    })

    const imageUrl = response.data[0]?.url
    if (!imageUrl) {
      throw new Error('Nessuna URL immagine ricevuta')
    }

    // Scarica immagine
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Errore download: ${imageResponse.status}`)
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer())

    // Processa con Sharp e salva
    await sharp(buffer)
      .webp({ quality })
      .toFile(outputPath)

    return { success: true, path: outputPath }

  } catch (error) {
    throw new Error(`Errore generazione immagine: ${error.message}`)
  }
}

async function createImagesForFile(filePath, dryRun = false, verbose = false) {
  const startTime = Date.now()
  
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = matter(raw)

    // Verifica che sia contenuto italiano
    if (!isItalianContent(parsed)) {
      if (verbose) {
        log(`➡️  Skip lang!=it → ${path.basename(filePath)}`)
      }
      return { success: true, skipped: true, reason: 'not_italian' }
    }

    const { title } = parsed.data
    if (!title) {
      throw new Error('Titolo mancante nel frontmatter')
    }

    // Genera slug per cartella
    const slug = path.basename(filePath, path.extname(filePath))
    const outputDir = path.join(POSTS_DIR, slug)
    
    const variants = [
      { name: 'cover', size: [1200, 675], quality: 85 },    // 16:9 per hero
      { name: 'card', size: [600, 400], quality: 80 },     // 3:2 per card
      { name: 'og', size: [1200, 630], quality: 85 }       // Open Graph
    ]

    if (verbose) {
      log(`🎨 Generando immagini per: ${title}`)
    }

    if (dryRun) {
      log(`[DRY RUN] Immagini per ${slug}: ${variants.map(v => v.name).join(', ')}`)
      return { success: true, dryRun: true, variants: variants.length }
    }

    // Crea cartella output
    ensureDir(outputDir)

    // Genera prompt
    const prompt = buildPrompt(title)
    
    // Genera immagine master con DALL-E
    const masterPath = path.join(outputDir, 'master.webp')
    await generateImage(prompt, masterPath)

    // Crea varianti ridimensionate
    const results = []
    for (const variant of variants) {
      const variantPath = path.join(outputDir, `${variant.name}.webp`)
      
      await sharp(masterPath)
        .resize(variant.size[0], variant.size[1], {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: variant.quality })
        .toFile(variantPath)
      
      results.push({ name: variant.name, path: variantPath })
    }

    // Rimuovi file master
    fs.unlinkSync(masterPath)

    // Aggiorna cache
    await cache.markImagesComplete(filePath, variants.map(v => v.name))

    const duration = Date.now() - startTime
    log(`✅ ${slug} → ${variants.length} immagini (${duration}ms)`)

    return { 
      success: true, 
      slug, 
      variants: results,
      duration 
    }

  } catch (error) {
    log(`❌ Errore ${path.basename(filePath)}: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function main() {
  const args = parseArgs()
  
  console.log('🎨 Fast Cover Generator con cache')
  console.log('================================')
  
  if (args.dryRun) {
    console.log('🔍 Modalità DRY RUN - nessuna immagine verrà generata')
  }
  
  if (args.force) {
    console.log('⚡ Modalità FORCE - ignora cache')
  }

  // Trova tutti i file sorgente
  const sourceFiles = getAllMdxFiles(CONTENT_DIR)
  console.log(`📁 Trovati ${sourceFiles.length} file MDX`)

  // Determina quali file necessitano immagini
  let filesToProcess
  if (args.force) {
    filesToProcess = sourceFiles.map(file => ({ file, reason: 'forced' }))
  } else {
    filesToProcess = await cache.getFilesNeedingImages(sourceFiles)
  }

  if (filesToProcess.length === 0) {
    console.log('✅ Tutte le immagini sono aggiornate!')
    return
  }

  console.log(`📋 ${filesToProcess.length} file necessitano immagini:`)
  for (const { file, reason } of filesToProcess.slice(0, 5)) {
    console.log(`   - ${path.basename(file)} (${reason})`)
  }
  if (filesToProcess.length > 5) {
    console.log(`   ... e altri ${filesToProcess.length - 5} file`)
  }

  // Applica campionamento se richiesto
  let finalFiles = filesToProcess
  if (args.sample) {
    finalFiles = filesToProcess.slice(0, args.sample)
    console.log(`🎯 Processando solo ${finalFiles.length} file (sample)`)
  }

  // Genera immagini
  const results = { success: 0, failed: 0, skipped: 0, totalTime: 0, totalImages: 0 }

  for (const { file } of finalFiles) {
    const result = await createImagesForFile(file, args.dryRun, args.verbose)

    if (result.success) {
      if (result.skipped) {
        results.skipped++
      } else {
        results.success++
        if (result.duration) results.totalTime += result.duration
        if (result.variants) results.totalImages += result.variants.length
      }
    } else {
      results.failed++
    }

    // Pausa per evitare rate limiting su DALL-E
    if (!args.dryRun && !result.skipped) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  // Report finale
  console.log('\n📊 Risultati:')
  console.log(`✅ Successi: ${results.success}`)
  console.log(`➡️  Saltati: ${results.skipped}`)
  console.log(`❌ Fallimenti: ${results.failed}`)
  console.log(`🖼️  Immagini totali: ${results.totalImages}`)
  
  if (results.success > 0 && results.totalTime > 0) {
    console.log(`⏱️  Tempo medio: ${Math.round(results.totalTime / results.success)}ms per file`)
  }

  // Statistiche cache
  if (args.verbose) {
    const cacheStats = await cache.getStats()
    console.log('\n📈 Cache stats:')
    console.log(`   File in cache: ${cacheStats.totalFiles}`)
    console.log(`   Con immagini: ${cacheStats.withImages}`)
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
