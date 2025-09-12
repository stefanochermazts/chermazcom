#!/usr/bin/env node

/**
 * Script per convertire YAML multilinea in stringhe normali nei frontmatter MDX
 * Risolve problemi di schema Astro con title:>-, excerpt:>-, description:>-
 */

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

const DRY_RUN = process.argv.includes('--dry-run')
const VERBOSE = process.argv.includes('--verbose')

async function fixYamlMultiline(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    let modified = content
    let changes = 0
    
    // Pattern per title: >-
    const titlePattern = /title:\s*>-\s*\n(\s*.*\n?)+?(?=\w+:|\n---|\n\n)/gm
    modified = modified.replace(titlePattern, (match) => {
      const lines = match.split('\n')
      const titleText = lines.slice(1, -1)
        .map(line => line.trim())
        .filter(line => line)
        .join(' ')
      changes++
      return `title: "${titleText}"\n`
    })
    
    // Pattern per excerpt: >-
    const excerptPattern = /excerpt:\s*>-\s*\n(\s*.*\n?)+?(?=\w+:|\n---|\n\n)/gm
    modified = modified.replace(excerptPattern, (match) => {
      const lines = match.split('\n')
      const excerptText = lines.slice(1, -1)
        .map(line => line.trim())
        .filter(line => line)
        .join(' ')
      changes++
      return `excerpt: "${excerptText}"`
    })
    
    // Pattern per description: >-
    const descriptionPattern = /description:\s*>-\s*\n(\s*.*\n?)+?(?=\w+:|\n---|\n\n)/gm
    modified = modified.replace(descriptionPattern, (match) => {
      const lines = match.split('\n')
      const descriptionText = lines.slice(1, -1)
        .map(line => line.trim())
        .filter(line => line)
        .join(' ')
      changes++
      return `description: "${descriptionText}"`
    })
    
    // Pattern per slug: >- (se presente)
    const slugPattern = /slug:\s*>-\s*\n(\s*.*\n?)+?(?=\w+:|\n---|\n\n)/gm
    modified = modified.replace(slugPattern, (match) => {
      const lines = match.split('\n')
      const slugText = lines.slice(1, -1)
        .map(line => line.trim())
        .filter(line => line)
        .join('')
      changes++
      return `slug: "${slugText}"`
    })
    
    if (changes > 0) {
      if (DRY_RUN) {
        console.log(`[DRY RUN] ${path.basename(filePath)}: ${changes} modifiche`)
        if (VERBOSE) {
          console.log('Anteprima modifiche:')
          const diff = content !== modified
          if (diff) {
            console.log('  - YAML multilinea convertito in stringhe')
          }
        }
      } else {
        await fs.writeFile(filePath, modified, 'utf-8')
        console.log(`✅ ${path.basename(filePath)}: ${changes} modifiche applicate`)
      }
      return { success: true, changes }
    } else {
      if (VERBOSE) {
        console.log(`➡️  ${path.basename(filePath)}: nessuna modifica necessaria`)
      }
      return { success: true, changes: 0 }
    }
    
  } catch (error) {
    console.error(`❌ Errore processando ${filePath}:`, error.message)
    return { success: false, changes: 0 }
  }
}

async function main() {
  console.log('🔧 YAML Multiline Fixer - Chermaz.com')
  console.log('=====================================')
  
  if (DRY_RUN) {
    console.log('🔍 Modalità DRY RUN - nessun file verrà modificato')
  }
  
  // Trova tutti i file MDX
  const patterns = [
    'src/content/insights/*.mdx',
    'src/content/case-studies/*.mdx', 
    'src/content/pages/*.mdx'
  ]
  
  const allFiles = []
  for (const pattern of patterns) {
    try {
      const files = await glob(pattern)
      allFiles.push(...files)
    } catch (error) {
      console.log(`⚠️  Pattern ${pattern} non trovato`)
    }
  }
  
  console.log(`📁 Trovati ${allFiles.length} file MDX da controllare`)
  
  let totalFiles = 0
  let totalChanges = 0
  let successCount = 0
  let errorCount = 0
  
  for (const file of allFiles) {
    const result = await fixYamlMultiline(file)
    totalFiles++
    
    if (result.success) {
      successCount++
      totalChanges += result.changes
    } else {
      errorCount++
    }
  }
  
  console.log('\n📊 Risultati:')
  console.log(`📁 File processati: ${totalFiles}`)
  console.log(`✅ Successi: ${successCount}`)
  console.log(`❌ Errori: ${errorCount}`)
  console.log(`🔧 Modifiche totali: ${totalChanges}`)
  
  if (DRY_RUN) {
    console.log('\n💡 Per applicare le modifiche: node scripts/fix-yaml-multiline.mjs')
  } else {
    console.log('\n🎉 Completato! I file con YAML multilinea sono stati sistemati.')
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
