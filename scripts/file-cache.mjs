#!/usr/bin/env node

/**
 * Sistema di cache per tracking dello stato dei file MDX
 * Evita di rileggere file già processati tracciando hash e timestamp
 */

import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_FILE = path.join(__dirname, '.file-cache.json')

// Struttura cache:
// {
//   "src/content/insights/file.mdx": {
//     "lastModified": 1694532000000,
//     "contentHash": "abc123...",
//     "translations": {
//       "en": {
//         "exists": true,
//         "path": "src/content/insights/en-file.mdx",
//         "lastGenerated": 1694532100000
//       },
//       "sl": { ... }
//     },
//     "images": {
//       "cover": {
//         "exists": true,
//         "path": "public/posts/file/cover.webp",
//         "lastGenerated": 1694532200000
//       },
//       "card": { ... },
//       "og": { ... }
//     }
//   }
// }

class FileCache {
  constructor() {
    this.cache = {}
    this.loaded = false
  }

  async load() {
    if (this.loaded) return
    
    try {
      const data = await fs.readFile(CACHE_FILE, 'utf-8')
      this.cache = JSON.parse(data)
    } catch (error) {
      // File non esiste o corrotto, inizia con cache vuota
      this.cache = {}
    }
    this.loaded = true
  }

  async save() {
    await fs.writeFile(CACHE_FILE, JSON.stringify(this.cache, null, 2))
  }

