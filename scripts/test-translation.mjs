#!/usr/bin/env node

/**
 * Script di test per verificare la traduzione su un singolo file
 */

import fs from 'fs/promises'
import path from 'path'

// Test file di esempio
const testMDX = `---
title: "Test Article"
slug: test-article
excerpt: "Questo è un articolo di prova per testare la traduzione automatica."
lang: it
status: publish
tags: ["Test", "Traduzione", "MDX"]
---

# Test di Traduzione

Questo è un **articolo di prova** per testare il sistema di traduzione automatica usando OpenAI.

## Caratteristiche

- Traduzione del frontmatter
- Preservazione della struttura MDX
- Gestione di link e formattazione
- Mantenimento dei termini tecnici

## Esempio di codice

Questo codice non deve essere tradotto:

\`\`\`javascript
function hello() {
  console.log("Hello World!")
}
\`\`\`

## Conclusione

Se tutto funziona correttamente, questo contenuto dovrebbe essere tradotto mantenendo la struttura e la formattazione originale.

[Link di esempio](/it/servizi/)
`

async function createTestFile() {
  const testDir = 'scripts/test'
  const testFile = path.join(testDir, 'test-article.mdx')
  
  try {
    // Crea directory di test
    await fs.mkdir(testDir, { recursive: true })
    
    // Scrivi file di test
    await fs.writeFile(testFile, testMDX, 'utf-8')
    
    console.log(`✅ Test file created: ${testFile}`)
    console.log(`\n🧪 To test translation, run:`)
    console.log(`export OPENAI_API_KEY="your-api-key"`)
    console.log(`node scripts/translate-mdx.mjs --target=en --collection=test --dry-run`)
    console.log(`\n📁 Test directory structure:`)
    console.log(`scripts/test/`)
    console.log(`  └── test-article.mdx`)
    
  } catch (error) {
    console.error(`❌ Error creating test file: ${error.message}`)
  }
}

createTestFile()
