#!/usr/bin/env node

/**
 * Webhook Server per Chermaz.com
 * Riceve articoli da tool esterni e li pubblica automaticamente
 * 
 * Funzionalità:
 * - Riceve webhook con articoli in markdown
 * - Genera frontmatter automatico
 * - Converte tabelle in componenti eleganti
 * - Commit e push automatico su Git
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
const CONTENT_DIR = './src/content/insights';

// Middleware
app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

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
 * Converte tabelle markdown usando lo script esistente
 */
async function convertTables(filePath) {
  try {
    console.log(`🔄 Conversione tabelle per: ${filePath}`);
    execSync(`node convert-takeaway-table.js "${filePath}"`, { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log(`✅ Tabelle convertite con successo`);
  } catch (error) {
    console.log(`ℹ️  Nessuna tabella da convertire o errore: ${error.message}`);
  }
}

/**
 * Commit e push su Git
 */
function commitAndPush(fileName, title) {
  try {
    console.log(`📝 Commit e push per: ${fileName}`);
    
    // Add del file specifico
    execSync(`git add "${CONTENT_DIR}/${fileName}"`, { stdio: 'pipe' });
    
    // Commit
    const commitMessage = `feat: add new article "${title}"

- Auto-generated from webhook
- Frontmatter generated automatically  
- Tables converted to components
- Published: ${new Date().toISOString()}`;
    
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
    
    // Push
    execSync(`git push origin main`, { stdio: 'pipe' });
    
    console.log(`✅ Articolo pushato su Git con successo`);
    return true;
  } catch (error) {
    console.error(`❌ Errore Git: ${error.message}`);
    return false;
  }
}

/**
 * Verifica autenticazione Bearer token
 */
function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  
  const token = authHeader.substring(7);
  if (token !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }
  
  next();
}

/**
 * Endpoint principale webhook
 */
app.post('/webhook/article', verifyAuth, async (req, res) => {
  try {
    const { id, title, content_markdown, languageCode, createdAt } = req.body;
    
    // Validazione payload
    if (!title || !content_markdown) {
      return res.status(400).json({ 
        error: 'Missing required fields: title and content_markdown' 
      });
    }
    
    console.log(`📝 Ricevuto nuovo articolo: "${title}"`);
    
    // Genera slug e nome file
    const slug = generateSlug(title);
    const fileName = `${slug}.mdx`;
    const filePath = path.join(CONTENT_DIR, fileName);
    
    // Controlla se il file esiste già
    if (fs.existsSync(filePath)) {
      console.log(`⚠️  File già esistente: ${fileName}`);
      return res.status(409).json({ 
        error: 'Article already exists',
        slug: slug,
        filePath: fileName
      });
    }
    
    // Genera frontmatter
    const frontmatter = generateFrontmatter(title, content_markdown, slug);
    
    // Combina frontmatter e contenuto
    const fullContent = frontmatter + content_markdown;
    
    // Scrivi il file
    fs.writeFileSync(filePath, fullContent, 'utf-8');
    console.log(`✅ File creato: ${fileName}`);
    
    // Converti tabelle
    await convertTables(filePath);
    
    // Commit e push
    const gitSuccess = commitAndPush(fileName, title);
    
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
        gitPushed: gitSuccess,
        publishedAt: new Date().toISOString()
      }
    };
    
    console.log(`🎉 Articolo pubblicato con successo: ${slug}`);
    res.status(200).json(response);
    
  } catch (error) {
    console.error(`❌ Errore durante la pubblicazione:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * Endpoint di health check
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Endpoint per testare il webhook
 */
app.post('/webhook/test', verifyAuth, (req, res) => {
  res.json({ 
    message: 'Webhook test successful',
    timestamp: new Date().toISOString(),
    receivedPayload: req.body
  });
});

/**
 * Gestione errori globale
 */
app.use((error, req, res, next) => {
  console.error('Errore non gestito:', error);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Avvio server
 */
app.listen(PORT, () => {
  console.log(`🚀 Webhook server avviato su porta ${PORT}`);
  console.log(`📡 Endpoint webhook: http://localhost:${PORT}/webhook/article`);
  console.log(`🔐 Secret configurato: ${WEBHOOK_SECRET.substring(0, 4)}...`);
  console.log(`📁 Directory contenuti: ${CONTENT_DIR}`);
});

// Gestione graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Arresto server webhook...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Arresto server webhook...');
  process.exit(0);
});
