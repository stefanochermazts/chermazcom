import type { Handler } from '@netlify/functions'
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.join(process.cwd(), 'src', 'content')

function toCollectionDir(collection: string) {
  if (collection === 'insights' || collection === 'case-studies' || collection === 'pages') return collection
  throw new Error('Invalid collection')
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' }
  }
  const token = event.headers['x-admin-token']
  if (!token) return { statusCode: 401, body: 'Unauthorized' }

  try {
    const collection = (event.queryStringParameters?.collection || 'insights').toString()
    const dir = path.join(ROOT, toCollectionDir(collection))
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = entries
      .filter((e) => e.isFile() && e.name.endsWith('.mdx'))
      .map((e) => ({ name: e.name, path: `src/content/${collection}/${e.name}` }))
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, files }) }
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e?.message || 'Error' }) }
  }
}



