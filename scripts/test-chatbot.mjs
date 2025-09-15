#!/usr/bin/env node

import OpenAI from 'openai'
import { searchSimilarContent } from '../src/lib/chatbot/database.mjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

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

Rispondi in italiano, a meno che la domanda non sia in inglese o sloveno.`

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
    console.error('❌ Failed to generate query embedding:', error.message)
    throw error
  }
}

/**
 * Search for relevant content chunks
 */
async function searchRelevantContent(query, language = 'it', limit = 4) {
  try {
    console.log(`🔍 Searching for: "${query}" (${language})`)
    
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query)
    
    // Search similar content
    const results = await searchSimilarContent(
      queryEmbedding,
      language,
      limit
    )
    
    console.log(`📚 Found ${results.length} relevant chunks`)
    
    // Display results with similarity scores
    results.forEach((result, index) => {
      const similarity = (result.score * 100).toFixed(1)
      console.log(`   [${index + 1}] ${similarity}% - ${result.chunk.title} (${result.chunk.metadata.type})`)
    })
    
    return results
  } catch (error) {
    console.error('❌ Content search failed:', error.message)
    throw error
  }
}

/**
 * Generate chatbot response using LLM
 */
async function generateResponse(query, relevantChunks, language = 'it') {
  try {
    console.log('\n🤖 Generating response...')
    
    if (relevantChunks.length === 0) {
      return {
        response: "Mi dispiace, non ho trovato informazioni sufficienti per rispondere alla tua domanda. Potresti provare a riformularla o essere più specifico?",
        confidence: 0,
        citationCount: 0
      }
    }
    
    // Prepare context from chunks (truncate long content)
    const context = relevantChunks.map((result, index) => {
      const maxContentLength = 800 // Limit content per chunk
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
      similarityScores: relevantChunks.map(chunk => chunk.score),
      sources: relevantChunks.map(chunk => ({
        title: chunk.chunk.title,
        url: chunk.chunk.url,
        type: chunk.chunk.metadata.type
      }))
    }
    
  } catch (error) {
    console.error('❌ Response generation failed:', error.message)
    throw error
  }
}

/**
 * Detect language from query
 */
function detectQueryLanguage(query) {
  const englishWords = ['the', 'and', 'or', 'but', 'how', 'what', 'when', 'where', 'why', 'is', 'are', 'can', 'do', 'does']
  const slovenianWords = ['kako', 'kaj', 'kjer', 'kdaj', 'zakaj', 'je', 'so', 'lahko', 'ali', 'in', 'ali']
  
  const words = query.toLowerCase().split(/\s+/)
  
  const englishScore = words.filter(word => englishWords.includes(word)).length
  const slovenianScore = words.filter(word => slovenianWords.includes(word)).length
  
  if (englishScore > slovenianScore && englishScore > 0) return 'en'
  if (slovenianScore > 0) return 'sl'
  return 'it' // Default to Italian
}

/**
 * Main test function
 */
async function testChatbot() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('🤖 Ask Stefano Chatbot Test')
    console.log('')
    console.log('Usage:')
    console.log('  npm run ask:test "your question here"')
    console.log('  npm run ask:test "your question" --lang=en')
    console.log('  npm run ask:test "your question" --chunks=8')
    console.log('')
    console.log('Examples:')
    console.log('  npm run ask:test "Come creare un chatbot?"')
    console.log('  npm run ask:test "What is SharePoint?" --lang=en')
    console.log('  npm run ask:test "Quali sono i servizi offerti?"')
    process.exit(0)
  }
  
  // Parse arguments
  const query = args[0]
  const langArg = args.find(arg => arg.startsWith('--lang='))?.split('=')[1]
  const chunksArg = args.find(arg => arg.startsWith('--chunks='))?.split('=')[1]
  
  const language = langArg || detectQueryLanguage(query)
  const chunkLimit = chunksArg ? parseInt(chunksArg) : 4
  
  console.log('🤖 Ask Stefano Chatbot Test')
  console.log(`📝 Query: "${query}"`)
  console.log(`🌍 Language: ${language}`)
  console.log(`📊 Max chunks: ${chunkLimit}`)
  console.log('')
  
  try {
    // Search for relevant content
    const relevantChunks = await searchRelevantContent(query, language, chunkLimit)
    
    // Generate response
    const result = await generateResponse(query, relevantChunks, language)
    
    // Display results
    console.log('')
    console.log('=' .repeat(80))
    console.log('🎯 RISPOSTA:')
    console.log('=' .repeat(80))
    console.log(result.response)
    console.log('')
    console.log('=' .repeat(80))
    console.log('📊 STATISTICHE:')
    console.log('=' .repeat(80))
    console.log(`• Confidence: ${(result.confidence * 100).toFixed(1)}%`)
    console.log(`• Citations: ${result.citationCount}`)
    console.log(`• Response time: ${result.responseTime}ms`)
    console.log(`• Sources used: ${result.sources?.length || 0}`)
    
    if (result.sources && result.sources.length > 0) {
      console.log('')
      console.log('📚 Fonti utilizzate:')
      result.sources.forEach((source, index) => {
        console.log(`  [${index + 1}] ${source.title} (${source.type})`)
        console.log(`      ${source.url}`)
      })
    }
    
    console.log('')
    console.log('✅ Test completato con successo!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testChatbot()
