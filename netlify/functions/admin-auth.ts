import type { Handler } from '@netlify/functions'

/**
 * Admin Authentication Function
 * Verifica la password admin e restituisce un token di sessione
 */

export const handler: Handler = async (event) => {
  // Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { password } = JSON.parse(event.body || '{}')
    
    // Leggi la password admin dalle variabili d'ambiente
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
    
    if (!password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Password richiesta' })
      }
    }

    // Verifica password
    if (password === ADMIN_PASSWORD) {
      // Genera un token semplice (in produzione usa JWT)
      const token = Buffer.from(`admin:${Date.now()}`).toString('base64')
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          token,
          message: 'Autenticazione riuscita'
        })
      }
    } else {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error: 'Password errata'
        })
      }
    }
  } catch (error) {
    console.error('Auth error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Errore interno del server'
      })
    }
  }
}



