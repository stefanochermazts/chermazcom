import type { Handler } from '@netlify/functions'
import fs from 'node:fs/promises'
import path from 'node:path'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed' }
  const token = event.headers['x-admin-token']
  if (!token) return { statusCode: 401, body: 'Unauthorized' }
  try {
    const filePath = event.queryStringParameters?.filePath
    if (!filePath) return { statusCode: 400, body: 'filePath required' }
    const abs = path.join(process.cwd(), filePath)
    const text = await fs.readFile(abs, 'utf8')
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, text }) }
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e?.message || 'Error' }) }
  }
}



