#!/usr/bin/env node

import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const connectionString = process.env.USE_LOCAL_DB === 'true' 
  ? process.env.LOCAL_DATABASE_URL 
  : process.env.DATABASE_URL

console.log('🔗 Testing Neon database connection...')
console.log(`📍 Using ${process.env.USE_LOCAL_DB === 'true' ? 'LOCAL' : 'CLOUD'} database`)

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables')
  console.error('💡 Please set DATABASE_URL in your .env file')
  console.error('📋 Format: postgresql://username:password@host:port/database?sslmode=require')
  process.exit(1)
}

// Mask password in URL for logging
const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@')
console.log(`🎯 Connection string: ${maskedUrl}`)

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 1, // Only one connection for testing
  connectionTimeoutMillis: 5000
})

async function testConnection() {
  let client
  try {
    console.log('⏳ Connecting to database...')
    client = await pool.connect()
    
    console.log('✅ Connection successful!')
    
    // Test basic query
    console.log('🧪 Testing basic query...')
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version')
    console.log(`📅 Current time: ${result.rows[0].current_time}`)
    console.log(`🐘 PostgreSQL: ${result.rows[0].postgres_version.split(' ')[0]} ${result.rows[0].postgres_version.split(' ')[1]}`)
    
    // Check if pgvector extension exists
    console.log('🔍 Checking pgvector extension...')
    const extensionCheck = await client.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as has_vector
    `)
    
    if (extensionCheck.rows[0].has_vector) {
      console.log('✅ pgvector extension is available')
    } else {
      console.log('⚠️  pgvector extension not found - will be installed during initialization')
    }
    
    // Check current database name
    const dbCheck = await client.query('SELECT current_database() as db_name')
    console.log(`💾 Current database: ${dbCheck.rows[0].db_name}`)
    
    // List existing tables
    console.log('📋 Checking existing tables...')
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    
    if (tables.rows.length > 0) {
      console.log('📊 Existing tables:')
      tables.rows.forEach(row => {
        console.log(`   • ${row.table_name}`)
      })
    } else {
      console.log('📭 No existing tables found')
    }
    
    console.log('')
    console.log('🎉 Database connection test completed successfully!')
    console.log('')
    console.log('🔧 Next steps:')
    console.log('   1. Run: npm run db:init (to create tables)')
    console.log('   2. Run: npm run chatbot:extract (to populate content)')
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Check your hostname in DATABASE_URL')
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Check if the database server is running and port is correct')
    } else if (error.message.includes('password')) {
      console.error('💡 Check your username and password in DATABASE_URL')
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('💡 Check your database name in DATABASE_URL')
    }
    
    console.error('')
    console.error('🔧 Troubleshooting:')
    console.error('   • Verify your Neon credentials at https://console.neon.tech')
    console.error('   • Check DATABASE_URL format: postgresql://user:pass@host:port/db?sslmode=require')
    console.error('   • Ensure your IP is not blocked by Neon firewall')
    
    process.exit(1)
  } finally {
    if (client) {
      client.release()
    }
    await pool.end()
  }
}

testConnection()
