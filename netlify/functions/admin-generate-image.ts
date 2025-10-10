import type { Handler } from '@netlify/functions'
import OpenAI from 'openai'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

/**
 * Admin Generate Image Function
 * Genera un'immagine cover per l'articolo usando DALL-E 3
 */

interface GenerateImageRequest {
  title: string
  slug: string
  customPrompt?: string
  filePath?: string // percorso relativo dell'articolo MDX da aggiornare
}

export const handler: Handler = async (event) => {
  // Verifica autenticazione
  const token = event.headers['x-admin-token']
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, error: 'Non autenticato' })
    }
  }

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { title, slug, customPrompt, filePath }: GenerateImageRequest = JSON.parse(event.body || '{}')

    if (!title || !slug) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Titolo e slug sono obbligatori'
        })
      }
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'OpenAI API key non configurata'
        })
      }
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    // Genera il prompt per DALL-E
    const prompt = customPrompt || `
Create a modern, professional blog cover image for an article titled "${title}".
Style: Clean, minimalist, tech-focused with subtle gradients.
Colors: Blue and purple tones, professional look.
Elements: Abstract tech shapes, subtle geometric patterns.
No text or typography in the image.
Aspect ratio: 16:9, suitable for web article header.
    `.trim()

    console.log('Generating image with DALL-E 3...')

    // Genera l'immagine con DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024', // 16:9 aspect ratio
      quality: 'standard',
      style: 'natural'
    })

    const imageUrl = response.data[0]?.url
    if (!imageUrl) {
      throw new Error('Nessuna immagine generata da DALL-E')
    }

    console.log('Image generated, downloading...')

    // Scarica l'immagine
    const imageResponse = await fetch(imageUrl)
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Ottimizza l'immagine con Sharp (ridimensiona e comprimi)
    const optimizedImage = await sharp(imageBuffer)
      .resize(1200, 675, { // 16:9, dimensione ottimale per web
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toBuffer()

    // Salva nella directory public/images/covers
    const coversDir = path.join(process.cwd(), 'public', 'images', 'covers')
    await fs.mkdir(coversDir, { recursive: true })

    const fileName = `${slug}-cover.jpg`
    const coverFilePath = path.join(coversDir, fileName)

    await fs.writeFile(coverFilePath, optimizedImage)

    const publicPath = `/images/covers/${fileName}`

    console.log(`Image saved: ${publicPath}`)

    // Se è stato passato un filePath dell'articolo, aggiorna il frontmatter e inserisci il BreakoutImage in cima
    try {
      if (filePath) {
        const absPath = path.join(process.cwd(), filePath)
        let text = await fs.readFile(absPath, 'utf8')

        // Inserisci/aggiorna frontmatter image/ogImage
        if (text.startsWith('---')) {
          const end = text.indexOf('\n---', 3)
          if (end !== -1) {
            const head = text.slice(0, end + 4)
            const body = text.slice(end + 4)

            // Aggiorna chiavi image/ogImage (semplice sostituzione se presenti, altrimenti append in fondo al frontmatter)
            let fm = head
            if (/\nimage:\s*/.test(fm)) fm = fm.replace(/\nimage:\s*.*/,'\nimage: ' + publicPath)
            else fm = fm.replace(/---\s*$/m, `image: ${publicPath}\n---`)

            if (/\nogImage:\s*/.test(fm)) fm = fm.replace(/\nogImage:\s*.*/,'\nogImage: ' + publicPath)
            else fm = fm.replace(/---\s*$/m, `ogImage: ${publicPath}\n---`)

            // Inserisci BreakoutImage subito dopo il frontmatter se non presente
            const breakout = `<BreakoutImage src="${publicPath}" alt="Cover" />\n\n`
            const hasBreakout = /<BreakoutImage\b/.test(body)
            const importLine = "import BreakoutImage from '../../components/BreakoutImage.astro'\n\n"
            const hasImport = /BreakoutImage\.astro/.test(text)
            const newBody = (hasImport ? '' : importLine) + (hasBreakout ? '' : breakout) + body

            text = fm + newBody
            await fs.writeFile(absPath, text, 'utf8')
          }
        }
      }
    } catch {}

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Immagine generata con successo',
        imagePath: publicPath,
        fileName,
        size: {
          width: 1200,
          height: 675
        }
      })
    }
  } catch (error) {
    console.error('Image generation error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Errore generazione immagine'
      })
    }
  }
}



