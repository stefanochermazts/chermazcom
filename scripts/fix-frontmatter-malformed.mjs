#!/usr/bin/env node

/**
 * Script per correggere frontmatter malformato nei file MDX
 * Rimuove i tripli --- che causano errori nel parsing
 */

import fs from 'fs/promises'
import { glob } from 'glob'

async function fixFrontmatter() {
  console.log('🔧 Fixing malformed frontmatter in MDX files...')
  
  // Trova tutti i file MDX
  const files = await glob('src/content/**/*.mdx')
  let fixedCount = 0
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      
      // Verifica se il file ha frontmatter malformato (tripli --- all'inizio)
      const lines = content.split('\\n')
      const hasMultipleDashes = lines.slice(0, 10).filter(line => line.trim() === '---').length > 2
      
      if (hasMultipleDashes) {
        
        console.log(`📄 Fixing: ${file}`)
        
        // Trova dove inizia il frontmatter valido
        let frontmatterStart = -1
        let frontmatterEnd = -1
        let dashCount = 0
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          
          if (line === '---') {
            dashCount++
            if (dashCount === 1 && frontmatterStart === -1) {
              // Cerca il primo --- seguito da contenuto valido
              if (i + 1 < lines.length && lines[i + 1].trim() !== '' && lines[i + 1].trim() !== '---') {
                frontmatterStart = i
              }
            } else if (frontmatterStart !== -1 && frontmatterEnd === -1) {
              frontmatterEnd = i
              break
            }
          } else if (line !== '' && frontmatterStart === -1) {
            // Se troviamo contenuto prima del frontmatter valido, cerchiamo il prossimo ---
            continue
          }
        }
        
        if (frontmatterStart !== -1 && frontmatterEnd !== -1) {
          // Ricostruisci il file con frontmatter corretto
          const frontmatter = lines.slice(frontmatterStart + 1, frontmatterEnd).join('\\n')
          const content = lines.slice(frontmatterEnd + 1).join('\\n').trim()
          
          const fixedContent = `---\\n${frontmatter}\\n---\\n\\n${content}`
          
          await fs.writeFile(file, fixedContent, 'utf-8')
          fixedCount++
          console.log(`   ✅ Fixed frontmatter`)
        } else {
          console.log(`   ⚠️  Could not parse frontmatter structure`)
        }
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${file}: ${error.message}`)
    }
  }
  
  console.log(`\\n📊 Fixed ${fixedCount} files`)
}

// Esegui lo script
fixFrontmatter()
  .then(() => {
    console.log('✅ Frontmatter cleanup completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message)
    process.exit(1)
  })
