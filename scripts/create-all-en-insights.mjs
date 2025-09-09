#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const insightsDir = 'src/content/insights'

async function createAllEnInsights() {
  const files = await readdir(insightsDir)
  
  // Trova tutti i file italiani (senza prefisso e non backup)
  const italianFiles = files.filter(f => 
    f.endsWith('.mdx') && 
    !f.startsWith('en-') && 
    !f.includes('sl_backup')
  )
  
  console.log(`Found ${italianFiles.length} Italian files to copy...`)
  
  for (const file of italianFiles) {
    const italianPath = join(insightsDir, file)
    const enFileName = `en-${file}`
    const enPath = join(insightsDir, enFileName)
    
    // Leggi il file italiano
    let content = await readFile(italianPath, 'utf-8')
    
    // Cambia lang: it → lang: en
    content = content.replace(/^lang:\s*it\s*$/m, 'lang: en')
    
    // Aggiorna o aggiungi il slug con prefisso en-
    const baseSlug = file.replace('.mdx', '')
    if (content.includes('slug:')) {
      content = content.replace(/^slug:\s*(.+)$/m, `slug: en-${baseSlug}`)
    } else {
      // Aggiungi slug nel frontmatter
      const frontmatterEnd = content.indexOf('---', 3)
      if (frontmatterEnd > 0) {
        const before = content.substring(0, frontmatterEnd)
        const after = content.substring(frontmatterEnd)
        content = before + `slug: en-${baseSlug}\n` + after
      }
    }
    
    // Scrivi il file EN
    await writeFile(enPath, content)
    console.log(`✅ Created: ${enFileName}`)
  }
  
  console.log(`✅ Created ${italianFiles.length} EN insight files!`)
}

createAllEnInsights().catch(console.error)
