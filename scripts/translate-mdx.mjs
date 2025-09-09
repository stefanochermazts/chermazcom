#!/usr/bin/env node

/**
 * Script per tradurre automaticamente file MDX usando OpenAI
 * Usage: node scripts/translate-mdx.mjs [--target=en|sl] [--collection=insights|case-studies|pages] [--dry-run] [--sample=5]
 */

import fs from 'fs/promises'
import path from 'path'
import OpenAI from 'openai'
import { glob } from 'glob'

// Configurazione
const CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini', // Più economico e veloce per traduzioni
  maxTokens: 4000,
  temperature: 0.3, // Bassa per traduzioni più consistenti
  rateLimitDelay: 1000, // 1 secondo tra chiamate
}

// Mapping lingue
const LANGUAGES = {
  en: {
    name: 'English',
    prefix: 'en-',
    code: 'en'
  },
  sl: {
    name: 'Slovenian',
    prefix: 'sl-',
    code: 'sl'
  }
}

class MDXTranslator {
  constructor(dryRun = false) {
    if (!CONFIG.apiKey && !dryRun) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    
    if (CONFIG.apiKey) {
      this.openai = new OpenAI({ apiKey: CONFIG.apiKey })
    }
    this.processedCount = 0
    this.errorCount = 0
    this.skippedCount = 0
    this.dryRun = dryRun
  }

