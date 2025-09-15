#!/usr/bin/env node

import { getDatabase } from '../src/lib/chatbot/database.mjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

console.log('🔧 Resetting embedding table for text-embedding-3-large with 1536 dimensions...')

async function migrateEmbeddingDimensions() {
  const db = getDatabase()
  
  try {
    // Check if table exists and has the old dimension
    const tableCheck = await db.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'content_embeddings' 
      AND column_name = 'embedding'
    `)
    
    if (tableCheck.rows.length === 0) {
      console.log('⚠️  Table content_embeddings not found. Running initial setup...')
      const { initializeDatabase } = await import('../src/lib/chatbot/database.mjs')
      await initializeDatabase()
      console.log('✅ Database initialized with correct dimensions')
      return
    }
    
    console.log('📊 Current table structure found')
    
    // Check if there's any data in the table
    const dataCheck = await db.query('SELECT COUNT(*) as count FROM content_embeddings')
    const recordCount = parseInt(dataCheck.rows[0].count)
    
    if (recordCount > 0) {
      console.log(`⚠️  Found ${recordCount} existing records. These will be cleared to resize embedding column.`)
      console.log('💡 You can re-run npm run chatbot:extract after migration to rebuild content.')
      
      // Clear existing data (embeddings will be incompatible anyway)
      await db.query('DELETE FROM content_embeddings')
      console.log('🗑️  Existing content cleared')
    }
    
    // Drop the existing embedding column
    console.log('🔧 Dropping old embedding column...')
    await db.query('ALTER TABLE content_embeddings DROP COLUMN IF EXISTS embedding')
    
    // Add new embedding column with correct dimensions
    console.log('➕ Adding new embedding column (1536 dimensions - optimized text-embedding-3-large)...')
    await db.query('ALTER TABLE content_embeddings ADD COLUMN embedding vector(1536)')
    
    // Recreate the vector index
    console.log('🔍 Recreating vector similarity index...')
    await db.query('DROP INDEX IF EXISTS idx_content_embeddings_vector')
    await db.query('CREATE INDEX IF NOT EXISTS idx_content_embeddings_vector ON content_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)')
    
    console.log('✅ Migration completed successfully!')
    console.log('')
    console.log('🚀 Next steps:')
    console.log('   • Run: npm run chatbot:extract')
    console.log('   • This will rebuild the knowledge base with correct embedding dimensions')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

migrateEmbeddingDimensions()
