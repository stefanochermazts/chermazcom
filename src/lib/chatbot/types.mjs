// Type definitions for Ask Stefano chatbot

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  citations?: Citation[]
  confidence?: number
}

export interface Citation {
  id: number
  title: string
  url: string
  excerpt: string
  source: 'insight' | 'case-study' | 'page'
  language: 'it' | 'en' | 'sl'
  category?: string[]
  tags?: string[]
}

export interface QueryRequest {
  query: string
  language: 'it' | 'en' | 'sl'
  sessionId?: string
  context?: string[]
}

export interface QueryResponse {
  id: string
  content: string
  citations: Citation[]
  confidence: number
  nextSteps?: string[]
  relatedQueries?: string[]
  timestamp: Date
}

export interface ContentChunk {
  id: string
  content: string
  title: string
  source: string
  url: string
  language: 'it' | 'en' | 'sl'
  category?: string[]
  tags?: string[]
  embedding?: number[]
  metadata: {
    type: 'insight' | 'case-study' | 'page'
    date?: string
    excerpt?: string
  }
}

export interface VectorSearchResult {
  chunk: ContentChunk
  score: number
  rank: number
}

export interface FeedbackRequest {
  messageId: string
  feedback: 'positive' | 'negative'
  sessionId?: string
  comment?: string
}

export interface ChatConfig {
  maxTokens: number
  temperature: number
  maxCitations: number
  confidenceThreshold: number
  chunkSize: number
  chunkOverlap: number
  maxRetrievalResults: number
}
