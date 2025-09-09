# Script di Traduzione Automatica MDX

Questo script utilizza OpenAI per tradurre automaticamente tutti i file MDX del sito in inglese e sloveno.

## Prerequisiti

1. **API Key OpenAI**: Ottieni una chiave API da [OpenAI Platform](https://platform.openai.com/)
2. **Node.js**: Versione 18+ 
3. **Pacchetti**: `openai` e `glob` (già inclusi nel package.json)

## Configurazione

```bash
# Imposta la tua API key
export OPENAI_API_KEY="sk-..."

# Oppure crea un file .env
echo "OPENAI_API_KEY=sk-..." > .env
```

## Utilizzo

### 1. Test iniziale

Prima di tradurre tutto, testa lo script:

```bash
# Crea file di test
node scripts/test-translation.mjs

# Test dry run (simula senza tradurre)
node scripts/translate-mdx.mjs --target=en --sample=1 --dry-run

# Test su un file reale
node scripts/translate-mdx.mjs --target=en --collection=pages --sample=1

# Sovrascrivere file esistenti (per tradurre file già copiati)
node scripts/translate-mdx.mjs --target=en --collection=pages --sample=1 --force
```

### 2. Traduzione per collezione

```bash
# Solo pagine statiche
node scripts/translate-mdx.mjs --target=en --collection=pages

# Solo case studies
node scripts/translate-mdx.mjs --target=en --collection=case-studies

# Solo insights (blog)
node scripts/translate-mdx.mjs --target=en --collection=insights
```

### 3. Traduzione completa

```bash
# Tutti i file in inglese
node scripts/translate-mdx.mjs --target=en

# Tutti i file in sloveno  
node scripts/translate-mdx.mjs --target=sl

# Sample di 5 file per test
node scripts/translate-mdx.mjs --target=en --sample=5
```

## Parametri

- `--target=en|sl`: Lingua di destinazione
- `--collection=insights|case-studies|pages|all`: Collezione da tradurre
- `--sample=N`: Traduce solo N file (per test)
- `--dry-run`: Simula senza creare file
- `--force`: Sovrascrive file esistenti (utile per ri-tradurre file già copiati)

## Funzionalità

### ✅ Cosa FA:

- **Traduce frontmatter**: title, excerpt
- **Aggiorna metadati**: slug, lang
- **Preserva struttura**: markdown, HTML, codice
- **Rate limiting**: Rispetta limiti API OpenAI
- **Skip esistenti**: Non sovrascrive file già tradotti
- **Gestione errori**: Continua anche se alcuni file falliscono

### ❌ Cosa NON tocca:

- **Codice**: Snippet di codice rimangono originali
- **URL**: Link e riferimenti
- **Termini tecnici**: Microsoft 365, SharePoint, etc.
- **File esistenti**: File `en-*` e `sl-*` esistenti

## Costi OpenAI

- **Modello**: gpt-4o-mini (economico)
- **Stima**: ~$0.001 per file di media lunghezza
- **162 file**: ~$0.16 totali
- **Monitoraggio**: Controlla usage su [OpenAI Dashboard](https://platform.openai.com/usage)

## Sicurezza

### Prima di iniziare:

```bash
# 1. Backup
git add . && git commit -m "Backup before translation"

# 2. Test su pochi file
node scripts/translate-mdx.mjs --target=en --sample=3

# 3. Verifica risultati
git diff --name-only

# 4. Se tutto ok, procedi con il resto
```

### In caso di problemi:

```bash
# Annulla tutto
git reset --hard HEAD

# Oppure rimuovi solo file tradotti
find src/content -name "en-*.mdx" -delete
find src/content -name "sl-*.mdx" -delete
```

## Flusso raccomandato

1. **Setup**: Configura API key
2. **Test**: Traduci 2-3 file campione
3. **Verifica**: Controlla qualità traduzioni
4. **Backup**: Commit git
5. **Batch piccoli**: Traduci per collezione
6. **Verifica**: Controlla dopo ogni batch
7. **Completo**: Traduci tutto se soddisfatto

## Troubleshooting

### Errori comuni:

- **"API key required"**: Imposta `OPENAI_API_KEY`
- **"Rate limit"**: Lo script aspetta automaticamente
- **"File already exists"**: File già tradotto (normale)
- **"Translation failed"**: Verifica connessione internet

### Log di esempio:

```
🚀 Starting MDX Translation
   Target: English
   Collection: insights
   Mode: LIVE
   Sample: all files

📊 Found 45 source files, processing 45

📄 Processing: src/content/insights/article.mdx
   🔄 Translating frontmatter...
   🔄 Translating content...
   ✅ Created: en-article.mdx

📊 Translation Complete!
   ✅ Processed: 42
   ⏭️  Skipped: 3
   ❌ Errors: 0
```

## Prossimi passi

Dopo la traduzione MDX:

1. **Homepage**: Tradurre componenti React/Astro
2. **Form contatti**: Tradurre labels e messaggi
3. **Navigazione**: Verificare menu multilingua
4. **Metadati**: Aggiornare sitemap e SEO
