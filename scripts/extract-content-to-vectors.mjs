#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { encodingForModel } from 'js-tiktoken'
import OpenAI from 'openai'
import { upsertContentChunk } from '../src/lib/chatbot/database.mjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '..')

// Configuration
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE) || 1200
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 300
const BATCH_SIZE = 5 // Process embeddings in smaller batches to avoid rate limits
const MAX_CONTENT_LENGTH = parseInt(process.env.MAX_CONTENT_LENGTH) || 20000 // Increased limit for long articles

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Encoding for token counting
const encoding = encodingForModel('gpt-4')

console.log('🚀 Starting content extraction for Ask Stefano...')
console.log(`📏 Chunk size: ${CHUNK_SIZE} tokens, overlap: ${CHUNK_OVERLAP} tokens`)

/**
 * Detect language from filename
 */
function detectLanguage(filename) {
  if (filename.startsWith('en-')) return 'en'
  if (filename.startsWith('sl-')) return 'sl'
  return 'it'
}

/**
 * Detect content type from directory
 */
function detectContentType(filePath) {
  if (filePath.includes('/insights/')) return 'insight'
  if (filePath.includes('/case-studies/')) return 'case-study'
  if (filePath.includes('/pages/')) return 'page'
  return 'unknown'
}

/**
 * Generate URL from content metadata
 */
function generateUrl(type, language, slug, filename) {
  const baseSlug = slug || filename.replace(/\.mdx?$/, '').replace(/^(en-|sl-)/, '')
  
  const langPrefix = `/${language}`
  
  switch (type) {
    case 'insight':
      return `${langPrefix}/insights/${baseSlug}/`
    case 'case-study':
      return `${langPrefix}/case-studies/${baseSlug}/`
    case 'page':
      // Special handling for pages with localized URLs
      if (baseSlug === 'chi-sono' || baseSlug === 'about') {
        return language === 'it' ? '/it/chi-sono/' : 
               language === 'en' ? '/en/about/' : '/sl/o-meni/'
      }
      if (baseSlug === 'servizi' || baseSlug === 'services') {
        return language === 'it' ? '/it/servizi/' : 
               language === 'en' ? '/en/services/' : '/sl/storitve/'
      }
      if (baseSlug === 'contatti' || baseSlug === 'contact') {
        return language === 'it' ? '/it/contatti/' : 
               language === 'en' ? '/en/contact/' : '/sl/kontakt/'
      }
      return `${langPrefix}/${baseSlug}/`
    default:
      return `${langPrefix}/${baseSlug}/`
  }
}

/**
 * Clean markdown content - remove imports, components, complex markup
 */
function cleanMarkdownContent(content) {
  return content
    // Remove imports
    .replace(/^import\s+.*$/gm, '')
    // Remove component tags
    .replace(/<[^>]+>/g, ' ')
    // Remove frontmatter delimiters if any remain
    .replace(/^---.*?---/s, '')
    // Clean up multiple spaces and newlines
    .replace(/\s+/g, ' ')
    // Remove empty lines
    .replace(/\n\s*\n/g, '\n')
    .trim()
}

/**
 * Split content into chunks with overlap
 */
function chunkContent(content, title, maxChunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const tokens = encoding.encode(content)
  const chunks = []
  
  if (tokens.length <= maxChunkSize) {
    return [{
      content: content,
      tokens: tokens.length,
      position: 0
    }]
  }
  
  let start = 0
  let position = 0
  
  while (start < tokens.length) {
    const end = Math.min(start + maxChunkSize, tokens.length)
    const chunkTokens = tokens.slice(start, end)
    
    // Decode tokens back to text
    let chunkContent = encoding.decode(chunkTokens)
    
    // Add context from title for better embedding
    if (position === 0) {
      chunkContent = `${title}\n\n${chunkContent}`
    }
    
    chunks.push({
      content: chunkContent,
      tokens: chunkTokens.length,
      position: position
    })
    
    // Move start position with overlap
    start = end - overlap
    position++
    
    // Prevent infinite loop
    if (start >= end - overlap) break
  }
  
  return chunks
}

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text.substring(0, 8000), // Limit to prevent API errors
      dimensions: 1536 // Reduce dimensions for pgvector compatibility
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('❌ Failed to generate embedding:', error.message)
    throw error
  }
}

/**
 * Process a single MDX file
 */
