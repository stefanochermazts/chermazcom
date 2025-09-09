#!/usr/bin/env node

/**
 * Script diretto per correggere frontmatter malformato
 */

import fs from 'fs/promises'
import { glob } from 'glob'

async function fixFrontmatter() {
  console.log('🔧 Fixing malformed frontmatter in MDX files...')
  
  const files = await glob('src/content/**/*.mdx')
  let fixedCount = 0
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\\n')
      
      // Debug per file specifico
      if (file.includes('en-privacy')) {
        console.log(`🔍 Debugging ${file}`)
        console.log(`First 3 lines: "${lines[0]}", "${lines[1]}", "${lines[2]}"`)
        console.log(`Condition: ${lines[0] === '---' && lines[1] === '' && lines[2] === '---'}`)
      }
      
      // Verifica se inizia con --- vuoti
      if (lines[0] === '---' && lines[1] === '' && lines[2] === '---') {
        console.log(`📄 Fixing: ${file}`)
        
        // Trova il frontmatter vero
        let realStart = -1
        for (let i = 2; i < lines.length; i++) {
          if (lines[i] === '---' && i + 1 < lines.length && lines[i + 1] !== '') {
            realStart = i
            console.log(`   Found real start at line ${i}: "${lines[i+1]}"`)
            break
          }
        }
        console.log(`   Real start: ${realStart}`)
        
        if (realStart !== -1) {
          const fixedContent = lines.slice(realStart).join('\\n')
          await fs.writeFile(file, fixedContent, 'utf-8')
          fixedCount++
          console.log(`   ✅ Fixed: removed ${realStart} empty lines`)
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${file}: ${error.message}`)
    }
  }
  
  console.log(`\\n📊 Fixed ${fixedCount} files`)
}

fixFrontmatter()
  .then(() => console.log('✅ Done!'))
  .catch(console.error)
