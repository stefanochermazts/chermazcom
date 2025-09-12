#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processFile as formatBasic, scanMdxFiles } from './format-mdx.mjs';
import { 
  applyAdvancedFormatting,
  addTableOfContents,
  addMetaInfo,
  improveAccessibility,
  optimizeForSEO
} from './enhance-mdx.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione
const CONTENT_DIR = path.join(__dirname, 'src/content');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const BASIC_ONLY = process.argv.includes('--basic-only');
const ADVANCED_ONLY = process.argv.includes('--advanced-only');
const ADD_TOC = process.argv.includes('--add-toc');
const ADD_META = process.argv.includes('--add-meta');
const IMPROVE_A11Y = process.argv.includes('--improve-accessibility');
const SEO_OPTIMIZE = process.argv.includes('--seo-optimize');

// Funzione per estrarre frontmatter
function extractFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) return { frontmatter: '', content: content };
  
  return {
    frontmatter: match[1],
    content: match[2]
  };
}

// Funzione principale per processare un file con tutte le opzioni
function processFileComprehensive(filePath) {
  try {
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, content: bodyContent } = extractFrontmatter(originalContent);
    
    if (VERBOSE) {
      console.log(`\n📁 Processing: ${path.relative(CONTENT_DIR, filePath)}`);
    }

    let processedContent = bodyContent;

    // Applica formattazione base (bold, italic, emoji)
    if (!ADVANCED_ONLY) {
      if (VERBOSE) console.log('  🎨 Applicando formattazione base...');
      
      // Usa la funzione del primo script per formattazione base
      const tempFile = filePath + '.temp';
      fs.writeFileSync(tempFile, originalContent, 'utf-8');
      formatBasic(tempFile);
      const basicFormatted = fs.readFileSync(tempFile, 'utf-8');
      fs.unlinkSync(tempFile);
      
      const { content: basicContent } = extractFrontmatter(basicFormatted);
      processedContent = basicContent;
    }

    // Applica formattazioni avanzate
    if (!BASIC_ONLY) {
      if (VERBOSE) console.log('  ✨ Applicando formattazioni avanzate...');
      processedContent = applyAdvancedFormatting(processedContent);
    }

    // Aggiunge indice se richiesto
    if (ADD_TOC) {
      if (VERBOSE) console.log('  📋 Aggiungendo indice...');
      processedContent = addTableOfContents(processedContent);
    }

    // Aggiunge meta informazioni se richiesto
    if (ADD_META) {
      if (VERBOSE) console.log('  📊 Aggiungendo meta informazioni...');
      processedContent = addMetaInfo(processedContent, frontmatter);
    }

    // Migliora accessibilità se richiesto
    if (IMPROVE_A11Y) {
      if (VERBOSE) console.log('  ♿ Migliorando accessibilità...');
      processedContent = improveAccessibility(processedContent);
    }

    // Ottimizza per SEO se richiesto
    if (SEO_OPTIMIZE) {
      if (VERBOSE) console.log('  🔍 Ottimizzando per SEO...');
      processedContent = optimizeForSEO(processedContent);
    }

    // Ricostruisce il file finale
    const finalContent = `---\n${frontmatter}\n---\n${processedContent}`;

    if (DRY_RUN) {
      console.log(`🔍 [DRY RUN] Would format: ${path.relative(CONTENT_DIR, filePath)}`);
      
      // Mostra un estratto delle modifiche
      if (VERBOSE) {
        const originalLines = bodyContent.split('\n').slice(0, 10);
        const processedLines = processedContent.split('\n').slice(0, 10);
        console.log('📝 Preview (primi 10 righe):');
        processedLines.forEach((line, i) => {
          if (line !== originalLines[i]) {
            console.log(`   ${i + 1}: ${line}`);
          }
        });
      }
    } else {
      fs.writeFileSync(filePath, finalContent, 'utf-8');
      console.log(`✅ Formatted: ${path.relative(CONTENT_DIR, filePath)}`);
    }

    return true;

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Funzione per mostrare l'help
function showHelp() {
  console.log(`
🚀 Comprehensive MDX Formatter - Chermaz.com
==========================================

Utilizzo: node format-all-mdx.mjs [opzioni]

Opzioni:
  --dry-run              Mostra le modifiche senza applicarle
  --verbose              Output dettagliato
  --basic-only          Solo formattazione base (bold, italic, emoji)
  --advanced-only       Solo formattazioni avanzate
  --add-toc             Aggiunge indice automatico
  --add-meta            Aggiunge info articolo (parole, tempo lettura)
  --improve-accessibility  Migliora accessibilità
  --seo-optimize        Ottimizza per SEO
  --help                Mostra questo help

Esempi:
  node format-all-mdx.mjs --dry-run --verbose
  node format-all-mdx.mjs --add-toc --add-meta
  node format-all-mdx.mjs --basic-only
  node format-all-mdx.mjs --improve-accessibility --seo-optimize

Formattazioni incluse:
📝 Base: bold su termini tecnici, italic su enfasi, emoji contestuali
✨ Avanzate: callout boxes, codice inline, quote, metriche, warning
📋 TOC: indice automatico basato sui titoli
📊 Meta: conteggio parole e tempo di lettura
♿ A11y: alt text, link descriptivi
🔍 SEO: suggerimenti per parole chiave long-tail
  `);
}

// Funzione principale
function main() {
  // Mostra help se richiesto
  if (process.argv.includes('--help')) {
    showHelp();
    return;
  }

  console.log('🚀 Comprehensive MDX Formatter - Chermaz.com');
  console.log('==========================================');
  
  if (DRY_RUN) {
    console.log('🔍 Running in DRY RUN mode - no files will be modified');
  }

  // Mostra opzioni attive
  const activeOptions = [];
  if (!ADVANCED_ONLY) activeOptions.push('Formattazione base');
  if (!BASIC_ONLY) activeOptions.push('Formattazioni avanzate');
  if (ADD_TOC) activeOptions.push('Indice automatico');
  if (ADD_META) activeOptions.push('Meta informazioni');
  if (IMPROVE_A11Y) activeOptions.push('Accessibilità');
  if (SEO_OPTIMIZE) activeOptions.push('SEO');

  console.log('🎯 Opzioni attive:', activeOptions.join(', '));

  const mdxFiles = scanMdxFiles(CONTENT_DIR);

  if (mdxFiles.length === 0) {
    console.log('📁 No MDX files found in content directory');
    return;
  }

  console.log(`📊 Found ${mdxFiles.length} MDX files to process`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of mdxFiles) {
    if (processFileComprehensive(file)) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  console.log('\n📈 Summary:');
  console.log(`✅ Successfully processed: ${successCount} files`);
  console.log(`❌ Errors: ${errorCount} files`);

  if (DRY_RUN) {
    console.log('\n💡 Per applicare le modifiche, rimuovi --dry-run');
    console.log('💡 Per vedere più dettagli, aggiungi --verbose');
  } else {
    console.log('\n🎉 Formatting completed!');
  }

  console.log('\n📚 Per maggiori opzioni: node format-all-mdx.mjs --help');
}

// Esegui solo se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
