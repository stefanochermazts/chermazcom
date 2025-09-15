import { getDatabaseStats } from '../../src/lib/chatbot/database.mjs'

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

/**
 * Netlify Function handler for health check
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

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get database statistics
    const stats = await getDatabaseStats()
    
    // Calculate total content chunks
    const totalContent = stats.content.reduce((sum, item) => sum + parseInt(item.count), 0)
    
    // System health indicators
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      database: {
        status: 'connected',
        totalContent: totalContent,
        contentByLanguage: stats.content.reduce((acc, item) => {
          acc[item.language] = parseInt(item.count)
          return acc
        }, {}),
        totalQueries: stats.queries.reduce((sum, item) => sum + parseInt(item.query_count), 0),
        totalFeedback: stats.feedback.reduce((sum, item) => sum + parseInt(item.count), 0)
      },
      services: {
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
        database: process.env.DATABASE_URL ? 'configured' : 'missing'
      }
    }
    
    // Check for critical issues
    if (totalContent === 0) {
      health.status = 'warning'
      health.warnings = ['No content in database']
    }
    
    if (!process.env.OPENAI_API_KEY || !process.env.DATABASE_URL) {
      health.status = 'error'
      health.errors = ['Missing critical environment variables']
    }
    
    const statusCode = health.status === 'error' ? 503 : 200
    
    return {
      statusCode: statusCode,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(health)
    }

  } catch (error) {
    console.error('Health check error:', error)
    
    return {
      statusCode: 503,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}
