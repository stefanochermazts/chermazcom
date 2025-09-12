#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione base
const CONTENT_DIR = path.join(__dirname, 'src/content');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Idee aggiuntive per la formattazione avanzata
const ADVANCED_FORMATTING = {
  // Callout boxes per informazioni importanti
  calloutPatterns: [
    {
      pattern: /^(⚠️|❗|🚨)\s*(.+)$/gm,
      replacement: '> **⚠️ Attenzione:** $2'
    },
    {
      pattern: /^(💡|💭|🔍)\s*(.+)$/gm, 
      replacement: '> **💡 Suggerimento:** $2'
    },
    {
      pattern: /^(✅|✔️|🎯)\s*(.+)$/gm,
      replacement: '> **✅ Best Practice:** $2'
    }
  ],

  // Formattazione per codice inline
  codePatterns: [
    {
      pattern: /\b(npm install|yarn add|composer require|pip install)\s+([a-zA-Z0-9\-@\/]+)/g,
      replacement: '`$1 $2`'
    },
    {
      pattern: /\b(cd|mkdir|chmod|chown)\s+([^\s]+)/g,
      replacement: '`$1 $2`'
    }
  ],

  // Quote motivazionali e citazioni
  quotePatterns: [
    {
      pattern: /^"(.+)"\s*[-–—]\s*(.+)$/gm,
      replacement: '> *"$1"*\n>\n> — **$2**'
    }
  ],

  // Formattazione per date e tempi
  dateTimePatterns: [
    {
      pattern: /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/g,
      replacement: '**$1**'
    },
    {
      pattern: /\b(\d{1,2}:\d{2}(\s*(AM|PM))?)\b/gi,
      replacement: '**$1**'
    }
  ],

  // Evidenziazione di metriche e KPI
  metricsPatterns: [
    {
      pattern: /\b(ROI|CTR|CPC|CPM|LTV|CAC|ARPU|ARPPU|DAU|MAU|WAU)\b/g,
      replacement: '**$1**'
    },
    {
      pattern: /\b(\d+\.\d+[xs]|\d+ms|\d+s|\d+min|\d+h)\b/g,
      replacement: '**$1**'
    }
  ],

  // Miglioramento struttura paragrafi
  paragraphEnhancements: [
    {
      // Aggiunge spazio prima di paragrafi che iniziano con emoji
      pattern: /^([🎯📋⚡🚀💡📊🔥⭐🎨🛠️])/gm,
      replacement: '\n$1'
    },
    {
      // Migliora le transizioni tra sezioni
      pattern: /^(Passiamo ora a|Vediamo ora|A questo punto|Inoltre|Tuttavia|Di conseguenza)/gm,
      replacement: '\n*$1*'
    }
  ],

  // Formattazione per link interni e esterni
  linkEnhancements: [
    {
      // Evidenzia link esterni con icona
      pattern: /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      replacement: '[$1 🔗]($2)'
    },
    {
      // Formatta call-to-action links
      pattern: /\[([^[\]]*(?:contatt|scop|inizia|prenota|scarica)[^[\]]*)\]\(([^)]+)\)/gi,
      replacement: '**[$1]($2)**'
    }
  ],

  // Formattazione per elenchi puntati migliorati
  listEnhancements: [
    {
      // Aggiunge emoji contestuali a sottoelenchi
      pattern: /^(\s+)-\s+(Vantaggio|Pro|Beneficio):\s*(.+)$/gmi,
      replacement: '$1- ✅ **$2:** $3'
    },
    {
      pattern: /^(\s+)-\s+(Svantaggio|Contro|Limitazione):\s*(.+)$/gmi,
      replacement: '$1- ❌ **$2:** $3'
    },
    {
      pattern: /^(\s+)-\s+(Requisito|Prerequisito):\s*(.+)$/gmi,
      replacement: '$1- 📋 **$2:** $3'
    }
  ],

  // Tabelle per confronti
  tablePatterns: [
    {
      // Identifica pattern di confronto e suggerisce tabelle
      pattern: /^(.+)\s+(vs\.?|versus|contro)\s+(.+):\s*$/gmi,
      replacement: '## $1 vs $3\n\n| Aspetto | $1 | $3 |\n|---------|----|----|'
    }
  ],

  // Formattazione per step e procedure
  stepPatterns: [
    {
      pattern: /^(Step|Passaggio|Fase)\s+(\d+)[:\-\s]*(.+)$/gmi,
      replacement: '### $1 $2: $3'
    },
    {
      pattern: /^(\d+\.)\s*(.+)$/gm,
      replacement: '**$1** $2'
    }
  ],

  // Evidenziazione di warning e note
  warningPatterns: [
    {
      pattern: /^(Nota|Note|Attenzione|Warning|Importante):\s*(.+)$/gmi,
      replacement: '> **⚠️ $1:** $2'
    },
    {
      pattern: /^(Ricorda|Ricordati|Non dimenticare):\s*(.+)$/gmi,
      replacement: '> **📝 Ricorda:** $2'
    }
  ]
};

