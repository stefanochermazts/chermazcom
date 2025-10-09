import type { Handler } from '@netlify/functions'
import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'yaml'

/**
 * Admin Save Article Function
 * Salva un nuovo articolo nel filesystem locale
 * Solo per sviluppo locale (Netlify Dev)
 */

interface ArticleData {
  contentType: 'insights' | 'case-studies' | 'pages'
  title: string
  slug: string
  excerpt: string
  description?: string
  categories?: string[]
  tags?: string[]
  content: string
  status: 'draft' | 'publish'
  lang: string
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
    const data: ArticleData = JSON.parse(event.body || '{}')

    // Validazione base
    if (!data.title || !data.slug || !data.excerpt || !data.content) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Campi obbligatori mancanti: title, slug, excerpt, content'
        })
      }
    }

    // Genera il frontmatter
    const frontmatter = {
      title: data.title,
      slug: data.slug,
      lang: data.lang || 'it',
      status: data.status || 'draft',
      excerpt: data.excerpt,
      ...(data.description && { description: data.description }),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      ...(data.categories && data.categories.length > 0 && { categories: data.categories }),
      ...(data.tags && data.tags.length > 0 && { tags: data.tags })
    }

    // Serializza frontmatter
    const yamlFrontmatter = yaml.stringify(frontmatter).trim()

    // Costruisci il contenuto completo del file MDX
    const mdxContent = `---
${yamlFrontmatter}
---

${data.content.trim()}
`

    // Determina il percorso del file
    const contentDir = path.join(process.cwd(), 'src', 'content', data.contentType)
    const fileName = `${data.slug}.mdx`
    const filePath = path.join(contentDir, fileName)

    // Verifica se esiste già
    try {
      await fs.access(filePath)
      return {
        statusCode: 409,
        body: JSON.stringify({
          success: false,
          error: `File già esistente: ${fileName}. Usa un altro slug.`
        })
      }
    } catch {
      // File non esiste, ok per continuare
    }

    // Crea la directory se non esiste
    await fs.mkdir(contentDir, { recursive: true })

    // Salva il file
    await fs.writeFile(filePath, mdxContent, 'utf-8')

    const relativePath = `src/content/${data.contentType}/${fileName}`

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Articolo salvato con successo',
        filePath: relativePath,
        fullPath: filePath
      })
    }
  } catch (error) {
    console.error('Save article error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      })
    }
  }
}



