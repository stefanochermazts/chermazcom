#!/usr/bin/env node

import fs from 'fs'
import { glob } from 'glob'

console.log('🔧 Fixing all malformed frontmatter...')

const files = glob.sync('src/content/**/*.mdx')
let fixedCount = 0

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf-8')
    
    if (content.includes('---\\n\\n---\\n\\n---\\n')) {
      const fixed = content.replace(/---\\n\\n---\\n\\n(?=---\\n)/g, '')
      fs.writeFileSync(file, fixed)
      fixedCount++
      console.log(`✅ Fixed: ${file}`)
    }
  } catch (error) {
    console.error(`❌ Error: ${file} - ${error.message}`)
  }
}

console.log(`\\n📊 Fixed ${fixedCount} files total`)
