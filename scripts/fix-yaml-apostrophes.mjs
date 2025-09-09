#!/usr/bin/env node

import fs from 'fs'
import { glob } from 'glob'

console.log('🔧 Fixing YAML apostrophes in frontmatter...')

const files = glob.sync('src/content/**/*.mdx')
let fixedCount = 0

// Pattern comuni di apostrofi problematici
const patterns = [
  { from: "d'uso", to: "d''uso" },
  { from: "sull'", to: "sull''" },
  { from: "l'", to: "l''" },  
  { from: "un'", to: "un''" },
  { from: "all'", to: "all''" },
  { from: "dell'", to: "dell''" },
  { from: "nell'", to: "nell''" },
]

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf-8')
    const originalContent = content
    
    // Lavora solo sul frontmatter (tra i primi ---)
    const parts = content.split('---')
    if (parts.length >= 3) {
      let frontmatter = parts[1]
      
      // Applica fix solo alle linee con single quotes nel frontmatter
      const lines = frontmatter.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes("'") && (line.includes('title:') || line.includes('excerpt:') || line.includes('description:'))) {
          let fixedLine = line
          for (const pattern of patterns) {
            fixedLine = fixedLine.replace(new RegExp(pattern.from, 'g'), pattern.to)
          }
          if (fixedLine !== line) {
            lines[i] = fixedLine
            console.log(`   Fixed in ${file}: ${line.trim()} -> ${fixedLine.trim()}`)
          }
        }
      }
      
      parts[1] = lines.join('\n')
      content = parts.join('---')
      
      if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf-8')
        fixedCount++
      }
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`)
  }
}

console.log(`📊 Fixed ${fixedCount} files`)
console.log('✅ Done!')
