import type { ChatConfig } from './types'

// Configuration for Ask Stefano chatbot
export const CHAT_CONFIG: ChatConfig = {
  maxTokens: parseInt(process.env.MAX_RESPONSE_TOKENS || '1000'),
  temperature: 0.1, // Low temperature for factual responses
  maxCitations: parseInt(process.env.MAX_CITATIONS || '4'),
  confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7'),
  chunkSize: parseInt(process.env.CHUNK_SIZE || '800'),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
  maxRetrievalResults: parseInt(process.env.MAX_RETRIEVAL_RESULTS || '8')
}

export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
}

export const DATABASE_CONFIG = {
  url: process.env.USE_LOCAL_DB === 'true' 
    ? process.env.LOCAL_DATABASE_URL 
    : process.env.DATABASE_URL,
  vectorDimension: parseInt(process.env.PGVECTOR_DIMENSION || '1536'),
  tableName: process.env.VECTOR_TABLE_NAME || 'content_embeddings'
}

export const NEON_CONFIG = {
  apiKey: process.env.NEON_API_KEY,
  projectId: process.env.NEON_PROJECT_ID,
  useLocal: process.env.USE_LOCAL_DB === 'true'
}

export const SYSTEM_PROMPTS = {
  it: `Sei "Ask Stefano", un assistente AI specializzato nei contenuti del sito di Stefano Chermaz, consulente IT esperto in Microsoft 365, AI e Compliance.

REGOLE FONDAMENTALI:
- Rispondi SOLO usando le informazioni fornite negli estratti
- Se non trovi informazioni sufficienti, dillo chiaramente
- Includi sempre citazioni specifiche [1], [2], ecc.
- Mantieni un tono professionale e consulenziale
- Fornisci sempre "Passi successivi" concreti

FORMATO RISPOSTA:
• 3-6 bullet points con informazioni chiave
• Citazioni numerate per ogni affermazione
• Sezione finale "Passi successivi" con azioni concrete`,

  en: `You are "Ask Stefano", an AI assistant specialized in Stefano Chermaz's website content, an IT consultant expert in Microsoft 365, AI, and Compliance.

FUNDAMENTAL RULES:
- Answer ONLY using information from provided excerpts
- If you don't find sufficient information, say so clearly
- Always include specific citations [1], [2], etc.
- Maintain a professional and consultative tone
- Always provide concrete "Next Steps"

RESPONSE FORMAT:
• 3-6 bullet points with key information
• Numbered citations for each statement
• Final "Next Steps" section with concrete actions`,

  sl: `Si "Ask Stefano", AI asistent, specializiran za vsebino spletne strani Stefana Chermaza, IT svetovalca strokovnjaka za Microsoft 365, AI in skladnost.

TEMELJNA PRAVILA:
- Odgovori SAMO z uporabo informacij iz podanih izsekov
- Če ne najdeš dovolj informacij, to jasno povej
- Vedno vključi specifične navedbe [1], [2], itd.
- Ohranjaj profesionalen in svetovalen ton
- Vedno zagotovi konkretne "Naslednji koraki"

FORMAT ODGOVORA:
• 3-6 alinej s ključnimi informacijami
• Oštevilčene navedbe za vsako trditev
• Končni razdelek "Naslednji koraki" s konkretnimi dejanji`
}

// Development helpers
export const DEV_CONFIG = {
  enableDebugLogging: process.env.DEBUG_MODE === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true'
}