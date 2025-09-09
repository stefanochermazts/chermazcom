#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const caseStudiesDir = 'src/content/case-studies'

async function createAllSlCaseStudies() {
  const files = await readdir(caseStudiesDir)
  
  // Trova tutti i file italiani (senza prefisso e non backup)
  const italianFiles = files.filter(f => 
    f.endsWith('.mdx') && 
    !f.startsWith('en-') && 
    !f.startsWith('sl-') &&
    !f.includes('backup')
  )
  
  console.log(`Found ${italianFiles.length} Italian case study files to copy...`)
  
  for (const file of italianFiles) {
    const italianPath = join(caseStudiesDir, file)
    const slFileName = `sl-${file}`
    const slPath = join(caseStudiesDir, slFileName)
    
    // Leggi il file italiano
    let content = await readFile(italianPath, 'utf-8')
    
    // Cambia lang: it → lang: sl
    content = content.replace(/^lang:\s*it\s*$/m, 'lang: sl')
    
    // Aggiorna o aggiungi il slug con prefisso sl-
    const baseSlug = file.replace('.mdx', '')
    if (content.includes('slug:')) {
      content = content.replace(/^slug:\s*(.+)$/m, `slug: sl-${baseSlug}`)
    } else {
      // Aggiungi slug nel frontmatter
      const frontmatterEnd = content.indexOf('---', 3)
      if (frontmatterEnd > 0) {
        const before = content.substring(0, frontmatterEnd)
        const after = content.substring(frontmatterEnd)
        content = before + `slug: sl-${baseSlug}\n` + after
      }
    }
    
    // Scrivi il file SL
    await writeFile(slPath, content)
    console.log(`✅ Created: ${slFileName}`)
  }
  
  console.log(`✅ Created ${italianFiles.length} SL case study files!`)
}

createAllSlCaseStudies().catch(console.error)
