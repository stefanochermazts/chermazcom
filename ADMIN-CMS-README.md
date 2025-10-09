# 🎨 Admin CMS - Documentazione

Sistema di gestione contenuti locale per Chermaz.com con supporto per traduzione automatica e generazione immagini AI.

## 📋 Caratteristiche

✅ **Creazione Articoli**: Form wizard per creare insights, case studies e pagine statiche  
✅ **Frontmatter Automatico**: Generazione automatica di slug, date e metadati  
✅ **Generazione Immagini**: DALL-E 3 per creare cover image personalizzate  
✅ **Traduzione Automatica**: Traduzione EN/SL con OpenAI mantenendo la struttura i18n  
✅ **Preview Live**: Anteprima markdown in tempo reale  
✅ **Protezione Password**: Accesso sicuro con autenticazione  

---

## 🚀 Setup & Avvio

### 1. Configurazione Variabili d'Ambiente

Crea un file `.env` nella root del progetto con:

```bash
# Password admin (cambiarla!)
ADMIN_PASSWORD=tua-password-sicura

# OpenAI API Key (obbligatoria per traduzione e immagini)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Modello OpenAI (opzionale, default: gpt-4o-mini)
I18N_OPENAI_MODEL=gpt-4o-mini
```

### 2. Installa Dipendenze

```bash
npm install
```

### 3. Avvia in Modalità Dev con Netlify

```bash
npm run dev:netlify
```

Questo comando avvia:
- Astro dev server su `http://localhost:4321`
- Netlify Functions in locale
- Hot reload automatico

### 4. Accedi all'Admin

Apri il browser su:
```
http://localhost:4321/admin
```

Inserisci la password configurata in `.env`

---

## 📝 Workflow Completo

### Creare un Nuovo Articolo

1. **Login**: Accedi con la password admin
2. **Compila Form**:
   - Tipo: Insight, Case Study o Pagina
   - Titolo (lo slug si genera automaticamente)
   - Excerpt e descrizione SEO
   - Categorie e tags
   - Contenuto in Markdown/MDX
3. **Salva**: Click su "Salva Articolo (IT)"
   - Il file viene salvato in `src/content/{tipo}/{slug}.mdx`
   - Frontmatter generato automaticamente con data corrente

### Generare Immagine Cover

1. **Dopo aver salvato**: Click su "Genera Immagine (DALL-E)"
2. **Attendi**: 10-30 secondi per la generazione
3. **Risultato**: Immagine salvata in `/public/images/covers/{slug}-cover.jpg`
   - Dimensioni: 1200x675px (16:9)
   - Ottimizzata con Sharp (JPEG qualità 85)

### Tradurre l'Articolo

1. **Dopo aver salvato l'IT**: Click su "Traduci EN" o "Traduci SL"
2. **Attendi**: Traduzione via OpenAI (30-60 secondi)
3. **Risultato**: File tradotti salvati come:
   - `src/content/{tipo}/en-{slug}.mdx`
   - `src/content/{tipo}/sl-{slug}.mdx`
4. **Frontmatter aggiornato automaticamente**:
   - `slug: en-{slug}` o `slug: sl-{slug}`
   - `lang: en` o `lang: sl`
   - Titolo, excerpt e contenuto tradotti

### Verificare i Risultati

1. **Vai alla lista insights**: `http://localhost:4321/it/insights`
2. **Trova il nuovo articolo**: Dovrebbe apparire nella lista
3. **Click per aprirlo**: `http://localhost:4321/it/insights/{slug}`
4. **Verifica traduzioni**:
   - `/en/insights/{slug}` (versione inglese)
   - `/sl/insights/{slug}` (versione slovena)

---

## 🎯 Struttura File Generati

### File Articolo (esempio: `intelligenza-artificiale.mdx`)

```yaml
---
title: "Guida Completa all'Intelligenza Artificiale"
slug: intelligenza-artificiale
lang: it
status: publish
excerpt: "Scopri tutto quello che devi sapere sull'AI nel 2024"
description: "Guida completa all'intelligenza artificiale..."
date: 2024-01-15
categories:
  - AI
  - Tutorial
tags:
  - machine-learning
  - deep-learning
---

## Introduzione

Il contenuto dell'articolo in Markdown...
```

### Traduzioni Automatiche

**EN**: `src/content/insights/en-intelligenza-artificiale.mdx`
```yaml
slug: en-intelligenza-artificiale
lang: en
title: "Complete Guide to Artificial Intelligence"
```

**SL**: `src/content/insights/sl-intelligenza-artificiale.mdx`
```yaml
slug: sl-intelligenza-artificiale
lang: sl
title: "Popoln Vodnik po Umetni Inteligenci"
```

---

## 🔧 API Endpoints

Tutti gli endpoint sono protetti con token di autenticazione.

### POST `/api/admin/auth`
Autenticazione admin

**Request:**
```json
{
  "password": "tua-password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "base64-token",
  "message": "Autenticazione riuscita"
}
```

### POST `/api/admin/save-article`
Salva un nuovo articolo

**Headers:**
```
X-Admin-Token: {token}
```

**Request:**
```json
{
  "contentType": "insights",
  "title": "Titolo Articolo",
  "slug": "titolo-articolo",
  "excerpt": "Breve descrizione...",
  "description": "Meta description per SEO",
  "categories": ["AI", "Tutorial"],
  "tags": ["python", "ml"],
  "content": "# Contenuto\n\nArticolo in markdown...",
  "status": "publish",
  "lang": "it"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Articolo salvato con successo",
  "filePath": "src/content/insights/titolo-articolo.mdx",
  "fullPath": "/full/path/to/file.mdx"
}
```

