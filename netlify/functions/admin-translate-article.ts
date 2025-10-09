import type { Handler } from '@netlify/functions'
import { spawn } from 'node:child_process'
import path from 'node:path'

/**
 * Admin Translate Article Function
 * Traduce un articolo usando lo script translate-one.mjs esistente
 */

interface TranslateRequest {
  filePath: string
  targetLang: 'en' | 'sl'
  force?: boolean
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
    const { filePath, targetLang, force }: TranslateRequest = JSON.parse(event.body || '{}')

    if (!filePath || !targetLang) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'filePath e targetLang sono obbligatori'
        })
      }
    }

    if (!['en', 'sl'].includes(targetLang)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'targetLang deve essere "en" o "sl"'
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

    // Costruisci il path completo al file
    const fullPath = path.join(process.cwd(), filePath)
    
    // Costruisci il path allo script di traduzione
    const scriptPath = path.join(process.cwd(), 'scripts', 'translate-one.mjs')

    console.log(`Translating ${filePath} to ${targetLang}...`)

    // Esegui lo script di traduzione
    const result = await executeTranslationScript(
      scriptPath,
      fullPath,
      targetLang,
      OPENAI_API_KEY,
      force
    )

    if (result.success) {
      // Calcola il path del file tradotto
      const fileName = path.basename(filePath, '.mdx')
      const dir = path.dirname(filePath)
      const translatedFileName = `${targetLang}-${fileName}.mdx`
      const translatedPath = path.join(dir, translatedFileName)

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          message: `Traduzione in ${targetLang.toUpperCase()} completata`,
          translatedPath,
          output: result.output
        })
      }
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: result.error || 'Errore durante la traduzione',
          output: result.output
        })
      }
    }
  } catch (error) {
    console.error('Translation error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Errore traduzione'
      })
    }
  }
}

/**
 * Esegue lo script di traduzione come processo separato
 */
function executeTranslationScript(
  scriptPath: string,
  filePath: string,
  targetLang: string,
  apiKey: string,
  force?: boolean
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const args = ['--file', filePath, '--to', targetLang]
    if (force) {
      args.push('--force')
    }

    const childProcess = spawn('node', [scriptPath, ...args], {
      env: {
        ...process.env,
        OPENAI_API_KEY: apiKey,
        I18N_OPENAI_MODEL: process.env.I18N_OPENAI_MODEL || 'gpt-4o-mini'
      },
      cwd: process.cwd()
    })

    let stdout = ''
    let stderr = ''

    childProcess.stdout.on('data', (data) => {
      const output = data.toString()
      stdout += output
      console.log(output)
    })

    childProcess.stderr.on('data', (data) => {
      const output = data.toString()
      stderr += output
      console.error(output)
    })

    childProcess.on('close', (code) => {
      const output = stdout + (stderr ? `\n\nErrors:\n${stderr}` : '')

      if (code === 0) {
        resolve({
          success: true,
          output
        })
      } else {
        resolve({
          success: false,
          output,
          error: `Script terminato con codice ${code}`
        })
      }
    })

    childProcess.on('error', (error) => {
      resolve({
        success: false,
        output: stdout,
        error: error.message
      })
    })
  })
}



