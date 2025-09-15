#!/usr/bin/env node

import { getDatabase } from '../src/lib/chatbot/database.mjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

console.log('🗑️  Resetting vector storage...')
console.log('⚠️  This will delete ALL content chunks and embeddings!')

async function resetVectorStorage() {
  const db = getDatabase()
  
  try {
    // Get current statistics
    const beforeStats = await db.query('SELECT COUNT(*) as count FROM content_embeddings')
    const beforeCount = parseInt(beforeStats.rows[0].count)
    
    console.log(`📊 Current content chunks: ${beforeCount}`)
    
    if (beforeCount === 0) {
      console.log('✅ Vector storage is already empty')
      return
    }
    
    // Confirm deletion
    console.log('')
    console.log('🔄 Starting deletion process...')
    
    // Delete all content embeddings
    await db.query('DELETE FROM content_embeddings')
    
    // Also clear related logs and feedback if they exist
    await db.query('DELETE FROM query_logs')
    await db.query('DELETE FROM chat_feedback')
    
    // Reset sequence counters
    await db.query('ALTER SEQUENCE content_embeddings_id_seq RESTART WITH 1')
    await db.query('ALTER SEQUENCE query_logs_id_seq RESTART WITH 1')
    await db.query('ALTER SEQUENCE chat_feedback_id_seq RESTART WITH 1')
    
    // Verify deletion
    const afterStats = await db.query('SELECT COUNT(*) as count FROM content_embeddings')
    const afterCount = parseInt(afterStats.rows[0].count)
    
    console.log(`✅ Vector storage reset completed!`)
    console.log(`📊 Content chunks deleted: ${beforeCount}`)
    console.log(`📊 Current content chunks: ${afterCount}`)
    console.log('')
    console.log('🚀 Next steps:')
    console.log('   • Run: npm run chatbot:extract')
    console.log('   • This will rebuild with improved chunk settings')
    
  } catch (error) {
    console.error('❌ Failed to reset vector storage:', error.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

// Safety check - require explicit confirmation
const args = process.argv.slice(2)
if (!args.includes('--confirm')) {
  console.log('')
  console.log('⚠️  SAFETY CHECK: This will delete all content from the vector database!')
  console.log('⚠️  All embeddings and chunks will be lost!')
  console.log('')
  console.log('🔒 To proceed, run with confirmation flag:')
  console.log('   npm run db:reset -- --confirm')
  console.log('')
  process.exit(0)
}

resetVectorStorage()
