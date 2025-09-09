#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

console.log('🔧 Finding and fixing ALL broken frontmatter files...')

const files = glob.sync('src/content/**/*.mdx')
let fixedCount = 0
let totalChecked = 0

for (const file of files) {
  try {
    totalChecked++
    const content = fs.readFileSync(file, 'utf-8')
    
    // Pattern più generico per trovare frontmatter malformato
    const hasTripleDashes = (content.match(/^---/gm) || []).length > 2
    const startsWithBadPattern = content.match(/^---\\s*\\n\\s*---\\s*\\n\\s*---\\s*\\n/)
    
    if (hasTripleDashes || startsWithBadPattern) {
      console.log(`🔍 Checking: ${file}`)
      
      // Strategia: trova l'ultimo --- che ha contenuto dopo
      const lines = content.split('\\n')
      let lastValidDashIndex = -1
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          // Controlla se dopo c'è contenuto reale (non vuoto e non altri ---)
          let hasRealContent = false
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            const nextLine = lines[j].trim()
            if (nextLine && nextLine !== '---' && nextLine.includes(':')) {
              hasRealContent = true
              break
            }
            if (nextLine === '---') break
          }
          if (hasRealContent) {
            lastValidDashIndex = i
            break
          }
        }
      }
      
      if (lastValidDashIndex > 0) {
        const fixedContent = lines.slice(lastValidDashIndex).join('\\n')
        fs.writeFileSync(file, fixedContent)
        fixedCount++
        console.log(`✅ Fixed: removed ${lastValidDashIndex} bad lines from ${path.basename(file)}`)
      } else {
        console.log(`⚠️  Could not fix: ${path.basename(file)}`)
      }
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`)
  }
}

console.log(`\\n📊 Checked ${totalChecked} files, fixed ${fixedCount} files`)
console.log('✅ Frontmatter cleanup completed!')
