#!/usr/bin/env node

import fs from 'fs'
import { glob } from 'glob'

console.log('🔧 Converting single quotes to double quotes for fields with apostrophes...')

const files = glob.sync('src/content/**/*.mdx')
let fixedCount = 0

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf-8')
    const originalContent = content
    
    // Lavora solo sul frontmatter
    const parts = content.split('---')
    if (parts.length >= 3) {
      let frontmatter = parts[1]
      
      // Converti single quotes a double quotes per campi con apostrofi
      frontmatter = frontmatter.replace(
        /(title|excerpt|description):\s*'([^']*'[^']*)'/g,
        (match, field, value) => {
          // Escape le double quotes esistenti nel valore
          const escapedValue = value.replace(/"/g, '\\"')
          return `${field}: "${escapedValue}"`
        }
      )
      
      parts[1] = frontmatter
      content = parts.join('---')
      
      if (content !== originalContent) {
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
console.log('✅ Done!')
