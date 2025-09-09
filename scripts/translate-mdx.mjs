#!/usr/bin/env node

/**
 * Script per tradurre automaticamente file MDX usando OpenAI
 * Usage: node scripts/translate-mdx.mjs [--target=en|sl] [--collection=insights|case-studies|pages] [--dry-run] [--sample=5]
 */

import fs from 'fs/promises'
import path from 'path'
import OpenAI from 'openai'
import { glob } from 'glob'
import yaml from 'js-yaml'

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

async function findExistingTranslation(dir, targetLang, sourceRelative, sourceSlug) {
  const prefix = LANGUAGES[targetLang].prefix
  const candidates = await glob(path.join(dir, `${prefix}*.mdx`).replace(/\\/g, '/'))
  for (const cand of candidates) {
    try {
      const raw = await fs.readFile(cand, 'utf-8')
      const m = raw.match(/^---\n([\s\S]*?)\n---/)
      if (!m) continue
      const fm = yaml.load(m[1]) || {}
      if (fm.sourceFile === sourceRelative || fm.sourceSlug === sourceSlug) {
        return cand
      }
    } catch {
      // ignore
    }
  }
  return null
}

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
  parseFrontmatter(contentRaw) {
    // Normalizza EOL e BOM
    const content = contentRaw.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '')
    // Regex compatibile con CRLF/LF (dopo normalizzazione bastano \n)
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)
    
    if (!match) {
      // Nessun frontmatter valido
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
  async translateFrontmatter(frontmatter, targetLang, sourceSlug, sourceRelative) {
    // Parse YAML
    let obj = {}
    try {
      obj = yaml.load(frontmatter) || {}
    } catch (e) {
      // fallback: linea per linea come prima
      const lines = frontmatter.split('\n')
      const translatedLines = []
      for (const line of lines) {
        if (line.includes('title:') || line.includes('excerpt:')) {
          const [key, ...valueParts] = line.split(':')
          const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '')
          if (value && value !== '""' && value !== "''") {
            try {
              const translatedValue = await this.translateText(value, targetLang)
              translatedLines.push(`${key}: "${translatedValue.replace(/"/g, '\\"')}"`)
            } catch {
              translatedLines.push(line)
            }
          } else {
            translatedLines.push(line)
          }
        } else if (line.includes('slug:')) {
          const [key] = line.split(':')
          const newSlug = `${LANGUAGES[targetLang].prefix}${sourceSlug}`
          translatedLines.push(`${key}: ${newSlug}`)
        } else if (line.includes('lang:')) {
          translatedLines.push(`lang: ${targetLang}`)
        } else {
          translatedLines.push(line)
        }
        await this.delay(50)
      }
      // aggiungi tracking sorgente
      translatedLines.push(`sourceFile: ${sourceRelative}`)
      translatedLines.push(`sourceSlug: ${sourceSlug}`)
      translatedLines.push(`sourceLang: it`)
      return translatedLines.join('\n')
    }

    // Flags per preservare stile block scalar
    const hadExcerptBlock = /(\n|^)excerpt:\s*>-/.test(frontmatter)
    const hadDescriptionBlock = /(\n|^)description:\s*>-/.test(frontmatter)

    // Traduci campi
    const translateIf = async (key) => {
      if (obj[key]) {
        const value = String(obj[key])
        if (value.trim()) {
          obj[key] = await this.translateText(value, targetLang)
        }
      }
    }
    await translateIf('title')
    await translateIf('excerpt')
    await translateIf('description')

    // Aggiorna slug/lang e tracking origine
    obj.slug = `${LANGUAGES[targetLang].prefix}${sourceSlug}`
    obj.lang = targetLang
    obj.sourceFile = sourceRelative
    obj.sourceSlug = sourceSlug
    obj.sourceLang = 'it'

    // Dump YAML
    let dumped = yaml.dump(obj, { lineWidth: 120, noRefs: true })

    // Reinserisci excerpt/description in block scalar se prima erano tali e sono multi-line
    const toBlock = (key, text) => {
      const lines = String(text).split('\n').map(l => `  ${l}`).join('\n')
      return `${key}: >-\n${lines}\n`
    }

    if (hadExcerptBlock && obj.excerpt && String(obj.excerpt).includes('\n')) {
      dumped = dumped.replace(/^excerpt:\s*[\s\S]*?(?=^\w|\Z)/m, '')
      dumped = dumped.trimEnd() + '\n' + toBlock('excerpt', obj.excerpt)
    }
    if (hadDescriptionBlock && obj.description && String(obj.description).includes('\n')) {
      dumped = dumped.replace(/^description:\s*[\s\S]*?(?=^\w|\Z)/m, '')
      dumped = dumped.trimEnd() + '\n' + toBlock('description', obj.description)
    }

    if (!dumped.endsWith('\n')) dumped += '\n'
    return dumped.trimEnd()
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
Do not add or wrap content in code fences (no triple backticks).
Return raw MDX content only, without leading or trailing fences.

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
   * Traduzione "safe" del body: preserva code fences e blocchi JSX/MDX
   */
  async translateBodySafe(body, targetLang) {
    const EOL = '\n'
    const text = body.replace(/\r\n/g, '\n')

    // Segmenta in blocchi separati da doppie newline, mantenendo code fences come blocchi interi
    const blocks = []
    let i = 0
    const lines = text.split('\n')
    let inFence = false
    let fenceLang = ''
    let buffer = []

    const flush = () => {
      if (buffer.length) {
        blocks.push(buffer.join(EOL))
        buffer = []
      }
    }

    for (const line of lines) {
      const fenceOpen = line.match(/^```([a-zA-Z0-9_-]*)\s*$/)
      if (!inFence && fenceOpen) {
        // inizio fence: flush del blocco precedente
        flush()
        inFence = true
        fenceLang = fenceOpen[1] || ''
        buffer.push(line)
        continue
      }
      if (inFence) {
        buffer.push(line)
        if (/^```\s*$/.test(line)) {
          // fine fence
          flush()
          inFence = false
          fenceLang = ''
        }
        continue
      }
      // Non in fence: raccogli linee. Separatore di paragrafi: riga vuota
      if (line.trim() === '') {
        buffer.push(line)
        flush()
        continue
      }
      buffer.push(line)
    }
    flush()

    // Funzione per rilevare blocchi con JSX/MDX: presenza di tag <Tag ...> o </Tag>
    const hasJSX = (block) => /<\/?[A-Za-z][A-Za-z0-9_.-]*[^>]*>/.test(block)

    const translatedBlocks = []
    for (const block of blocks) {
      // Salta blocchi vuoti
      if (!block.trim()) {
        translatedBlocks.push(block)
        continue
      }
      // Code fence: preserva
      if (/^```[\s\S]*```\s*$/.test(block.trim())) {
        translatedBlocks.push(block)
        continue
      }
      // JSX/MDX: preserva
      if (hasJSX(block)) {
        translatedBlocks.push(block)
        continue
      }
      // Altrimenti traduci il blocco testuale
      try {
        const t = await this.translateText(block, targetLang)
        translatedBlocks.push(t)
        await this.delay(CONFIG.rateLimitDelay)
      } catch (e) {
        console.warn(`⚠️  Errore traduzione blocco: ${e.message}`)
        translatedBlocks.push(block)
      }
    }

    return translatedBlocks.join(EOL + EOL)
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
      
      // Leggi file originale e normalizza EOL/BOM
      let raw = await fs.readFile(filePath, 'utf-8')
      raw = raw.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '')
      const { frontmatter, content: bodyContent } = this.parseFrontmatter(raw)
      
      // Se il frontmatter non è stato trovato, non procedere per evitare blocchi vuoti
      if (!frontmatter) {
        throw new Error('Frontmatter not found or malformed')
      }
      
      // Determina slug originale
      const fileName = path.basename(filePath, '.mdx')
      const sourceSlug = fileName
      const sourceRelative = path.relative('src/content', filePath).replace(/\\/g, '/')
      
      // Determina percorso di destinazione base (verrà eventualmente sostituito)
      const dir = path.dirname(filePath)

      // Se esiste già una traduzione per questa sorgente, gestisci skip/overwrite
      const existing = await findExistingTranslation(dir, targetLang, sourceRelative, sourceSlug)
      if (existing && !force) {
        console.log(`   ⏭️  Skip: existing translation found (${existing})`)
        this.skippedCount++
        return
      }

      // Traduci frontmatter (con tracking origine incluso)
      console.log(`   🔄 Translating frontmatter...`)
      const rawTranslatedFrontmatter = await this.translateFrontmatter(frontmatter, targetLang, sourceSlug, sourceRelative)
      
      // Pulisci il frontmatter da possibili delimitatori che l'API potrebbe aver aggiunto
      let translatedFrontmatter = rawTranslatedFrontmatter
        .replace(/^---\s*\n?/, '')
        .replace(/\n?---\s*$/, '')
        .trim()
      
      // Fallback: se vuoto, usa l'originale
      if (!translatedFrontmatter) {
        translatedFrontmatter = frontmatter.trim()
      }

      // Estrai titolo tradotto per creare slug SEO
      let translatedTitle = ''
      try {
        const fmObj = yaml.load(translatedFrontmatter) || {}
        translatedTitle = String(fmObj.title || '')
      } catch {
        const m = translatedFrontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m)
        translatedTitle = m ? m[1] : ''
      }

      // Determina se è una pagina statica (pages)
      const isPages = sourceRelative.startsWith('pages/')

      // Base per slug/filename
      let finalBase
      if (isPages) {
        // Non tradurre slug/filename: aggiungi solo prefisso lingua all'originale
        let originalSlugBase = ''
        try {
          const origFm = yaml.load(frontmatter) || {}
          originalSlugBase = String(origFm.slug || sourceSlug)
        } catch {
          originalSlugBase = sourceSlug
        }
        originalSlugBase = originalSlugBase.replace(/^en-|^sl-/, '')
        finalBase = `${LANGUAGES[targetLang].prefix}${originalSlugBase}`
      } else {
        // Insights / case-studies: slug/filename SEO dal titolo tradotto
        const translatedBase = slugify(translatedTitle) || slugify(sourceSlug)
        finalBase = `${LANGUAGES[targetLang].prefix}${translatedBase}`
      }

      // Definisci file di destinazione: se esiste una traduzione e force, aggiornala in place
      let targetFileName
      let targetPath
      if (existing && force) {
        targetPath = existing
        targetFileName = path.basename(existing)
      } else {
        targetFileName = `${finalBase}.mdx`
        targetPath = path.join(dir, targetFileName)
        let n = 2
        while (await pathExists(targetPath)) {
          targetFileName = `${finalBase}-${n}.mdx`
          targetPath = path.join(dir, targetFileName)
          n++
        }
      }

      // Sincronizza slug e lang nel frontmatter senza perdere il formato
      const slugLineRe = /^(slug:\s*).+$/m
      const langLineRe = /^(lang:\s*).+$/m
      if (slugLineRe.test(translatedFrontmatter)) {
        translatedFrontmatter = translatedFrontmatter.replace(slugLineRe, `$1${finalBase}`)
      } else {
        translatedFrontmatter = `slug: ${finalBase}\n` + translatedFrontmatter
      }
      if (langLineRe.test(translatedFrontmatter)) {
        translatedFrontmatter = translatedFrontmatter.replace(langLineRe, `$1${targetLang}`)
      } else {
        translatedFrontmatter = translatedFrontmatter + `\nlang: ${targetLang}`
      }
      translatedFrontmatter = translatedFrontmatter.trim()

      // Traduci contenuto
      console.log(`   🔄 Translating content...`)
      // Estrai eventuali import/export all'inizio del body per non tradurli
      const bodyLines = bodyContent.split('\n')
      const preserved = []
      let startIdx = 0
      for (let i = 0; i < bodyLines.length; i++) {
        const line = bodyLines[i]
        if (line.trim().startsWith('import ') || line.trim().startsWith('export ') || line.trim() === '') {
          preserved.push(line)
          startIdx = i + 1
          continue
        }
        break
      }
      const headerImports = preserved.join('\n').trim()
      const bodyToTranslate = bodyLines.slice(startIdx).join('\n')

      // Traduzione "safe": preserva code fences e blocchi JSX/MDX
      const translatedContentRaw = await this.translateBodySafe(bodyToTranslate, targetLang)
      
      // Pulisci eventuale code fence iniziale inserito dal modello
      let translatedContent = translatedContentRaw
      translatedContent = translatedContent.replace(/^```[a-zA-Z]*\n([\s\S]*?)\n```(?:\n|$)/, '$1')
      
      // Pulisci il contenuto tradotto da un eventuale blocco frontmatter iniziale
      let cleanContent = translatedContent
        // Rimuovi blocco completo --- ... --- all'inizio (se presente)
        .replace(/^---\n[\s\S]*?\n---\n/s, '')
        // Rimuovi sequenze di --- vuote
        .replace(/^---\s*\n\s*---\s*\n/, '')
        .replace(/^---\s*\n/, '')
        .trim()
      
      // Ricostruisci il body con gli import preservati in testa
      const preservedBlock = headerImports ? headerImports + '\n\n' : ''
      const finalBody = preservedBlock + cleanContent
      
      // Costruisci file finale
      const finalContent = `---\n${translatedFrontmatter}\n---\n\n${finalBody}`
      
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
