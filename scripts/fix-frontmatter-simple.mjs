#!/usr/bin/env node

/**
 * Script semplice per correggere frontmatter malformato nei file MDX
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
      
      // Pattern per rimuovere i --- vuoti all'inizio
      let fixedContent = content
      
      // Rimuovi righe vuote di --- all'inizio del file
      const lines = content.split('\\n')
      let validStart = -1
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Trova il primo --- seguito da contenuto valido
        if (line === '---') {
          // Cerca la prima riga non vuota dopo questo ---
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim()
            if (nextLine !== '' && nextLine !== '---') {
              // Trovato contenuto valido
              validStart = i
              break
            } else if (nextLine === '---') {
              // Trovato un altro ---, salta
              break
            }
          }
          if (validStart !== -1) break
        }
      }
      
      if (validStart > 0) {
        // Ricostruisci il file partendo dal frontmatter valido
        const validLines = lines.slice(validStart)
        fixedContent = validLines.join('\\n')
        
        await fs.writeFile(file, fixedContent, 'utf-8')
        fixedCount++
        console.log(`✅ Fixed: ${file}`)
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${file}: ${error.message}`)
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
