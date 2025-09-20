/**
 * Netlify Function per ricevere webhook articoli
 * Deploy: https://your-site.netlify.app/.netlify/functions/webhook-article
 */

import { Octokit } from '@octokit/rest';

/**
 * Genera slug da titolo
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Genera frontmatter automatico
 */
function generateFrontmatter(title, content, slug) {
  // Estrai le prime frasi per l'excerpt
  const textContent = content.replace(/[#*`]/g, '').replace(/\n+/g, ' ');
  const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const excerpt = sentences.slice(0, 2).join('. ').substring(0, 155) + '...';
  
  // Genera categorie e tag basati sul contenuto
  const contentLower = content.toLowerCase();
  const categories = [];
  const tags = [];
  
  // Categorie basate su parole chiave
  if (contentLower.includes('intelligenza artificiale') || contentLower.includes(' ia ') || contentLower.includes('machine learning')) {
    categories.push('Intelligenza Artificiale');
    tags.push('IA', 'machine learning');
  }
  if (contentLower.includes('digital') || contentLower.includes('trasformazione')) {
    categories.push('Trasformazione Digitale');
    tags.push('digitalizzazione', 'innovazione');
  }
  if (contentLower.includes('strategi') || contentLower.includes('business') || contentLower.includes('azien')) {
    categories.push('Strategia Aziendale');
    tags.push('strategia', 'business');
  }
  if (contentLower.includes('tecnologi') || contentLower.includes('software') || contentLower.includes('sviluppo')) {
    categories.push('Tecnologia');
    tags.push('tecnologia', 'sviluppo');
  }
  
  // Fallback se nessuna categoria trovata
  if (categories.length === 0) {
    categories.push('Insights', 'Tecnologia');
  }
  
  // Aggiungi tag generici se pochi
  if (tags.length < 3) {
    tags.push('innovazione', 'digital transformation');
  }
  
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `---
title: "${title}"
slug: ${slug}
lang: it
status: publish
excerpt: "${excerpt}"
date: ${currentDate}
categories: [${categories.map(c => `"${c}"`).join(', ')}]
tags: [${tags.slice(0, 5).map(t => `"${t}"`).join(', ')}]
---

`;
}

/**
 * Converte tabelle markdown in componenti
 */
function convertTables(content) {
  // Pattern generico per trovare tabelle markdown con N colonne
  const tablePattern = /((?:^##?\s+(.+)\n)?)\|([^|\n]+(?:\|[^|\n]+)*)\|\n\|([^|\n]*(?:\|[^|\n]*)*)\|\n((?:\|[^|\n]*(?:\|[^|\n]*)*\|\n?)+)/gm;
  
  return content.replace(tablePattern, (match, headerSection, headerTitle, headerRow, separatorRow, tableRows) => {
    // Estrai gli header delle colonne
    const headers = headerRow.split('|').map(cell => cell.trim()).filter(cell => cell);
    
    // Determina il titolo da usare
    let title = headerTitle || headers.join(' e ');
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
    const useFlexibleTable = headers.length !== 2;
    
    // Genera il codice del componente
    let componentCode;
    
    if (useFlexibleTable) {
      // Usa FlexibleTable per tabelle con qualsiasi numero di colonne
      const headersCode = headers.map(h => `"${h}"`).join(', ');
      const rowsCode = dataRows.map(row => 
        `    [${row.map(cell => `"${cell}"`).join(', ')}]`
      ).join(',\n');
      
      componentCode = `import FlexibleTable from '../../components/FlexibleTable.astro';

<FlexibleTable 
  title="${title}"
  headers={[${headersCode}]}
  rows={[
${rowsCode}
  ]}
/>`;
    } else {
      // Usa TakeawayTable per tabelle a 2 colonne
      const itemsCode = dataRows.map(row => `    {
      takeaway: "<strong>${row[0]}</strong>",
      explanation: "${row[1] || ''}"
    }`).join(',\n');
      
      componentCode = `import TakeawayTable from '../../components/TakeawayTable.astro';

<TakeawayTable 
  title="${title}"
  items={[
${itemsCode}
  ]}
/>`;
    }

    return componentCode;
  });
}

/**
 * Crea/aggiorna file via GitHub API
 */
async function createFileOnGitHub(octokit, owner, repo, path, content, message) {
  try {
    // Controlla se il file esiste già
    let sha = null;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });
      sha = data.sha;
    } catch (error) {
      // File non esiste, va bene
    }
    
    // Crea o aggiorna il file
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      sha, // Include SHA se il file esiste (per update)
    });
    
    return response.data;
  } catch (error) {
    throw new Error(`GitHub API error: ${error.message}`);
  }
}

/**
 * Handler principale della Netlify Function
 */
export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }
  
  // Solo POST accettato
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    // Verifica autenticazione
    const authHeader = event.headers.authorization;
    const expectedSecret = process.env.WEBHOOK_SECRET;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      };
    }
    
    const token = authHeader.substring(7);
    if (token !== expectedSecret) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid webhook secret' }),
      };
    }
    
    // Parse payload
    const payload = JSON.parse(event.body);
    const { id, title, content_markdown, languageCode, createdAt } = payload;
    
    // Validazione payload
    if (!title || !content_markdown) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: title and content_markdown' 
        }),
      };
    }
    
    console.log(`📝 Ricevuto nuovo articolo: "${title}"`);
    
    // Genera slug e percorso file
    const slug = generateSlug(title);
    const fileName = `${slug}.mdx`;
    const filePath = `src/content/insights/${fileName}`;
    
    // Genera frontmatter
    const frontmatter = generateFrontmatter(title, content_markdown, slug);
    
    // Converti tabelle
    const convertedContent = convertTables(content_markdown);
    
    // Combina frontmatter e contenuto
    const fullContent = frontmatter + convertedContent;
    
    // Setup GitHub API
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    
    const owner = process.env.GITHUB_OWNER || 'your-username';
    const repo = process.env.GITHUB_REPO || 'chermazcom';
    
    // Commit message
    const commitMessage = `feat: add new article "${title}"

- Auto-generated from webhook
- Frontmatter generated automatically  
- Tables converted to components
- Published: ${new Date().toISOString()}`;
    
    // Crea file su GitHub
    const result = await createFileOnGitHub(
      octokit,
      owner,
      repo,
      filePath,
      fullContent,
      commitMessage
    );
    
    console.log(`✅ Articolo pubblicato su GitHub: ${slug}`);
    
    // Risposta di successo
    const response = {
      success: true,
      message: 'Article published successfully',
      article: {
        id: id,
        title: title,
        slug: slug,
        fileName: fileName,
        filePath: filePath,
        githubUrl: result.content.html_url,
        publishedAt: new Date().toISOString()
      }
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ Errore durante la pubblicazione:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
    };
  }
};
