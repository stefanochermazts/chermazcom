#!/usr/bin/env node

import { glob } from 'glob'
import path from 'path'

console.log('🧪 Testing script execution...')

async function testGlob() {
  try {
    console.log('📁 Searching for files...')
    
    const pattern = 'src/content/pages/*.mdx'
    console.log(`Pattern: ${pattern}`)
    
    const allFiles = await glob(pattern)
    console.log(`Found ${allFiles.length} total files:`)
    allFiles.forEach(file => console.log(`  - ${file}`))
    
    // Filtra file che NON hanno prefisso lingua (sono originali italiani)
    const sourceFiles = allFiles.filter(file => {
      const fileName = path.basename(file)
      return !fileName.startsWith('en-') && !fileName.startsWith('sl-')
    })
    
    console.log(`\nFound ${sourceFiles.length} source files (without prefixes):`)
    sourceFiles.forEach(file => console.log(`  - ${file}`))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testGlob()
