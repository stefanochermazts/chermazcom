#!/usr/bin/env node

/**
 * Script per convertire tabelle markdown nel componente TakeawayTable
 * Uso: node convert-takeaway-table.js <file-path> [--title "Titolo Custom"]
 */

import fs from 'fs';
import path from 'path';

function convertMarkdownTable(content, customTitle = null) {
  // Pattern generico per trovare tabelle markdown a 2 colonne
  // Cerca: header opzionale + tabella con 2 colonne + righe dati
  const tablePattern = /((?:^##?\s+(.+)\n)?)\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\n\|[^|]*\|[^|]*\|\n((?:\|[^|]*\|[^|]*\|\n?)+)/gm;
  
  return content.replace(tablePattern, (match, headerSection, headerTitle, col1Header, col2Header, tableRows) => {
    // Determina il titolo da usare
    let title = customTitle || headerTitle || `${col1Header} e ${col2Header}`;
    title = title.trim();
    
    // Estrai le righe della tabella
    const rows = tableRows.trim().split('\n').filter(row => {
      const trimmed = row.trim();
      return trimmed && !trimmed.includes('---') && trimmed.includes('|');
    });
    
    // Converti ogni riga in oggetto
    const items = rows.map(row => {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      if (cells.length >= 2) {
        return {
          takeaway: cells[0].replace(/\*\*/g, ''), // Rimuovi markdown bold
          explanation: cells[1].replace(/\*\*/g, '') // Rimuovi markdown bold
        };
      }
      return null;
    }).filter(item => item !== null);

    // Se non ci sono items validi, mantieni la tabella originale
    if (items.length === 0) {
      return match;
    }

    // Genera il codice del componente
    const itemsCode = items.map(item => `    {
      takeaway: "<strong>${item.takeaway}</strong>",
      explanation: "${item.explanation}"
    }`).join(',\n');

    // Se c'era un header, non includerlo nel risultato (sarà sostituito dal componente)
    const importStatement = content.includes("import TakeawayTable") ? "" : "import TakeawayTable from '../../components/TakeawayTable.astro';\n\n";

    return `${importStatement}<TakeawayTable 
  title="${title}"
  items={[
${itemsCode}
  ]}
/>`;
  });
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Uso: node convert-takeaway-table.js <file-path> [--title "Titolo Custom"]');
    console.log('Esempi:');
    console.log('  node convert-takeaway-table.js src/content/insights/articolo.mdx');
    console.log('  node convert-takeaway-table.js articolo.mdx --title "Fasi del Processo"');
    process.exit(1);
  }

  let filePath = args[0];
  let customTitle = null;
  
  // Cerca il parametro --title
  const titleIndex = args.indexOf('--title');
  if (titleIndex !== -1 && args[titleIndex + 1]) {
    customTitle = args[titleIndex + 1];
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`File non trovato: ${filePath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const convertedContent = convertMarkdownTable(content, customTitle);
    
    if (content !== convertedContent) {
      // Crea backup
      const backupPath = filePath + '.backup';
      fs.writeFileSync(backupPath, content);
      
      // Scrivi il file convertito
      fs.writeFileSync(filePath, convertedContent);
      
      console.log(`✅ Conversione completata: ${filePath}`);
      console.log(`📁 Backup creato: ${backupPath}`);
      
      // Conta quante tabelle sono state convertite
      const tableCount = (convertedContent.match(/<TakeawayTable/g) || []).length - (content.match(/<TakeawayTable/g) || []).length;
      if (tableCount > 0) {
        console.log(`🔄 ${tableCount} tabella/e convertita/e`);
      }
    } else {
      console.log('ℹ️  Nessuna tabella markdown a 2 colonne trovata nel file');
    }
    
  } catch (error) {
    console.error(`Errore durante la conversione: ${error.message}`);
    process.exit(1);
  }
}

main();
