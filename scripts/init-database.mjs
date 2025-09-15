#!/usr/bin/env node

import { initializeDatabase, getDatabaseStats } from '../src/lib/chatbot/database.mjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

console.log('🚀 Initializing Ask Stefano database schema...')
console.log(`📍 Using ${process.env.USE_LOCAL_DB === 'true' ? 'LOCAL' : 'CLOUD'} database`)

async function initDb() {
  try {
    console.log('⏳ Creating tables and indexes...')
    await initializeDatabase()
    
    console.log('📊 Getting database statistics...')
    const stats = await getDatabaseStats()
    
    console.log('')
    console.log('✅ Database initialization completed!')
    console.log('')
    console.log('📋 Database Schema Created:')
    console.log('   ✅ content_embeddings - Vector storage for content chunks')
    console.log('   ✅ chat_feedback - User feedback tracking')
    console.log('   ✅ query_logs - Analytics and monitoring')
    console.log('')
    console.log('🔧 Extensions:')
    console.log('   ✅ pgvector - Vector similarity search')
    console.log('')
    console.log('📊 Current Statistics:')
    console.log(`   📄 Content chunks: ${stats.content.reduce((sum, item) => sum + parseInt(item.count), 0)}`)
    console.log(`   👍 Feedback entries: ${stats.feedback.reduce((sum, item) => sum + parseInt(item.count), 0)}`)
    console.log(`   📝 Query logs: ${stats.queries.reduce((sum, item) => sum + parseInt(item.query_count), 0)}`)
    
    if (stats.content.length > 0) {
      console.log('')
      console.log('📚 Content breakdown by type and language:')
      stats.content.forEach(item => {
        console.log(`   • ${item.source_type} (${item.language}): ${item.count} chunks`)
      })
    }
    
    console.log('')
    console.log('🎯 Next steps:')
    console.log('   1. Run: npm run chatbot:extract (to populate content)')
    console.log('   2. Test with: npm run ask:test "your question here"')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message)
    console.error('')
    console.error('🔧 Troubleshooting:')
    console.error('   • Ensure database connection is working: npm run db:test')
    console.error('   • Check DATABASE_URL is correctly set')
    console.error('   • Verify database user has CREATE privileges')
    
    if (error.message.includes('permission')) {
      console.error('   • Your database user needs CREATE and EXTENSION privileges')
    }
    
    process.exit(1)
  }
}

initDb()