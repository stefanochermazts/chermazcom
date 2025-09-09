#!/usr/bin/env node

import { readdir, rename, readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'

const insightsDir = 'src/content/insights'

async function fixEnInsights() {
  const files = await readdir(insightsDir)
  const mdxFiles = files.filter(f => f.endsWith('.mdx') && !f.startsWith('en-') && !f.includes('sl_backup'))
  
  console.log(`Checking ${mdxFiles.length} files...`)
  
  for (const file of mdxFiles) {
    const filePath = join(insightsDir, file)
    const content = await readFile(filePath, 'utf-8')
    
    // Se ha lang: en, è un file inglese da rinominare
    if (content.includes('lang: en')) {
      const newFileName = `en-${file}`
      const newPath = join(insightsDir, newFileName)
      
      // Aggiorna anche il slug
      let updatedContent = content
      if (content.includes('slug:')) {
        updatedContent = content.replace(/^slug:\s*(.+)$/m, (match, slug) => `slug: en-${slug.trim()}`)
      } else {
        // Aggiungi slug se mancante
        const frontmatterEnd = content.indexOf('---', 3)
        if (frontmatterEnd > 0) {
          const baseSlug = file.replace('.mdx', '')
          const before = content.substring(0, frontmatterEnd)
          const after = content.substring(frontmatterEnd)
          updatedContent = before + `slug: en-${baseSlug}\n` + after
        }
      }
      
      await writeFile(newPath, updatedContent)
      await unlink(filePath)
      console.log(`✅ Moved EN file: ${file} → ${newFileName}`)
    }
  }
  
  console.log('✅ All EN insights processed!')
}

fixEnInsights().catch(console.error)
