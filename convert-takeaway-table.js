#!/usr/bin/env node

/**
 * Script per convertire tabelle markdown nel componente FlexibleTable
 * Supporta tabelle con qualsiasi numero di colonne
 * Uso: node convert-takeaway-table.js <file-path> [--title "Titolo Custom"] [--component FlexibleTable|TakeawayTable]
 */

import fs from 'fs';
import path from 'path';

function convertMarkdownTable(content, customTitle = null, componentType = 'auto') {
  // Pattern generico per trovare tabelle markdown con N colonne
  // Cerca: header opzionale + tabella con header + separatori + righe dati
  const tablePattern = /((?:^##?\s+(.+)\n)?)\|([^|\n]+(?:\|[^|\n]+)*)\|\n\|([^|\n]*(?:\|[^|\n]*)*)\|\n((?:\|[^|\n]*(?:\|[^|\n]*)*\|\n?)+)/gm;
  
  return content.replace(tablePattern, (match, headerSection, headerTitle, headerRow, separatorRow, tableRows) => {
    // Estrai gli header delle colonne
    const headers = headerRow.split('|').map(cell => cell.trim()).filter(cell => cell);
    
    // Determina il titolo da usare
    let title = customTitle || headerTitle || headers.join(' e ');
    title = title.trim();
    
    // Estrai le righe della tabella
    const rows = tableRows.trim().split('\n').filter(row => {
      const trimmed = row.trim();
      return trimmed && !trimmed.includes('---') && trimmed.includes('|');
    });
    
    // Converti ogni riga in array di celle
    const dataRows = rows.map(row => {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      return cells.map(cell => cell.replace(/\*\*/g, '')); // Rimuovi markdown bold
    }).filter(row => row.length >= headers.length);

    // Se non ci sono righe valide, mantieni la tabella originale
    if (dataRows.length === 0) {
      return match;
    }

    // Determina quale componente usare
    const useFlexibleTable = componentType === 'FlexibleTable' || (componentType === 'auto' && headers.length !== 2);
    const componentName = useFlexibleTable ? 'FlexibleTable' : 'TakeawayTable';
    
    // Genera il codice del componente
    let componentCode;
    
    if (useFlexibleTable) {
      // Usa FlexibleTable per tabelle con qualsiasi numero di colonne
      const headersCode = headers.map(h => `"${h}"`).join(', ');
      const rowsCode = dataRows.map(row => 
        `    [${row.map(cell => `"${cell}"`).join(', ')}]`
      ).join(',\n');
      
      componentCode = `<FlexibleTable 
  title="${title}"
  headers={[${headersCode}]}
  rows={[
${rowsCode}
  ]}
/>`;
    } else {
      // Usa TakeawayTable per tabelle a 2 colonne (compatibilità)
      const itemsCode = dataRows.map(row => `    {
      takeaway: "<strong>${row[0]}</strong>",
      explanation: "${row[1] || ''}"
    }`).join(',\n');
      
      componentCode = `<TakeawayTable 
  title="${title}"
  items={[
${itemsCode}
  ]}
/>`;
    }

    // Gestisci l'import
    const hasFlexibleImport = content.includes("import FlexibleTable");
    const hasTakeawayImport = content.includes("import TakeawayTable");
    
    let importStatement = "";
    if (useFlexibleTable && !hasFlexibleImport) {
      importStatement = "import FlexibleTable from '../../components/FlexibleTable.astro';\n\n";
    } else if (!useFlexibleTable && !hasTakeawayImport) {
      importStatement = "import TakeawayTable from '../../components/TakeawayTable.astro';\n\n";
    }

    return `${importStatement}${componentCode}`;
  });
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Uso: node convert-takeaway-table.js <file-path> [--title "Titolo Custom"] [--component FlexibleTable|TakeawayTable]');
    console.log('Esempi:');
    console.log('  node convert-takeaway-table.js src/content/insights/articolo.mdx');
    console.log('  node convert-takeaway-table.js articolo.mdx --title "Fasi del Processo"');
    console.log('  node convert-takeaway-table.js articolo.mdx --component FlexibleTable');
    console.log('');
    console.log('Componenti:');
    console.log('  - auto: Sceglie automaticamente (FlexibleTable per >2 colonne, TakeawayTable per 2 colonne)');
    console.log('  - FlexibleTable: Supporta qualsiasi numero di colonne');
    console.log('  - TakeawayTable: Ottimizzato per 2 colonne (takeaway + explanation)');
    process.exit(1);
  }

  let filePath = args[0];
  let customTitle = null;
  let componentType = 'auto';
  
  // Cerca il parametro --title
  const titleIndex = args.indexOf('--title');
  if (titleIndex !== -1 && args[titleIndex + 1]) {
    customTitle = args[titleIndex + 1];
  }
  
  // Cerca il parametro --component
  const componentIndex = args.indexOf('--component');
  if (componentIndex !== -1 && args[componentIndex + 1]) {
    componentType = args[componentIndex + 1];
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`File non trovato: ${filePath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const convertedContent = convertMarkdownTable(content, customTitle, componentType);
    
    if (content !== convertedContent) {
      // Crea backup
      const backupPath = filePath + '.backup';
      fs.writeFileSync(backupPath, content);
      
      // Scrivi il file convertito
      fs.writeFileSync(filePath, convertedContent);
      
      console.log(`✅ Conversione completata: ${filePath}`);
      console.log(`📁 Backup creato: ${backupPath}`);
      
      // Conta quante tabelle sono state convertite
      const flexibleCount = (convertedContent.match(/<FlexibleTable/g) || []).length - (content.match(/<FlexibleTable/g) || []).length;
      const takeawayCount = (convertedContent.match(/<TakeawayTable/g) || []).length - (content.match(/<TakeawayTable/g) || []).length;
      const totalCount = flexibleCount + takeawayCount;
      
      if (totalCount > 0) {
        console.log(`🔄 ${totalCount} tabella/e convertita/e:`);
        if (flexibleCount > 0) console.log(`   - ${flexibleCount} FlexibleTable`);
        if (takeawayCount > 0) console.log(`   - ${takeawayCount} TakeawayTable`);
      }
    } else {
      console.log('ℹ️  Nessuna tabella markdown trovata nel file');
    }
    
  } catch (error) {
    console.error(`Errore durante la conversione: ${error.message}`);
    process.exit(1);
  }
}

main();