  /**
   * Estrae e separa frontmatter dal contenuto
   */
  parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)
    
    if (!match) {
      return { frontmatter: '', content: content.trim() }
    }
    
    return {
      frontmatter: match[1].trim(),
      content: match[2].trim()
    }
  }

  /**
   * Traduce il frontmatter preservando la struttura
   */
  async translateFrontmatter(frontmatter, targetLang, sourceSlug) {
    const lines = frontmatter.split('\n')
    const translatedLines = []
    
    for (const line of lines) {
      if (line.includes('title:') || line.includes('excerpt:')) {
        // Estrai il valore da tradurre
        const [key, ...valueParts] = line.split(':')
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '')
        
        if (value && value !== '""' && value !== "''") {
          try {
            const translatedValue = await this.translateText(value, targetLang)
            translatedLines.push(`${key}: "${translatedValue.replace(/"/g, '\\"')}"`)
          } catch (error) {
            console.warn(`⚠️  Errore traduzione frontmatter: ${error.message}`)
            translatedLines.push(line) // Mantieni originale in caso di errore
          }
        } else {
          translatedLines.push(line)
        }
      } else if (line.includes('slug:')) {
        // Aggiorna lo slug con il prefisso della lingua
        const [key, ...slugParts] = line.split(':')
        const originalSlug = slugParts.join(':').trim()
        const newSlug = `${LANGUAGES[targetLang].prefix}${sourceSlug}`
        translatedLines.push(`${key}: ${newSlug}`)
      } else if (line.includes('lang:')) {
        // Aggiorna la lingua
        translatedLines.push(`lang: ${targetLang}`)
      } else {
        // Mantieni la riga originale per altri campi
        translatedLines.push(line)
      }
      
      // Rate limiting per API calls
      await this.delay(100)
    }
    
    return translatedLines.join('\n')
  }

  /**
   * Traduce testo usando OpenAI
   */
  async translateText(text, targetLang) {
    const languageName = LANGUAGES[targetLang].name
    
    const prompt = `Translate the following text to ${languageName}. 
Maintain the same tone, technical terminology, and formatting. 
For technical terms like "Microsoft 365", "SharePoint", "AI", keep them in original language.
Do not translate code snippets, URLs, or HTML tags.

Text to translate:
${text}`

    try {
      const response = await this.openai.chat.completions.create({
        model: CONFIG.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature,
      })

      return response.choices[0].message.content.trim()
    } catch (error) {
      if (error.status === 429) {
        console.log('⏳ Rate limit hit, waiting 5 seconds...')
        await this.delay(5000)
        return this.translateText(text, targetLang) // Retry
      }
      throw error
    }
  }

  /**
   * Traduce contenuto MDX preservando structure
   */
  async translateMDXContent(content, targetLang) {
    // Divide il contenuto in chunks per gestire file lunghi
    const chunks = this.splitIntoChunks(content, 2000)
    const translatedChunks = []

    for (const chunk of chunks) {
      try {
        const translated = await this.translateText(chunk, targetLang)
        translatedChunks.push(translated)
        await this.delay(CONFIG.rateLimitDelay)
      } catch (error) {
        console.warn(`⚠️  Errore traduzione chunk: ${error.message}`)
        translatedChunks.push(chunk) // Fallback al contenuto originale
      }
    }

    return translatedChunks.join('\n\n')
  }

  /**
   * Divide testo in chunks rispettando paragrafi
   */
  splitIntoChunks(text, maxLength) {
    if (text.length <= maxLength) return [text]
    
    const paragraphs = text.split('\n\n')
    const chunks = []
    let currentChunk = ''
    
    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = paragraph
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim())
    return chunks
  }

  /**
   * Processa un singolo file
   */
  async processFile(filePath, targetLang, dryRun = false, force = false) {
    try {
      console.log(`📄 Processing: ${filePath}`)
      
      // Leggi file originale
      const content = await fs.readFile(filePath, 'utf-8')
      const { frontmatter, content: bodyContent } = this.parseFrontmatter(content)
      
      // Determina slug originale
      const fileName = path.basename(filePath, '.mdx')
      const sourceSlug = fileName
      
      // Determina percorso di destinazione
      const dir = path.dirname(filePath)
      const targetFileName = `${LANGUAGES[targetLang].prefix}${fileName}.mdx`
      const targetPath = path.join(dir, targetFileName)
      
      // Controlla se il file target esiste già
      try {
        await fs.access(targetPath)
        if (!force) {
          console.log(`   ⏭️  Skip: ${targetFileName} already exists (use --force to overwrite)`)
          this.skippedCount++
          return
        } else {
          console.log(`   🔄 Overwrite: ${targetFileName} (--force enabled)`)
        }
      } catch {
        // File non esiste, continua
      }
      
      if (dryRun) {
        console.log(`   🔍 Would create: ${targetPath}`)
        return
      }
      
      // Traduci frontmatter
      console.log(`   🔄 Translating frontmatter...`)
      const rawTranslatedFrontmatter = await this.translateFrontmatter(frontmatter, targetLang, sourceSlug)
      
      // Pulisci il frontmatter da possibili delimitatori che l'API potrebbe aver aggiunto
      const translatedFrontmatter = rawTranslatedFrontmatter.replace(/^---\s*\n?/, '').replace(/\n?---\s*$/, '')
      
      // Traduci contenuto
      console.log(`   🔄 Translating content...`)
      const translatedContent = await this.translateMDXContent(bodyContent, targetLang)
      
      // Pulisci il contenuto tradotto da possibili --- all'inizio
      const cleanContent = translatedContent.replace(/^---\s*\n\s*---\s*\n\s*/, '').replace(/^---\s*\n\s*/, '')
      
      // Costruisci file finale
      const finalContent = `---\n${translatedFrontmatter}\n---\n\n${cleanContent}`
      
      // Scrivi file tradotto
      await fs.writeFile(targetPath, finalContent, 'utf-8')
      
      console.log(`   ✅ Created: ${targetFileName}`)
      this.processedCount++
      
    } catch (error) {
      console.error(`   ❌ Error processing ${filePath}: ${error.message}`)
      this.errorCount++
    }
  }

  /**
   * Delay utility
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Esegue traduzione batch
   */
  async translateBatch(options = {}) {
    const {
      target = 'en',
      collection = 'all',
      dryRun = false,
      sample = null,
      force = false
    } = options

    console.log(`🚀 Starting MDX Translation`)
    console.log(`   Target: ${LANGUAGES[target].name}`)
    console.log(`   Collection: ${collection}`)
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
    console.log(`   Sample: ${sample || 'all files'}`)
    console.log(`   Force overwrite: ${force ? 'YES' : 'NO'}`)
    console.log('')

    // Trova file da tradurre
    let pattern = 'src/content/**/*.mdx'
    if (collection !== 'all') {
      pattern = `src/content/${collection}/*.mdx`
    }
    
    const allFiles = await glob(pattern)
    
    // Filtra file che NON hanno prefisso lingua (sono originali italiani)
    const sourceFiles = allFiles.filter(file => {
      const fileName = path.basename(file)
      return !fileName.startsWith('en-') && !fileName.startsWith('sl-')
    })
    
    // Applica sample se specificato
    const filesToProcess = sample ? sourceFiles.slice(0, sample) : sourceFiles
    
    console.log(`📊 Found ${sourceFiles.length} source files, processing ${filesToProcess.length}`)
    console.log(`📁 Files to process:`)
    filesToProcess.forEach(file => console.log(`   - ${file}`))
    console.log('')
    
    // Processa file
    for (const file of filesToProcess) {
      await this.processFile(file, target, dryRun, force)
      
      // Piccola pausa tra file per essere gentili con l'API
      await this.delay(500)
    }
    
    // Report finale
    console.log('')
    console.log(`📊 Translation Complete!`)
    console.log(`   ✅ Processed: ${this.processedCount}`)
    console.log(`   ⏭️  Skipped: ${this.skippedCount}`)
    console.log(`   ❌ Errors: ${this.errorCount}`)
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2)
  const options = {}
  
  // Parse arguments
  for (const arg of args) {
    if (arg.startsWith('--target=')) {
      options.target = arg.split('=')[1]
    } else if (arg.startsWith('--collection=')) {
      options.collection = arg.split('=')[1]
    } else if (arg.startsWith('--sample=')) {
      options.sample = parseInt(arg.split('=')[1])
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--force') {
      options.force = true
    }
  }
  
  // Validation
  if (options.target && !LANGUAGES[options.target]) {
    console.error(`❌ Invalid target language: ${options.target}`)
    console.error(`Available: ${Object.keys(LANGUAGES).join(', ')}`)
    process.exit(1)
  }
  
  try {
    const translator = new MDXTranslator(options.dryRun)
    await translator.translateBatch(options)
  } catch (error) {
    console.error(`❌ Translation failed: ${error.message}`)
    process.exit(1)
  }
}

// Execute
main().catch(console.error)