// Funzione per applicare formattazioni avanzate
function applyAdvancedFormatting(content) {
  let formattedContent = content;

  // Applica callout boxes
  ADVANCED_FORMATTING.calloutPatterns.forEach(rule => {
    formattedContent = formattedContent.replace(rule.pattern, rule.replacement);
  });

  // Formattazione codice inline
  ADVANCED_FORMATTING.codePatterns.forEach(rule => {
    formattedContent = formattedContent.replace(rule.pattern, rule.replacement);
  });

  // Quote e citazioni
  ADVANCED_FORMATTING.quotePatterns.forEach(rule => {
    formattedContent = formattedContent.replace(rule.pattern, rule.replacement);
  });

  // Date e tempi
  ADVANCED_FORMATTING.dateTimePatterns.forEach(rule => {
    formattedContent = formattedContent.replace(rule.pattern, rule.replacement);
  });

  // Metriche e KPI
  ADVANCED_FORMATTING.metricsPatterns.forEach(rule => {
    formattedContent = formattedContent.replace(rule.pattern, rule.replacement);
  });

  // Miglioramenti paragrafi
  ADVANCED_FORMATTING.paragraphEnhancements.forEach(rule => {
    formattedContent = formattedContent.replace(rule.pattern, rule.replacement);
  });

  // Link enhancement
  ADVANCED_FORMATTING.linkEnhancements.forEach(rule => {
    formattedContent = formattedContent.replace(rule.pattern, rule.replacement);
  });

  // Liste migliorate
  ADVANCED_FORMATTING.listEnhancements.forEach(rule => {
    formattedContent = formattedContent.replace(rule.pattern, rule.replacement);
  });

  // Pattern per step
  ADVANCED_FORMATTING.stepPatterns.forEach(rule => {
    formattedContent = formattedContent.replace(rule.pattern, rule.replacement);
  });

  // Warning e note
  ADVANCED_FORMATTING.warningPatterns.forEach(rule => {
    formattedContent = formattedContent.replace(rule.pattern, rule.replacement);
  });

  return formattedContent;
}

// Funzione per aggiungere sommario automatico
function addTableOfContents(content) {
  const headings = [];
  const headingPattern = /^(#{2,4})\s+(.+)$/gm;
  let match;

  while ((match = headingPattern.exec(content)) !== null) {
    const level = match[1].length;
    const title = match[2].replace(/[🎯📋⚡🚀💡📊🔥⭐🎨🛠️]/g, '').trim();
    const indent = '  '.repeat(level - 2);
    headings.push(`${indent}- [${title}](#${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')})`);
  }

  if (headings.length > 2) {
    const toc = '\n## 📋 Indice\n\n' + headings.join('\n') + '\n\n---\n';
    // Inserisce il TOC dopo il primo h1 e prima del primo h2
    const firstH2Index = content.search(/^#{2}\s+/m);
    if (firstH2Index !== -1) {
      return content.slice(0, firstH2Index) + toc + content.slice(firstH2Index);
    }
  }

  return content;
}

// Funzione per aggiungere meta informazioni
function addMetaInfo(content, frontmatter) {
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200); // 200 parole al minuto
  
  const metaInfo = `
> **📊 Info articolo:**  
> 📝 Parole: ~${wordCount} | ⏱️ Tempo di lettura: ~${readingTime} min
`;

  // Inserisce dopo il primo paragrafo
  const firstParagraphEnd = content.search(/\n\n/);
  if (firstParagraphEnd !== -1) {
    return content.slice(0, firstParagraphEnd + 2) + metaInfo + '\n' + content.slice(firstParagraphEnd + 2);
  }

  return content;
}

// Funzione per migliorare l'accessibilità
function improveAccessibility(content) {
  let accessibleContent = content;

  // Aggiunge alt text a immagini senza
  accessibleContent = accessibleContent.replace(
    /!\[\]\(([^)]+)\)/g,
    '![Immagine illustrativa]($1)'
  );

  // Migliora la struttura dei link
  accessibleContent = accessibleContent.replace(
    /\[qui\]\(([^)]+)\)/gi,
    '[scopri di più]($1)'
  );

  accessibleContent = accessibleContent.replace(
    /\[clicca qui\]\(([^)]+)\)/gi,
    '[approfondisci l\'argomento]($1)'
  );

  return accessibleContent;
}

// Funzione per ottimizzare per SEO
function optimizeForSEO(content) {
  let seoContent = content;

  // Aggiunge parole chiave long-tail
  seoContent = seoContent.replace(
    /^(#{1,3})\s+(.+)$/gm,
    (match, hashes, title) => {
      // Mantiene il titolo originale ma suggerisce miglioramenti nei commenti
      return match + `\n{/* SEO: considera di espandere "${title}" con parole chiave long-tail */}`;
    }
  );

  return seoContent;
}

// Esporta le funzioni per l'uso in altri script
export {
  applyAdvancedFormatting,
  addTableOfContents,
  addMetaInfo,
  improveAccessibility,
  optimizeForSEO
};
