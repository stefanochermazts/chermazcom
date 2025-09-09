#!/usr/bin/env node

import fs from 'fs'
import { glob } from 'glob'

console.log('🔧 Converting problematic YAML fields to multiline format...')

const files = glob.sync('src/content/**/*.mdx')
let fixedCount = 0

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf-8')
    const originalContent = content
    
    // Split into frontmatter and body
    const parts = content.split('---')
    if (parts.length >= 3) {
      let frontmatter = parts[1]
      const originalFrontmatter = frontmatter
      
      // Convert title to multiline if it contains quotes or apostrophes
      frontmatter = frontmatter.replace(
        /^title:\s*["']([^"']*["'`][^"']*)["']$/gm,
        'title: >-\\n  $1'
      )
      
      // Convert excerpt to multiline if it contains quotes or apostrophes  
      frontmatter = frontmatter.replace(
        /^excerpt:\s*["']([^"']*["'`][^"']*)["']$/gm,
        'excerpt: >-\\n  $1'
      )
      
      // Clean up any remaining malformed quotes
      frontmatter = frontmatter.replace(/["']["']/g, "'")
      
      if (frontmatter !== originalFrontmatter) {
        parts[1] = frontmatter
        content = parts.join('---')
        
        fs.writeFileSync(file, content, 'utf-8')
        console.log(`✅ Fixed: ${file}`)
        fixedCount++
      }
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`)
  }
}

console.log(`📊 Fixed ${fixedCount} files`)
console.log('✅ All files converted to safe multiline YAML format!')
