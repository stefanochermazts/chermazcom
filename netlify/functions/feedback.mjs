import { recordFeedback } from '../../src/lib/chatbot/database.mjs'

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

/**
 * Netlify Function handler for feedback
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
    const { messageId, sessionId, feedback, comment } = JSON.parse(event.body || '{}')
    
    // Validate required fields
    if (!messageId || !feedback) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'messageId and feedback are required' })
      }
    }

    // Validate feedback value
    if (!['positive', 'negative'].includes(feedback)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'feedback must be "positive" or "negative"' })
      }
    }

    // Record feedback in database
    await recordFeedback(messageId, sessionId, feedback, comment)
    
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Feedback recorded successfully'
      })
    }

  } catch (error) {
    console.error('Feedback API error:', error)
    
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
