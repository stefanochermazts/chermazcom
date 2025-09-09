#!/usr/bin/env node

import fs from 'fs'
import { glob } from 'glob'

console.log('🔧 Final fix for ALL malformed frontmatter files...')

const files = glob.sync('src/content/**/*.mdx')
let fixedCount = 0

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf-8')
    let changed = false
    
    // Fix 1: Rimuovi --- vuoti all'inizio
    const beforeStart = content
    content = content.replace(/^---\\s*\\n\\s*---\\s*\\n\\s*/, '')
    if (content !== beforeStart) {
      changed = true
      console.log(`📝 Fixed start pattern: ${file}`)
    }
    
    // Fix 2: Rimuovi --- vuoti nel mezzo
    const beforeMiddle = content
    content = content.replace(/---\\s*\\n\\s*---\\s*\\n\\s*(?=---\\s*\\n)/g, '')
    if (content !== beforeMiddle) {
      changed = true
      console.log(`📝 Fixed middle pattern: ${file}`)
    }
    
    // Fix 3: Rimuovi tag HTML orfani semplici
    const beforeOrphans = content
    content = content.replace(/\s*<\/div>\s*$/g, '')
    if (content !== beforeOrphans) {
      changed = true
      console.log(`📝 Fixed orphan tags: ${file}`)
    }
    
    if (changed) {
      fs.writeFileSync(file, content)
      fixedCount++
      console.log(`✅ Fixed: ${file}`)
    }
    
  } catch (error) {
    console.error(`❌ Error: ${file} - ${error.message}`)
  }
}

console.log(`\\n📊 Fixed ${fixedCount} files total`)
console.log('✅ All malformed frontmatter should now be fixed!')