### POST `/api/admin/generate-image`
Genera immagine cover con DALL-E 3

**Headers:**
```
X-Admin-Token: {token}
```

**Request:**
```json
{
  "title": "Titolo Articolo",
  "slug": "titolo-articolo",
  "customPrompt": "Optional custom DALL-E prompt"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Immagine generata con successo",
  "imagePath": "/images/covers/titolo-articolo-cover.jpg",
  "fileName": "titolo-articolo-cover.jpg",
  "size": {
    "width": 1200,
    "height": 675
  }
}
```

### POST `/api/admin/translate-article`
Traduce un articolo esistente

**Headers:**
```
X-Admin-Token: {token}
```

**Request:**
```json
{
  "filePath": "src/content/insights/titolo-articolo.mdx",
  "targetLang": "en",
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Traduzione in EN completata",
  "translatedPath": "src/content/insights/en-titolo-articolo.mdx",
  "output": "Script output..."
}
```

---

## 🔐 Sicurezza

### Ambiente Locale
- ✅ Admin accessibile **solo in localhost**
- ✅ Password protetta
- ✅ Token di sessione in localStorage
- ✅ `noindex, nofollow` nella pagina admin

### NON Usare in Produzione Online
⚠️ **Questa implementazione è progettata solo per uso locale**

Se vuoi esporre l'admin online, aggiungi:
1. Autenticazione robusta (JWT + Netlify Identity)
2. HTTPS obbligatorio
3. Rate limiting sulle API
4. Backup automatico prima delle modifiche
5. Logging delle azioni admin

---

## 🐛 Troubleshooting

### Errore: "OpenAI API key non configurata"
**Soluzione**: Verifica che `.env` contenga `OPENAI_API_KEY=sk-...`

### Errore: "File già esistente"
**Soluzione**: Cambia lo slug dell'articolo o elimina manualmente il file esistente

### Preview non si aggiorna
**Soluzione**: Ricarica la pagina dopo aver salvato l'articolo

### Traduzione fallisce
**Soluzione**:
1. Verifica OPENAI_API_KEY
2. Controlla che il file italiano esista
3. Guarda i log nella console

### Immagine DALL-E troppo lenta
**Soluzione**: DALL-E 3 impiega 10-30 secondi. Considera:
- Usare immagini predefinite per articoli non critici
- Generare batch di immagini offline con script

---

## 📊 Costi OpenAI

### DALL-E 3
- **Standard 1792x1024**: ~$0.08 per immagine
- **Stima**: 10 articoli/mese = ~$0.80/mese

### Traduzione (gpt-4o-mini)
- **Input**: ~$0.15 per 1M token
- **Output**: ~$0.60 per 1M token
- **Stima per articolo 1000 parole**: ~$0.002
- **Stima**: 20 articoli/mese × 2 lingue = ~$0.08/mese

**Totale stimato**: < $1/mese per uso normale

---

## 🎨 Personalizzazioni

### Cambiare Stile Immagini DALL-E

Modifica il prompt in `netlify/functions/admin-generate-image.ts`:

```typescript
const prompt = `
  Create a modern cover image for "${title}".
  Style: [TUO STILE QUI]
  Colors: [TUE PALETTE QUI]
  Elements: [ELEMENTI QUI]
`
```

### Aggiungere Campi Custom al Frontmatter

1. Aggiungi input in `src/pages/admin/index.astro`
2. Aggiorna `ArticleData` interface in `admin-save-article.ts`
3. Includi nel frontmatter object

### Usare Modello OpenAI Diverso

In `.env`:
```bash
I18N_OPENAI_MODEL=gpt-4o  # Più accurato ma più costoso
```

---

## 📚 Comandi Utili

```bash
# Avvia admin CMS
npm run dev:netlify

# Solo dev Astro (senza functions)
npm run dev

# Build produzione
npm run build

# Traduzione manuale da terminale
npm run i18n:translate:one -- --file src/content/insights/article.mdx --to en

# Genera covers batch
npm run content:generate-covers
```

---

## 🔄 Git Workflow

Dopo aver creato articoli:

```bash
# Verifica file creati
git status

# Aggiungi i nuovi articoli
git add src/content/

# Commit
git commit -m "Add: nuovo articolo su [topic]"

# Push
git push origin main
```

Netlify rileverà il push e farà rebuild automatico (~2-5 min).

---

## ✅ Checklist Pre-Deploy

Prima di pushare nuovi articoli:

- [ ] Verificato frontmatter corretto (slug, date, status)
- [ ] Testato preview locale dell'articolo
- [ ] Verificato tutte le traduzioni (IT, EN, SL)
- [ ] Immagine cover generata (se necessaria)
- [ ] Links interni funzionanti
- [ ] Categorie e tags corretti
- [ ] Meta description compilata

---

## 📝 Note Tecniche

### Architettura i18n
- **IT (default)**: slug senza prefisso → `article.mdx`
- **EN**: slug con prefisso → `en-article.mdx`
- **SL**: slug con prefisso → `sl-article.mdx`
- **NO sottocartelle**: tutto nella stessa directory

### Filtri Collection
```typescript
// Italiano
getCollection('insights', ({ id }) => 
  !id.startsWith('en-') && !id.startsWith('sl-')
)

// Inglese
getCollection('insights', ({ id }) => id.startsWith('en-'))

// Sloveno
getCollection('insights', ({ id }) => id.startsWith('sl-'))
```

---

## 🙏 Supporto

Per problemi o domande:
1. Controlla i log in console browser (F12)
2. Verifica i log Netlify Functions nel terminale
3. Verifica variabili ambiente in `.env`

---

**Creato per**: Chermaz.com  
**Versione**: 1.0.0  
**Data**: Gennaio 2025



