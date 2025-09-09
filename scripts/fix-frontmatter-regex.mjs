#!/usr/bin/env node

/**
 * Script con regex per correggere frontmatter malformato
 */

import fs from 'fs/promises'
import { glob } from 'glob'

async function fixFrontmatter() {
  console.log('🔧 Fixing malformed frontmatter with regex...')
  
  const files = await glob('src/content/**/*.mdx')
  let fixedCount = 0
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      
      // Pattern per il frontmatter malformato
      if (content.includes('---\\n\\n---\\n\\n---\\n')) {
        console.log(`📄 Fixing: ${file}`)
        
        // Rimuovi pattern specifico dei tripli --- vuoti
        const fixedContent = content.replace(/---\\n\\n---\\n\\n(?=---\\n)/g, '')
        
        await fs.writeFile(file, fixedContent, 'utf-8')
        fixedCount++
        console.log(`   ✅ Removed empty frontmatter blocks`)
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