async function processFile(filePath) {
  try {
    const filename = path.basename(filePath)
    const content = await fs.readFile(filePath, 'utf-8')
    
    // Parse frontmatter
    const { data: frontmatter, content: markdownContent } = matter(content)
    
    // Extract metadata
    const language = detectLanguage(filename)
    const contentType = detectContentType(filePath)
    const title = frontmatter.title || filename.replace(/\.mdx?$/, '')
    const slug = frontmatter.slug
    const url = generateUrl(contentType, language, slug, filename)
    
    // Clean and prepare content
    const cleanContent = cleanMarkdownContent(markdownContent)
    
    if (cleanContent.length < 50) {
      console.log(`⚠️  Skipping ${filename} - content too short`)
      return { processed: 0, chunks: 0 }
    }
    
    // Split into chunks (no truncation, process all content)
    const chunks = chunkContent(cleanContent, title)
    
    console.log(`📄 Processing ${filename} (${language}) - ${chunks.length} chunks`)
    
    let processedChunks = 0
    
    // Process chunks in batches to respect rate limits
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      
      // Generate embeddings for batch with delay between requests
      const embeddings = []
      for (const chunk of batch) {
        const embedding = await generateEmbedding(chunk.content)
        embeddings.push(embedding)
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      // Save chunks to database
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j]
        const embedding = embeddings[j]
        
        const contentChunk = {
          id: `${filename.replace(/\.mdx?$/, '')}_chunk_${chunk.position}`,
          title: title,
          content: chunk.content,
          url: url,
          language: language,
          category: frontmatter.categories || [],
          tags: frontmatter.tags || [],
          source: url,
          embedding: embedding,
          metadata: {
            type: contentType,
            date: frontmatter.date,
            excerpt: frontmatter.excerpt || frontmatter.description,
            filename: filename,
            chunk_position: chunk.position,
            total_chunks: chunks.length,
            token_count: chunk.tokens
          }
        }
        
        await upsertContentChunk(contentChunk)
        processedChunks++
      }
      
      // Longer delay between batches
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return { processed: 1, chunks: processedChunks }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    return { processed: 0, chunks: 0, error: error.message }
  }
}

/**
 * Get all MDX files from content directories
 */
async function getAllMdxFiles() {
  const contentDir = path.join(ROOT_DIR, 'src', 'content')
  const files = []
  
  const directories = ['insights', 'case-studies', 'pages']
  
  for (const dir of directories) {
    const dirPath = path.join(contentDir, dir)
    try {
      const entries = await fs.readdir(dirPath)
      for (const entry of entries) {
        if (entry.endsWith('.mdx') || entry.endsWith('.md')) {
          files.push(path.join(dirPath, entry))
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read directory ${dir}:`, error.message)
    }
  }
  
  return files
}

/**
 * Main extraction function
 */
async function extractContent() {
  const startTime = Date.now()
  
  try {
    // Validate environment
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables')
    }
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not found in environment variables')
    }
    
    // Get all MDX files
    console.log('🔍 Scanning for MDX files...')
    const files = await getAllMdxFiles()
    console.log(`📚 Found ${files.length} files to process`)
    
    if (files.length === 0) {
      console.log('⚠️  No MDX files found')
      return
    }
    
    // Process files
    let totalProcessed = 0
    let totalChunks = 0
    let errors = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`\n📖 [${i + 1}/${files.length}] ${path.basename(file)}`)
      
      const result = await processFile(file)
      totalProcessed += result.processed
      totalChunks += result.chunks
      
      if (result.error) {
        errors.push({ file: path.basename(file), error: result.error })
      }
      
      // Progress indicator
      const progress = Math.round(((i + 1) / files.length) * 100)
      console.log(`   ✅ ${result.chunks} chunks created (${progress}% complete)`)
    }
    
    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)
    
    console.log('\n🎉 Content extraction completed!')
    console.log(`📊 Summary:`)
    console.log(`   • Files processed: ${totalProcessed}/${files.length}`)
    console.log(`   • Total chunks created: ${totalChunks}`)
    console.log(`   • Processing time: ${duration}s`)
    console.log(`   • Average: ${Math.round(totalChunks / Math.max(duration, 1))} chunks/sec`)
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`)
      errors.forEach(({ file, error }) => {
        console.log(`   • ${file}: ${error}`)
      })
    }
    
    console.log('\n🚀 Next steps:')
    console.log('   • Check stats: npm run db:stats')
    console.log('   • Test the chatbot: npm run ask:test "your question"')
    
  } catch (error) {
    console.error('❌ Content extraction failed:', error.message)
    process.exit(1)
  }
}

// Run extraction
extractContent()