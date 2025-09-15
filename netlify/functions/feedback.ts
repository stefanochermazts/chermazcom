import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'

// Placeholder per gestione feedback thumbs up/down
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { messageId, feedback, sessionId } = JSON.parse(event.body || '{}')
    
    if (!messageId || !feedback) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'messageId and feedback are required' })
      }
    }

    if (!['positive', 'negative'].includes(feedback)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'feedback must be positive or negative' })
      }
    }

    // TODO: Implementare logging del feedback
    console.log('Feedback received:', { messageId, feedback, sessionId, timestamp: new Date().toISOString() })
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Feedback recorded successfully',
        messageId,
        feedback
      })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
