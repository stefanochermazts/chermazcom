import OpenAI from 'openai'
import { searchSimilarContent, logQuery } from '../../src/lib/chatbot/database.mjs'

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// System prompt for Ask Stefano
const SYSTEM_PROMPT = `Sei "Ask Stefano", un assistente AI specializzato nei contenuti del sito di Stefano Chermaz (chermaz.com).

REGOLE IMPORTANTI:
1. Rispondi SOLO usando le informazioni fornite nei documenti
2. Se non trovi informazioni sufficienti, dillo chiaramente
3. Usa un tono professionale ma amichevole
4. Fornisci sempre citazioni [1], [2], etc. per ogni affermazione
5. Concludi con "Passi successivi" se appropriato

FORMATO RISPOSTA:
- Bullet points chiari e informativi
- Citazioni numerate per ogni fonte
- Sezione finale "Passi successivi" (opzionale)

Rispondi nella lingua della domanda (italiano, inglese o sloveno).`

/**
 * Generate embedding for query
 */
async function generateQueryEmbedding(query) {
  try {
    const response = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
      input: query,
      dimensions: 1536
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Failed to generate query embedding:', error.message)
    throw error
  }
}

/**
 * Detect language from query
 */
function detectQueryLanguage(query) {
  const englishWords = ['the', 'and', 'or', 'but', 'how', 'what', 'when', 'where', 'why', 'is', 'are', 'can', 'do', 'does']
  const slovenianWords = ['kako', 'kaj', 'kjer', 'kdaj', 'zakaj', 'je', 'so', 'lahko', 'ali', 'in']
  
  const words = query.toLowerCase().split(/\s+/)
  
  const englishScore = words.filter(word => englishWords.includes(word)).length
  const slovenianScore = words.filter(word => slovenianWords.includes(word)).length
  
  if (englishScore > slovenianScore && englishScore > 0) return 'en'
  if (slovenianScore > 0) return 'sl'
  return 'it' // Default to Italian
}

/**
 * Generate chatbot response
 */
async function generateResponse(query, relevantChunks, language = 'it') {
  try {
    if (relevantChunks.length === 0) {
      const fallbackMessage = language === 'en' 
        ? "I'm sorry, I don't have enough information to answer your question. Could you try rephrasing it or being more specific?"
        : language === 'sl'
        ? "Oprostite, nimam dovolj informacij za odgovor na vaše vprašanje. Lahko poizkusite preformulirati ali biti bolj specifični?"
        : "Mi dispiace, non ho trovato informazioni sufficienti per rispondere alla tua domanda. Potresti provare a riformularla o essere più specifico?"
      
      return {
        response: fallbackMessage,
        confidence: 0,
        citationCount: 0,
        sources: []
      }
    }
    
    // Prepare context from chunks (limit content length)
    const context = relevantChunks.map((result, index) => {
      const maxContentLength = 800
      const truncatedContent = result.chunk.content.length > maxContentLength 
        ? result.chunk.content.substring(0, maxContentLength) + '...'
        : result.chunk.content
        
      return `[${index + 1}] Titolo: ${result.chunk.title}
URL: ${result.chunk.url}
Contenuto: ${truncatedContent}
---`
    }).join('\n')
    
    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: `CONTESTO DISPONIBILE:
${context}

DOMANDA: ${query}

Rispondi usando solo le informazioni fornite nel contesto sopra. Includi citazioni appropriate.`
      }
    ]
    
    // Call OpenAI API
    const startTime = Date.now()
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages,
      temperature: 0.3,
      max_tokens: 600
    })
    
    const responseTime = Date.now() - startTime
    const response = completion.choices[0].message.content
    
    // Count citations in response
    const citationMatches = response.match(/\[\d+\]/g) || []
    const citationCount = citationMatches.length
    
    // Estimate confidence based on similarity scores and citation usage
    const avgSimilarity = relevantChunks.reduce((sum, chunk) => sum + chunk.score, 0) / relevantChunks.length
    const citationRatio = citationCount / relevantChunks.length
    const confidence = Math.min(0.95, (avgSimilarity * 0.7) + (citationRatio * 0.3))
    
    return {
      response,
      confidence,
      citationCount,
      responseTime,
      sources: relevantChunks.map((chunk, index) => ({
        id: index + 1,
        title: chunk.chunk.title,
        url: chunk.chunk.url,
        type: chunk.chunk.metadata.type,
        similarity: chunk.score
      }))
    }
    
  } catch (error) {
    console.error('Response generation failed:', error.message)
    throw error
  }
}

/**
 * Main Netlify Function handler
 */
export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    }
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse request body
    const { query, language: requestedLang, sessionId } = JSON.parse(event.body || '{}')
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Query is required' })
      }
    }

    // Detect language if not provided
    const language = requestedLang || detectQueryLanguage(query)
    
    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query)
    
    // Search for relevant content
    const relevantChunks = await searchSimilarContent(
      queryEmbedding,
      language,
      4 // Limit to 4 chunks for performance
    )
    
    // Generate response
    const result = await generateResponse(query, relevantChunks, language)
    
    // Log query for analytics (async, don't wait)
    if (sessionId) {
      logQuery(
        sessionId,
        query,
        language,
        result.citationCount,
        result.confidence,
        result.responseTime
      ).catch(err => console.warn('Failed to log query:', err.message))
    }
    
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        response: result.response,
        confidence: result.confidence,
        citationCount: result.citationCount,
        sources: result.sources,
        language: language,
        query: query
      })
    }

  } catch (error) {
    console.error('Ask API error:', error)
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}
