import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'
import sharp from 'sharp'
import matter from 'gray-matter'
import slugify from 'slugify'

// Configurazione
const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(ROOT, '..')
const CONTENT_DIR = path.join(PROJECT_ROOT, 'src', 'content', 'case-studies')
const POSTS_DIR = path.join(PROJECT_ROOT, 'public', 'case-studies')

/** Prompt specifico per case studies */
const buildPrompt = (title, sector, tags) => {
  const tagText = tags ? tags.join(', ') : ''
  return `Una illustrazione professionale per un case study aziendale. Titolo: "${title}". Settore: ${sector || 'Business'}. Tecnologie: ${tagText}. Stile: vettoriale flat, moderno, minimalista. Palette: #164cd6 e #1f63ff con toni neutri pastello. Niente testo, watermark o persone realistiche. Elementi iconici del settore/tech in primo piano. Sfondo pulito, composizione bilanciata 16:9.`
}

const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function log(msg) {
  process.stdout.write(`${msg}\n`)
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

async function createImagesForFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = matter(raw)

  if (!isItalianContent(parsed)) {
    log(`➡️  Skip lang!=it → ${path.basename(filePath)}`)
    return
  }

  const title = parsed.data.title || path.basename(filePath, path.extname(filePath))
  const slug = parsed.data.slug || slugify(title, { lower: true, strict: true })
  const sector = parsed.data.sector || 'Business'
  const tags = parsed.data.tags || []
  
  const postDir = path.join(POSTS_DIR, slug)
  ensureDir(postDir)

  const coverPath = path.join(postDir, 'cover.webp')
  const ogPath = path.join(postDir, 'og.webp')
  const cardPath = path.join(postDir, 'card.webp')

  const hasCover = fs.existsSync(coverPath)
  const hasOg = fs.existsSync(ogPath)
  const hasCard = fs.existsSync(cardPath)

  // Se tutti i file esistono già, aggiorna solo il frontmatter se mancante
  if (hasCover && hasOg && hasCard) {
    let changed = false
    const desiredImage = `/case-studies/${slug}/card.webp`
    const desiredOg = `/case-studies/${slug}/og.webp`
    if (parsed.data.image !== desiredImage) {
      parsed.data.image = desiredImage
      changed = true
    }
    if (parsed.data.ogImage !== desiredOg) {
      parsed.data.ogImage = desiredOg
      changed = true
    }
    if (changed) {
      fs.writeFileSync(filePath, matter.stringify(parsed.content, parsed.data))
      log(`✍️  Frontmatter aggiornato senza rigenerare → ${slug} (image=${parsed.data.image}, ogImage=${parsed.data.ogImage})`)
    } else {
      log(`➡️  Skip (tutte le immagini già esistenti) ${slug}`)
    }
    return
  }

  // Genera solo i file mancanti
  const needsGeneration = !hasCover || !hasOg || !hasCard
  let baseBuffer = null
  
  if (needsGeneration) {
    log(`🎨 Genero immagine case study con OpenAI → ${slug}`)
    const prompt = buildPrompt(title, sector, tags)
    log(`📝 Prompt: ${prompt.substring(0, 100)}...`)
    
    try {
      const res = await ai.images.generate({ 
        model: 'dall-e-3', 
        prompt, 
        size: '1024x1024',
        response_format: 'b64_json'
      })
      log(`📡 OpenAI response status: ${res.status || 'N/A'}`)
      log(`📡 OpenAI data length: ${res.data?.length || 0}`)
      
      const b64 = res.data?.[0]?.b64_json
      if (!b64) {
        log(`❌ OpenAI response debug:`)
        log(JSON.stringify(res, null, 2))
        throw new Error('Nessuna immagine ricevuta da OpenAI')
      }
      baseBuffer = Buffer.from(b64, 'base64')
      log(`✅ Immagine base ricevuta (${baseBuffer.length} bytes)`)
    } catch (error) {
      log(`❌ OpenAI API error details:`)
      log(`Error message: ${error.message}`)
      log(`Error status: ${error.status}`)
      log(`Error code: ${error.code}`)
      if (error.response) {
        log(`Response status: ${error.response.status}`)
        log(`Response data: ${JSON.stringify(error.response.data, null, 2)}`)
      }
      throw error
    }
  }

  if (!hasCover && baseBuffer) {
    await sharp(baseBuffer).resize(1600, 900, { fit: 'cover' }).webp({ quality: 92 }).toFile(coverPath)
    log(`✅ Cover creata: /case-studies/${slug}/cover.webp`)
  }
  if (!hasOg && baseBuffer) {
    await sharp(baseBuffer).resize(1200, 630, { fit: 'cover' }).webp({ quality: 92 }).toFile(ogPath)
    log(`✅ OG creata: /case-studies/${slug}/og.webp`)
  }
  if (!hasCard && baseBuffer) {
    await sharp(baseBuffer).resize(800, 600, { fit: 'cover' }).webp({ quality: 90 }).toFile(cardPath)
    log(`✅ Card creata: /case-studies/${slug}/card.webp`)
  }

  // Preferisci card.webp come image; se non esiste, fallback su cover.webp
  parsed.data.image = fs.existsSync(cardPath)
    ? `/case-studies/${slug}/card.webp`
    : (fs.existsSync(coverPath) ? `/case-studies/${slug}/cover.webp` : parsed.data.image)
  
  parsed.data.ogImage = `/case-studies/${slug}/og.webp`

  fs.writeFileSync(filePath, matter.stringify(parsed.content, parsed.data))
  log(`✍️  Frontmatter scritto/aggiornato → ${slug} (image=${parsed.data.image}, ogImage=${parsed.data.ogImage || '—'})`)
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('Errore: variabile OPENAI_API_KEY non impostata')
    process.exit(1)
  }
  
  log(`🔑 OpenAI API Key found: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`)
  
  // Test quick API connection
  try {
    const testRes = await ai.models.list()
    log(`✅ OpenAI API connection test passed`)
  } catch (error) {
    log(`❌ OpenAI API connection test failed:`)
    log(`Error: ${error.message}`)
    if (error.status) log(`Status: ${error.status}`)
    process.exit(1)
  }

  ensureDir(POSTS_DIR)

  const files = getAllMdxFiles(CONTENT_DIR)
  log(`Trovati ${files.length} file MD/MDX in case-studies (IT-only)`) // IT-only

  for (const file of files) {
    try {
      await createImagesForFile(file)
    } catch (err) {
      console.error(`❌ Errore per ${file}:`, err.message)
    }
  }
}

main()
