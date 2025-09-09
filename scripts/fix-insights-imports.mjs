#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const insightsDir = 'src/content/insights'

async function fixImports() {
  const files = await readdir(insightsDir)
  const mdxFiles = files.filter(f => f.endsWith('.mdx'))

  console.log(`Processing ${mdxFiles.length} MDX files...`)

  for (const file of mdxFiles) {
    const filePath = join(insightsDir, file)
    let content = await readFile(filePath, 'utf-8')

    // Fix import paths: from ../../../components/ to ../../components/
    const updatedContent = content.replace(
      /import\s+(.+?)\s+from\s+['"]\.\.\/\.\.\/\.\.\/components\/(.+?)['"]/g,
      "import $1 from '../../components/$2'"
    )

    if (content !== updatedContent) {
      await writeFile(filePath, updatedContent)
      console.log(`✅ Fixed imports in: ${file}`)
    }
  }

  console.log('✅ All imports fixed!')
}

fixImports().catch(console.error)
