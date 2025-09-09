#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const enInsightsDir = 'src/content/insights/en'

async function updateLangField() {
  const files = await readdir(enInsightsDir)
  const mdxFiles = files.filter(f => f.endsWith('.mdx'))

  console.log(`Processing ${mdxFiles.length} EN insight files...`)

  for (const file of mdxFiles) {
    const filePath = join(enInsightsDir, file)
    let content = await readFile(filePath, 'utf-8')

    // Replace lang: it with lang: en in frontmatter
    const updatedContent = content.replace(/^lang:\s*it\s*$/m, 'lang: en')

    if (content !== updatedContent) {
      await writeFile(filePath, updatedContent)
      console.log(`✅ Updated lang field in: ${file}`)
    } else {
      console.log(`⚠️ No lang: it found in: ${file}`)
    }
  }

  console.log('✅ All EN insights updated!')
}

updateLangField().catch(console.error)
