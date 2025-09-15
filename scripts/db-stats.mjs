#!/usr/bin/env node

import { getDatabaseStats } from '../src/lib/chatbot/database.mjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

console.log('📊 Ask Stefano Database Statistics')
console.log(`📍 Using ${process.env.USE_LOCAL_DB === 'true' ? 'LOCAL' : 'CLOUD'} database`)
console.log('')

async function showStats() {
  try {
    const stats = await getDatabaseStats()
    
    // Content statistics
    const totalContent = stats.content.reduce((sum, item) => sum + parseInt(item.count), 0)
    console.log('📚 Content Statistics:')
    console.log(`   Total chunks: ${totalContent}`)
    
    if (stats.content.length > 0) {
      console.log('   Breakdown by type and language:')
      
      // Group by type
      const byType = {}
      stats.content.forEach(item => {
        if (!byType[item.source_type]) byType[item.source_type] = {}
        byType[item.source_type][item.language] = parseInt(item.count)
      })
      
      Object.entries(byType).forEach(([type, languages]) => {
        const total = Object.values(languages).reduce((sum, count) => sum + count, 0)
        console.log(`   • ${type}: ${total} total`)
        Object.entries(languages).forEach(([lang, count]) => {
          console.log(`     - ${lang}: ${count} chunks`)
        })
      })
    }
    
    console.log('')
    
    // Feedback statistics
    const totalFeedback = stats.feedback.reduce((sum, item) => sum + parseInt(item.count), 0)
    console.log('👍 Feedback Statistics (last 30 days):')
    console.log(`   Total feedback: ${totalFeedback}`)
    
    if (stats.feedback.length > 0) {
      stats.feedback.forEach(item => {
        const percentage = totalFeedback > 0 ? Math.round((parseInt(item.count) / totalFeedback) * 100) : 0
        console.log(`   • ${item.feedback}: ${item.count} (${percentage}%)`)
      })
    }
    
    console.log('')
    
    // Query statistics
    const totalQueries = stats.queries.reduce((sum, item) => sum + parseInt(item.query_count), 0)
    console.log('📝 Query Statistics (last 30 days):')
    console.log(`   Total queries: ${totalQueries}`)
    
    if (stats.queries.length > 0) {
      stats.queries.forEach(item => {
        const avgConfidence = parseFloat(item.avg_confidence) || 0
        const avgResponseTime = parseInt(item.avg_response_time) || 0
        console.log(`   • ${item.language}: ${item.query_count} queries`)
        console.log(`     - Avg confidence: ${avgConfidence.toFixed(2)}`)
        console.log(`     - Avg response time: ${avgResponseTime}ms`)
      })
    }
    
    console.log('')
    
    if (totalContent === 0) {
      console.log('💡 No content found. Run: npm run chatbot:extract')
    } else if (totalQueries === 0) {
      console.log('💡 No queries yet. Test with: npm run ask:test "your question"')
    } else {
      console.log('✅ Database is active and healthy!')
    }
    
  } catch (error) {
    console.error('❌ Failed to get database statistics:', error.message)
    process.exit(1)
  }
}

showStats()