  // Calcola hash del contenuto file
  async getFileHash(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return crypto.createHash('md5').update(content).digest('hex')
    } catch {
      return null
    }
  }

  // Ottieni timestamp modifica file
  async getFileTimestamp(filePath) {
    try {
      const stats = await fs.stat(filePath)
      return stats.mtime.getTime()
    } catch {
      return null
    }
  }

  // Verifica se file esiste fisicamente
  async fileExists(filePath) {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  // Aggiorna entry cache per un file sorgente
  async updateSourceFile(filePath) {
    await this.load()
    
    const relativePath = path.relative(process.cwd(), filePath)
    const hash = await this.getFileHash(filePath)
    const timestamp = await this.getFileTimestamp(filePath)
    
    if (!hash || !timestamp) return false

    if (!this.cache[relativePath]) {
      this.cache[relativePath] = {
        translations: {},
        images: {}
      }
    }

    this.cache[relativePath].lastModified = timestamp
    this.cache[relativePath].contentHash = hash
    
    return true
  }

  // Controlla se il file sorgente è cambiato
  async hasSourceChanged(filePath) {
    await this.load()
    
    const relativePath = path.relative(process.cwd(), filePath)
    const cached = this.cache[relativePath]
    
    if (!cached) return true // Non in cache = cambiato
    
    const currentHash = await this.getFileHash(filePath)
    const currentTimestamp = await this.getFileTimestamp(filePath)
    
    return (
      !currentHash ||
      !currentTimestamp ||
      cached.contentHash !== currentHash ||
      cached.lastModified !== currentTimestamp
    )
  }

  // Segna traduzione come completata
  async markTranslationComplete(sourceFile, targetLang, translatedPath) {
    await this.load()
    await this.updateSourceFile(sourceFile)
    
    const relativePath = path.relative(process.cwd(), sourceFile)
    const relativeTranslatedPath = path.relative(process.cwd(), translatedPath)
    
    if (!this.cache[relativePath].translations[targetLang]) {
      this.cache[relativePath].translations[targetLang] = {}
    }
    
    this.cache[relativePath].translations[targetLang] = {
      exists: true,
      path: relativeTranslatedPath,
      lastGenerated: Date.now()
    }
    
    await this.save()
  }

  // Controlla se traduzione esiste ed è aggiornata
  async isTranslationUpToDate(sourceFile, targetLang) {
    await this.load()
    
    // Se il file sorgente è cambiato, traduzione non aggiornata
    if (await this.hasSourceChanged(sourceFile)) {
      return { upToDate: false, reason: 'source_changed' }
    }
    
    const relativePath = path.relative(process.cwd(), sourceFile)
    const cached = this.cache[relativePath]
    
    if (!cached || !cached.translations[targetLang]) {
      return { upToDate: false, reason: 'not_translated' }
    }
    
    const translation = cached.translations[targetLang]
    
    // Verifica che il file tradotto esista fisicamente
    if (!await this.fileExists(translation.path)) {
      return { upToDate: false, reason: 'file_missing' }
    }
    
    return { upToDate: true, path: translation.path }
  }

  // Segna immagini come completate
  async markImagesComplete(sourceFile, imageTypes = ['cover', 'card', 'og']) {
    await this.load()
    await this.updateSourceFile(sourceFile)
    
    const relativePath = path.relative(process.cwd(), sourceFile)
    const baseSlug = path.basename(sourceFile, path.extname(sourceFile))
    
    for (const type of imageTypes) {
      const imagePath = `public/posts/${baseSlug}/${type}.webp`
      
      if (!this.cache[relativePath].images[type]) {
        this.cache[relativePath].images[type] = {}
      }
      
      this.cache[relativePath].images[type] = {
        exists: true,
        path: imagePath,
        lastGenerated: Date.now()
      }
    }
    
    await this.save()
  }

  // Controlla se immagini esistono ed sono aggiornate
  async areImagesUpToDate(sourceFile, imageTypes = ['cover', 'card', 'og']) {
    await this.load()
    
    // Se il file sorgente è cambiato, immagini potrebbero non essere aggiornate
    if (await this.hasSourceChanged(sourceFile)) {
      return { upToDate: false, reason: 'source_changed' }
    }
    
    const relativePath = path.relative(process.cwd(), sourceFile)
    const cached = this.cache[relativePath]
    
    if (!cached || !cached.images) {
      return { upToDate: false, reason: 'not_generated' }
    }
    
    // Controlla ogni tipo di immagine
    for (const type of imageTypes) {
      const imageInfo = cached.images[type]
      
      if (!imageInfo || !imageInfo.exists) {
        return { upToDate: false, reason: `missing_${type}` }
      }
      
      // Verifica che il file immagine esista fisicamente
      if (!await this.fileExists(imageInfo.path)) {
        return { upToDate: false, reason: `file_missing_${type}` }
      }
    }
    
    return { upToDate: true }
  }

  // Ottieni lista di file che necessitano traduzione
  async getFilesNeedingTranslation(sourceFiles, targetLang) {
    const needed = []
    
    for (const file of sourceFiles) {
      const result = await this.isTranslationUpToDate(file, targetLang)
      if (!result.upToDate) {
        needed.push({
          file,
          reason: result.reason
        })
      }
    }
    
    return needed
  }

  // Ottieni lista di file che necessitano immagini
  async getFilesNeedingImages(sourceFiles, imageTypes = ['cover', 'card', 'og']) {
    const needed = []
    
    for (const file of sourceFiles) {
      const result = await this.areImagesUpToDate(file, imageTypes)
      if (!result.upToDate) {
        needed.push({
          file,
          reason: result.reason
        })
      }
    }
    
    return needed
  }

  // Pulisci cache per file che non esistono più
  async cleanup() {
    await this.load()
    
    const toDelete = []
    
    for (const [filePath, entry] of Object.entries(this.cache)) {
      if (!await this.fileExists(filePath)) {
        toDelete.push(filePath)
      }
    }
    
    for (const filePath of toDelete) {
      delete this.cache[filePath]
    }
    
    if (toDelete.length > 0) {
      await this.save()
      console.log(`🧹 Rimossi ${toDelete.length} file dalla cache`)
    }
  }

  // Statistiche cache
  async getStats() {
    await this.load()
    
    const total = Object.keys(this.cache).length
    let withTranslations = 0
    let withImages = 0
    
    for (const entry of Object.values(this.cache)) {
      if (entry.translations && Object.keys(entry.translations).length > 0) {
        withTranslations++
      }
      if (entry.images && Object.keys(entry.images).length > 0) {
        withImages++
      }
    }
    
    return {
      totalFiles: total,
      withTranslations,
      withImages,
      cacheSize: JSON.stringify(this.cache).length
    }
  }

  // Reset completo cache
  async reset() {
    this.cache = {}
    await this.save()
  }
}

export default FileCache

// CLI per gestire la cache
if (import.meta.url === `file://${process.argv[1]}`) {
  const cache = new FileCache()
  const command = process.argv[2]
  
  switch (command) {
    case 'stats':
      const stats = await cache.getStats()
      console.log('📊 Statistiche cache:')
      console.log(`   File totali: ${stats.totalFiles}`)
      console.log(`   Con traduzioni: ${stats.withTranslations}`)
      console.log(`   Con immagini: ${stats.withImages}`)
      console.log(`   Dimensione cache: ${(stats.cacheSize / 1024).toFixed(1)} KB`)
      break
      
    case 'cleanup':
      await cache.cleanup()
      break
      
    case 'reset':
      await cache.reset()
      console.log('🗑️  Cache resettata')
      break
      
    default:
      console.log('Utilizzo: node scripts/file-cache.mjs [stats|cleanup|reset]')
  }
}
