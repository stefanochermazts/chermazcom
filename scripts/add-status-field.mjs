#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configurazione
const INSIGHTS_DIR = path.join(__dirname, '..', 'src', 'content', 'insights')
const STATUS_FIELD = 'status: publish'

/**
 * Controlla se un file MDX ha già il campo status
 */
function hasStatusField(content) {
  return /^status:\s*.+$/m.test(content)
}

/**
 * Aggiunge il campo status al frontmatter
 */
function addStatusField(content) {
  // Trova la fine del frontmatter (secondo ---)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  
  if (!frontmatterMatch) {
    console.log('❌ Frontmatter non trovato')
    return content
  }

  const frontmatter = frontmatterMatch[1]
  const restOfContent = content.substring(frontmatterMatch[0].length)

  // Trova dove inserire il campo status (dopo slug se presente, altrimenti dopo title)
  const lines = frontmatter.split('\n')
  let insertIndex = -1

  // Cerca prima slug, poi title
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('slug:')) {
      insertIndex = i + 1
      break
    }
  }

  if (insertIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('title:')) {
        insertIndex = i + 1
        break
      }
    }
  }

  // Se non trova né slug né title, inserisce alla fine del frontmatter
  if (insertIndex === -1) {
    insertIndex = lines.length
  }

  // Inserisce il campo status
  lines.splice(insertIndex, 0, STATUS_FIELD)

  // Ricostruisce il contenuto
  const newFrontmatter = lines.join('\n')
  return `---\n${newFrontmatter}\n---${restOfContent}`
}

/**
 * Processa un singolo file MDX
 */
async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    
    if (hasStatusField(content)) {
      return { updated: false, reason: 'Campo status già presente' }
    }

    const newContent = addStatusField(content)
    await fs.writeFile(filePath, newContent, 'utf-8')
    
    return { updated: true, reason: 'Campo status aggiunto' }
  } catch (error) {
    return { updated: false, reason: `Errore: ${error.message}` }
  }
}

/**
 * Script principale
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

  console.log('🔍 Ricerca file MDX senza campo status...\n')

  try {
    const files = await fs.readdir(INSIGHTS_DIR)
    const mdxFiles = files.filter(file => file.endsWith('.mdx'))

    console.log(`📁 Trovati ${mdxFiles.length} file MDX in ${INSIGHTS_DIR}`)

    let updatedCount = 0
    let skippedCount = 0
    const results = []

    for (const file of mdxFiles) {
      const filePath = path.join(INSIGHTS_DIR, file)
      const content = await fs.readFile(filePath, 'utf-8')
      
      if (hasStatusField(content)) {
        skippedCount++
        if (verbose) {
          results.push({ file, action: 'SKIP', reason: 'Campo status già presente' })
        }
        continue
      }

      if (dryRun) {
        results.push({ file, action: 'WOULD_ADD', reason: 'Campo status verrebbe aggiunto' })
        updatedCount++
      } else {
        const result = await processFile(filePath)
        if (result.updated) {
          updatedCount++
          results.push({ file, action: 'ADDED', reason: result.reason })
        } else {
          skippedCount++
          results.push({ file, action: 'ERROR', reason: result.reason })
        }
      }
    }

    // Mostra risultati
    console.log('\n📊 Risultati:')
    console.log(`✅ File ${dryRun ? 'da aggiornare' : 'aggiornati'}: ${updatedCount}`)
    console.log(`⏭️  File saltati: ${skippedCount}`)

    if (verbose || dryRun) {
      console.log('\n📋 Dettagli:')
      results.forEach(({ file, action, reason }) => {
        const icon = action === 'ADDED' || action === 'WOULD_ADD' ? '✅' : 
                    action === 'SKIP' ? '⏭️' : '❌'
        console.log(`${icon} ${file}: ${reason}`)
      })
    }

    if (dryRun) {
      console.log('\n🔄 Per applicare le modifiche, esegui lo script senza --dry-run')
    } else if (updatedCount > 0) {
      console.log('\n🎉 Operazione completata con successo!')
    }

  } catch (error) {
    console.error('❌ Errore durante l\'elaborazione:', error.message)
    process.exit(1)
  }
}

// Esegui script
main().catch(console.error)
