import { Pool } from 'pg'

// Database connection pool
let pool = null

export function getDatabase() {
  if (!pool) {
    const connectionString = process.env.USE_LOCAL_DB === 'true' 
      ? process.env.LOCAL_DATABASE_URL 
      : process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('DATABASE_URL or LOCAL_DATABASE_URL not configured')
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    })
  }
  
  return pool
}

// Initialize database schema with pgvector extension
export async function initializeDatabase() {
  const db = getDatabase()
  
  try {
    console.log('🔧 Enabling pgvector extension...')
    // Enable pgvector extension
    await db.query('CREATE EXTENSION IF NOT EXISTS vector')
    
    console.log('📋 Creating content_embeddings table...')
    // Create content chunks table
    await db.query(`
      CREATE TABLE IF NOT EXISTS content_embeddings (
        id SERIAL PRIMARY KEY,
        content_id VARCHAR(255) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        url TEXT NOT NULL,
        source_type VARCHAR(50) NOT NULL, -- 'insight', 'case-study', 'page'
        language VARCHAR(5) NOT NULL,     -- 'it', 'en', 'sl'
        categories TEXT[],
        tags TEXT[],
        metadata JSONB,
        embedding vector(1536),           -- OpenAI embedding dimension (1536 for pgvector compatibility)
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    
    console.log('🔍 Creating indexes for efficient search...')
    // Create indexes for efficient search
    await db.query('CREATE INDEX IF NOT EXISTS idx_content_embeddings_source_type ON content_embeddings (source_type)')
    await db.query('CREATE INDEX IF NOT EXISTS idx_content_embeddings_language ON content_embeddings (language)')
    await db.query('CREATE INDEX IF NOT EXISTS idx_content_embeddings_categories ON content_embeddings USING GIN (categories)')
    await db.query('CREATE INDEX IF NOT EXISTS idx_content_embeddings_tags ON content_embeddings USING GIN (tags)')
    
    console.log('🎯 Creating vector similarity index...')
    // Create vector similarity index (cosine distance)
    await db.query('CREATE INDEX IF NOT EXISTS idx_content_embeddings_vector ON content_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)')
    
    console.log('💬 Creating feedback table...')
    // Create feedback table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_feedback (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(255) NOT NULL,
        session_id VARCHAR(255),
        feedback VARCHAR(20) NOT NULL, -- 'positive', 'negative'
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    
    console.log('📊 Creating query logs table...')
    // Create query logs table (for analytics)
    await db.query(`
      CREATE TABLE IF NOT EXISTS query_logs (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255),
        query TEXT NOT NULL,
        language VARCHAR(5) NOT NULL,
        response_citations INTEGER,
        confidence_score DECIMAL(3,2),
        response_time_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    
    console.log('✅ Database schema initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize database:', error)
    throw error
  }
}

// Insert or update content chunk with embedding
export async function upsertContentChunk(chunk) {
  const db = getDatabase()
  
  const query = `
    INSERT INTO content_embeddings (
      content_id, title, content, url, source_type, language, 
      categories, tags, metadata, embedding
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (content_id) 
    DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      url = EXCLUDED.url,
      source_type = EXCLUDED.source_type,
      language = EXCLUDED.language,
      categories = EXCLUDED.categories,
      tags = EXCLUDED.tags,
      metadata = EXCLUDED.metadata,
      embedding = EXCLUDED.embedding,
      updated_at = NOW()
  `
  
  const values = [
    chunk.id,
    chunk.title,
    chunk.content,
    chunk.url,
    chunk.metadata.type,
    chunk.language,
    chunk.category || [],
    chunk.tags || [],
    chunk.metadata,
    chunk.embedding ? JSON.stringify(chunk.embedding) : null
  ]
  
  await db.query(query, values)
}

// Vector similarity search with hybrid filtering
export async function searchSimilarContent(
  queryEmbedding,
  language,
  limit = 8,
  sourceTypes = null,
  categories = null
) {
  const db = getDatabase()
  
  let whereClause = 'WHERE language = $2'
  const params = [JSON.stringify(queryEmbedding), language]
  let paramCount = 2
  
  if (sourceTypes && sourceTypes.length > 0) {
    whereClause += ` AND source_type = ANY($${++paramCount})`
    params.push(sourceTypes)
  }
  
  if (categories && categories.length > 0) {
    whereClause += ` AND categories && $${++paramCount}`
    params.push(categories)
  }
  
  const query = `
    SELECT 
      content_id as id,
      title,
      content,
      url,
      source_type,
      language,
      categories,
      tags,
      metadata,
      (embedding <=> $1::vector) as distance,
      (1 - (embedding <=> $1::vector)) as similarity
    FROM content_embeddings 
    ${whereClause}
    AND embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $${++paramCount}
  `
  
  params.push(limit)
  
  const result = await db.query(query, params)
  
  return result.rows.map((row, index) => ({
    chunk: {
      id: row.id,
      title: row.title,
      content: row.content,
      url: row.url,
      language: row.language,
      category: row.categories,
      tags: row.tags,
      source: row.url,
      metadata: {
        type: row.source_type,
        ...row.metadata
      }
    },
    score: row.similarity,
    rank: index + 1
  }))
}

// Log user query for analytics
export async function logQuery(
  sessionId,
  query,
  language,
  citationCount,
  confidence,
  responseTimeMs
) {
  const db = getDatabase()
  
  await db.query(`
    INSERT INTO query_logs (session_id, query, language, response_citations, confidence_score, response_time_ms)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [sessionId, query, language, citationCount, confidence, responseTimeMs])
}

// Record user feedback
export async function recordFeedback(
  messageId,
  sessionId,
  feedback,
  comment = null
) {
  const db = getDatabase()
  
  await db.query(`
    INSERT INTO chat_feedback (message_id, session_id, feedback, comment)
    VALUES ($1, $2, $3, $4)
  `, [messageId, sessionId, feedback, comment])
}

// Get database statistics
export async function getDatabaseStats() {
  const db = getDatabase()
  
  const [contentStats, feedbackStats, queryStats] = await Promise.all([
    db.query(`
      SELECT 
        source_type,
        language,
        COUNT(*) as count
      FROM content_embeddings 
      GROUP BY source_type, language
      ORDER BY source_type, language
    `),
    db.query(`
      SELECT 
        feedback,
        COUNT(*) as count
      FROM chat_feedback 
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY feedback
    `),
    db.query(`
      SELECT 
        language,
        AVG(confidence_score) as avg_confidence,
        AVG(response_time_ms) as avg_response_time,
        COUNT(*) as query_count
      FROM query_logs 
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY language
    `)
  ])
  
  return {
    content: contentStats.rows,
    feedback: feedbackStats.rows,
    queries: queryStats.rows
  }
}