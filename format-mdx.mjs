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

// Database di termini per formattazione intelligente
const FORMATTING_RULES = {
  // Termini tecnici da evidenziare in bold
  technicalTerms: [
    // Framework e tecnologie
    'TALL stack', 'Laravel', 'Alpine.js', 'Tailwind CSS', 'Livewire',
    'Astro', 'React', 'Vue.js', 'Svelte', 'Next.js', 'Nuxt.js',
    'WordPress', 'WooCommerce', 'Shopify', 'Magento',
    'Node.js', 'TypeScript', 'JavaScript', 'PHP', 'Python',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Vercel', 'Netlify',
    
    // Business e metodologie
    'DevOps', 'CI/CD', 'Agile', 'Scrum', 'Kanban',
    'SaaS', 'B2B', 'B2C', 'CRM', 'ERP',
    'UX/UI', 'Design System', 'Responsive Design',
    'Progressive Web App', 'PWA', 'SPA', 'SSR', 'SSG',
    
    // Sicurezza e compliance
    'GDPR', 'ISO 27001', 'SOC 2', 'HIPAA', 'PCI DSS',
    'OWASP', 'XSS', 'CSRF', 'SQL Injection',
    'Two-Factor Authentication', '2FA', 'OAuth', 'JWT',
    
    // Accessibilità
    'WCAG', 'ARIA', 'Screen Reader', 'Keyboard Navigation',
    'Color Contrast', 'Alt Text', 'Semantic HTML',
    
    // Marketing e SEO
    'SEO', 'SEM', 'Google Analytics', 'Search Console',
    'Meta Tags', 'Schema Markup', 'Core Web Vitals',
    'Content Marketing', 'Lead Generation', 'Conversion Rate',
    
    // E-commerce
    'Checkout', 'Payment Gateway', 'Inventory Management',
    'Order Management', 'Customer Journey', 'Abandoned Cart'
  ],

  // Acronimi da evidenziare
  acronyms: [
    'AI', 'ML', 'API', 'REST', 'GraphQL', 'SDK', 'CLI',
    'CMS', 'CDN', 'DNS', 'SSL', 'TLS', 'HTTP', 'HTTPS',
    'FTP', 'SSH', 'VPN', 'IP', 'TCP', 'UDP',
    'HTML', 'CSS', 'DOM', 'JSON', 'XML', 'YAML',
    'KPI', 'ROI', 'CTR', 'CPC', 'CPM', 'LTV', 'CAC'
  ],

  // Frasi e concetti da enfatizzare in italic
  emphasizePatterns: [
    // Pattern per frasi importanti
    /\b(la chiave del successo|il punto fondamentale|aspetto cruciale|elemento essenziale|fattore determinante)\b/gi,
    /\b(ricorda che|importante notare|da tenere presente|vale la pena|non dimenticare)\b/gi,
    /\b(in altre parole|detto questo|tuttavia|d'altra parte|di conseguenza)\b/gi,
    /\b(pro e contro|vantaggi e svantaggi|benefici|limitazioni|criticità)\b/gi,
    
    // Best practices
    /\b(best practice|buona pratica|raccomandazione|suggerimento|consiglio)\b/gi,
    /\b(ottimizzazione|performance|efficienza|scalabilità|manutenibilità)\b/gi,
    
    // Business focus
    /\b(esperienza utente|user experience|customer journey|brand identity)\b/gi,
    /\b(competitive advantage|vantaggio competitivo|differenziazione|positioning)\b/gi,
    /\b(time to market|go-to-market|business model|revenue stream)\b/gi
  ],

  // Call-to-action da evidenziare
  callToActionPatterns: [
    /\b(contattami|contattaci|richiedi|scopri|inizia|prenota|scarica)\b/gi,
    /\b(non esitare|non aspettare|agisci subito|approfitta|ottieni)\b/gi
  ],

  // Numeri e statistiche
  numbersPattern: /\b(\d+[%°]?|\d+\.\d+[%°]?|\d+\/\d+)\b/g
};

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

// Funzione per parsare il frontmatter e estrarre categorie/tag
function parseFrontmatter(frontmatter) {
  const categories = [];
  const tags = [];
  
  // Estrai categorie
  const categoriesMatch = frontmatter.match(/categories:\s*\[(.*?)\]/s);
  if (categoriesMatch) {
    categories.push(...categoriesMatch[1]
      .split(',')
      .map(cat => cat.trim().replace(/['"]/g, ''))
      .filter(cat => cat));
  }
  
  // Estrai tag
  const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/s);
  if (tagsMatch) {
    tags.push(...tagsMatch[1]
      .split(',')
      .map(tag => tag.trim().replace(/['"]/g, ''))
      .filter(tag => tag));
  }
  
  return { categories, tags };
}

// Funzione per applicare formattazione bold
function applyBoldFormatting(content, categories, tags) {
  let formattedContent = content;
  
  // Formatta termini tecnici
  FORMATTING_RULES.technicalTerms.forEach(term => {
    const regex = new RegExp(`\\b(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
    formattedContent = formattedContent.replace(regex, (match) => {
      // Evita di formattare se già formattato
      if (match.startsWith('**') || match.startsWith('*')) return match;
      return `**${match}**`;
    });
  });
  
  // Formatta acronimi
  FORMATTING_RULES.acronyms.forEach(acronym => {
    const regex = new RegExp(`\\b(${acronym})\\b`, 'g');
    formattedContent = formattedContent.replace(regex, (match) => {
      if (match.startsWith('**') || match.startsWith('*')) return match;
      return `**${match}**`;
    });
  });
  
  // Formatta termini dalle categorie
  categories.forEach(category => {
    const regex = new RegExp(`\\b(${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
    formattedContent = formattedContent.replace(regex, (match) => {
      if (match.startsWith('**') || match.startsWith('*')) return match;
      return `**${match}**`;
    });
  });
  
  // Formatta termini dai tag (più selettivo)
  tags.forEach(tag => {
    if (tag.length > 3) { // Solo tag significativi
      const regex = new RegExp(`\\b(${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
      formattedContent = formattedContent.replace(regex, (match) => {
        if (match.startsWith('**') || match.startsWith('*')) return match;
        return `**${match}**`;
      });
    }
  });
  
  return formattedContent;
}

// Funzione per applicare formattazione italic
function applyItalicFormatting(content) {
  let formattedContent = content;
  
  // Applica pattern di enfasi
  FORMATTING_RULES.emphasizePatterns.forEach(pattern => {
    formattedContent = formattedContent.replace(pattern, (match) => {
      if (match.startsWith('*') || match.startsWith('_')) return match;
      return `*${match}*`;
    });
  });
  
  // Enfatizza call-to-action
  FORMATTING_RULES.callToActionPatterns.forEach(pattern => {
    formattedContent = formattedContent.replace(pattern, (match) => {
      if (match.startsWith('*') || match.startsWith('_')) return match;
      return `*${match}*`;
    });
  });
  
  return formattedContent;
}

// Funzione per miglioramenti aggiuntivi
function applyAdditionalFormatting(content) {
  let formattedContent = content;
  
  // Evidenzia numeri e percentuali importanti
  formattedContent = formattedContent.replace(FORMATTING_RULES.numbersPattern, (match) => {
    // Solo se il numero è significativo (non già formattato)
    if (match.startsWith('*') || match.length < 2) return match;
    if (match.includes('%') || match.includes('°') || parseFloat(match) > 10) {
      return `**${match}**`;
    }
    return match;
  });
  
  // Migliora la formattazione dei titoli delle sezioni
  formattedContent = formattedContent.replace(/^(#+)\s+(.+)$/gm, (match, hashes, title) => {
    // Aggiungi emoji per i diversi livelli di titolo se appropriato
    if (hashes.length === 2) { // H2
      return `${hashes} 🎯 ${title}`;
    } else if (hashes.length === 3) { // H3
      return `${hashes} 📋 ${title}`;
    }
    return match;
  });
  
  // Migliora le liste con emoji
  formattedContent = formattedContent.replace(/^(\s*)-\s+(.+)$/gm, (match, indent, item) => {
    // Aggiungi emoji contestuali
    if (item.match(/\b(pro|vantaggio|beneficio|positivo)\b/i)) {
      return `${indent}- ✅ ${item}`;
    } else if (item.match(/\b(contro|svantaggio|limitazione|negativo)\b/i)) {
      return `${indent}- ❌ ${item}`;
    } else if (item.match(/\b(attenzione|warning|alert|importante)\b/i)) {
      return `${indent}- ⚠️ ${item}`;
    } else if (item.match(/\b(tip|consiglio|suggerimento)\b/i)) {
      return `${indent}- 💡 ${item}`;
    }
    return match;
  });
  
  return formattedContent;
}

// Funzione per pulire formattazioni doppie
function cleanupFormatting(content) {
  let cleaned = content;
  
  // Rimuovi bold doppi
  cleaned = cleaned.replace(/\*\*\*\*(.+?)\*\*\*\*/g, '**$1**');
  cleaned = cleaned.replace(/\*\*\*(.+?)\*\*\*/g, '**$1**');
  
  // Rimuovi italic doppi
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '**$1**'); // Mantieni bold su italic
  
  // Pulisci spazi extra
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return cleaned;
}

// Funzione principale per processare un file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, content: bodyContent } = extractFrontmatter(content);
    const { categories, tags } = parseFrontmatter(frontmatter);
    
    if (VERBOSE) {
      console.log(`\n📁 Processing: ${path.relative(CONTENT_DIR, filePath)}`);
      console.log(`📂 Categories: ${categories.join(', ')}`);
      console.log(`🏷️  Tags: ${tags.join(', ')}`);
    }
    
    // Applica formattazioni
    let formattedContent = bodyContent;
    formattedContent = applyBoldFormatting(formattedContent, categories, tags);
    formattedContent = applyItalicFormatting(formattedContent);
    formattedContent = applyAdditionalFormatting(formattedContent);
    formattedContent = cleanupFormatting(formattedContent);
    
    // Ricostruisci il file
    const finalContent = `---\n${frontmatter}\n---\n${formattedContent}`;
    
    if (DRY_RUN) {
      console.log(`🔍 [DRY RUN] Would format: ${filePath}`);
      // Mostra un estratto delle modifiche
      const originalLines = bodyContent.split('\n').slice(0, 5);
      const formattedLines = formattedContent.split('\n').slice(0, 5);
      console.log('📝 Preview:');
      formattedLines.forEach((line, i) => {
        if (line !== originalLines[i]) {
          console.log(`   ${i + 1}: ${line}`);
        }
      });
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

// Funzione per scansionare ricorsivamente i file MDX
function scanMdxFiles(dir) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...scanMdxFiles(fullPath));
      } else if (item.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error scanning directory ${dir}:`, error.message);
  }
  
  return files;
}

// Funzione principale
function main() {
  console.log('🚀 MDX Formatter - Chermaz.com');
  console.log('================================');
  
  if (DRY_RUN) {
    console.log('🔍 Running in DRY RUN mode - no files will be modified');
  }
  
  const mdxFiles = scanMdxFiles(CONTENT_DIR);
  
  if (mdxFiles.length === 0) {
    console.log('📁 No MDX files found in content directory');
    return;
  }
  
  console.log(`📊 Found ${mdxFiles.length} MDX files to process`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of mdxFiles) {
    if (processFile(file)) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log('\n📈 Summary:');
  console.log(`✅ Successfully processed: ${successCount} files`);
  console.log(`❌ Errors: ${errorCount} files`);
  
  if (DRY_RUN) {
    console.log('\n💡 To apply changes, run: node format-mdx.mjs');
  } else {
    console.log('\n🎉 Formatting completed!');
  }
}

// Esegui solo se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { processFile, scanMdxFiles };
