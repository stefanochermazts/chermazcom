#!/usr/bin/env node

import { readdir, rename, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const insightsDir = 'src/content/insights'

async function renameEnInsights() {
  const files = await readdir(insightsDir)
  
  // Identifica file con lang: en (gli insights inglesi)
  const enFiles = []
  for (const file of files) {
    if (!file.endsWith('.mdx')) continue
    
    const filePath = join(insightsDir, file)
    const content = await readFile(filePath, 'utf-8')
    
    // Controlla se ha lang: en
    if (content.includes('lang: en')) {
      enFiles.push(file)
    }
  }
  
  console.log(`Found ${enFiles.length} EN insight files to rename...`)
  
  for (const file of enFiles) {
    const oldPath = join(insightsDir, file)
    const newFileName = `en-${file}`
    const newPath = join(insightsDir, newFileName)
    
    // Rinomina il file
    await rename(oldPath, newPath)
    
    // Leggi e aggiorna il slug nel frontmatter
    let content = await readFile(newPath, 'utf-8')
    
    // Trova il slug e aggiorna con prefisso en-
    const slugMatch = content.match(/^slug:\s*(.+)$/m)
    if (slugMatch) {
      const oldSlug = slugMatch[1].trim()
      const newSlug = `en-${oldSlug}`
      content = content.replace(/^slug:\s*.+$/m, `slug: ${newSlug}`)
    } else {
      // Se non c'è slug, aggiungi uno basato sul filename
      const baseSlug = file.replace('.mdx', '')
      const frontmatterEnd = content.indexOf('---', 3)
      const beforeEnd = content.substring(0, frontmatterEnd)
      const afterEnd = content.substring(frontmatterEnd)
      content = beforeEnd + `slug: en-${baseSlug}\n` + afterEnd
    }
    
    await writeFile(newPath, content)
    console.log(`✅ Renamed and updated: ${file} → ${newFileName}`)
  }
  
  console.log('✅ All EN insights renamed and updated!')
}

renameEnInsights().catch(console.error)
