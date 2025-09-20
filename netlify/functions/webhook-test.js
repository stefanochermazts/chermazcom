/**
 * Netlify Function per testare il webhook
 * Deploy: https://your-site.netlify.app/.netlify/functions/webhook-test
 */

export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }
  
  try {
    // Verifica autenticazione
    const authHeader = event.headers.authorization;
    const expectedSecret = process.env.WEBHOOK_SECRET;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      };
    }
    
    const token = authHeader.substring(7);
    if (token !== expectedSecret) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid webhook secret' }),
      };
    }
    
    // Parse payload se presente
    let payload = {};
    if (event.body) {
      try {
        payload = JSON.parse(event.body);
      } catch (e) {
        payload = { body: event.body };
      }
    }
    
    // Risposta di successo
    const response = {
      success: true,
      message: 'Webhook test successful',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      headers: event.headers,
      receivedPayload: payload,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        hasWebhookSecret: !!process.env.WEBHOOK_SECRET,
        hasGithubToken: !!process.env.GITHUB_TOKEN,
      }
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response, null, 2),
    };
    
  } catch (error) {
    console.error('❌ Errore nel test webhook:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
    };
  }
};
