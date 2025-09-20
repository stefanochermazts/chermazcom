# 🚀 Sistema Webhook Chermaz.com

Sistema automatizzato per la pubblicazione di articoli tramite webhook. Riceve articoli da tool esterni e li pubblica automaticamente sul sito con frontmatter generato, tabelle convertite e commit Git automatico.

## 📋 Funzionalità

- ✅ **Ricezione webhook** con autenticazione Bearer token
- ✅ **Generazione automatica frontmatter** basata sul contenuto
- ✅ **Conversione automatica tabelle** in componenti eleganti
- ✅ **Commit e push Git** automatico
- ✅ **Logging completo** e gestione errori
- ✅ **Slug generation** automatica da titolo
- ✅ **Categorizzazione intelligente** basata su parole chiave

## 🛠️ Installazione e Avvio

### Prerequisiti
- Node.js (v16+)
- Git configurato
- Repository Chermaz.com

### Avvio Rapido
```bash
# Avvia il server webhook
./start-webhook.sh

# In alternativa, avvio manuale:
export WEBHOOK_SECRET="your-secret-here"
export WEBHOOK_PORT=3001
node webhook-server.js
```

### Test del Sistema
```bash
# Testa tutti i componenti
./test-webhook.sh

# Test manuale con curl
curl -X POST http://localhost:3001/webhook/article \
  -H "Authorization: Bearer your-secret" \
  -H "Content-Type: application/json" \
  -d @test-webhook.json
```

## 📡 API Endpoints

### POST /webhook/article
Riceve e pubblica un nuovo articolo.

**Headers:**
```
Authorization: Bearer your-webhook-secret
Content-Type: application/json
```

**Payload:**
```json
{
  "id": 10,
  "title": "Titolo Articolo",
  "content_markdown": "# Contenuto in Markdown...",
  "languageCode": "it",
  "createdAt": "2025-01-20T15:30:00.000Z"
}
```

**Risposta Successo (200):**
```json
{
  "success": true,
  "message": "Article published successfully",
  "article": {
    "id": 10,
    "title": "Titolo Articolo",
    "slug": "titolo-articolo",
    "fileName": "titolo-articolo.mdx",
    "filePath": "src/content/insights/titolo-articolo.mdx",
    "gitPushed": true,
    "publishedAt": "2025-01-20T15:30:00.000Z"
  }
}
```

### GET /health
Health check del server.

### POST /webhook/test
Test dell'autenticazione e connettività.

## 🔧 Configurazione

### Variabili Ambiente
```bash
# Porta del server (default: 3001)
export WEBHOOK_PORT=3001

# Secret per autenticazione Bearer token
export WEBHOOK_SECRET="your-secure-secret-here"
```

### Configurazione Git
Il sistema richiede Git configurato per i commit automatici:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 🎯 Processo Automatico

Quando riceve un articolo, il sistema:

1. **Valida** il payload e l'autenticazione
2. **Genera slug** dal titolo (normalizzazione italiana)
3. **Crea frontmatter** automatico con:
   - Categorie basate su parole chiave nel contenuto
   - Tag pertinenti estratti automaticamente
   - Excerpt dalle prime frasi dell'articolo
   - Data corrente e metadati standard
4. **Scrive file** `.mdx` in `src/content/insights/`
5. **Converte tabelle** markdown in componenti eleganti
6. **Commit Git** con messaggio dettagliato
7. **Push** su branch main

## 📊 Generazione Frontmatter

Il sistema analizza il contenuto e genera automaticamente:

### Categorie (basate su parole chiave)
- **Intelligenza Artificiale**: IA, machine learning, AI
- **Trasformazione Digitale**: digital, trasformazione, digitalizzazione
- **Strategia Aziendale**: strategia, business, aziendale
- **Tecnologia**: tecnologia, software, sviluppo

### Tag Automatici
Estratti dal contenuto e combinati con tag generici come:
- innovazione, digital transformation, tecnologia, sviluppo

### Excerpt
Prime 2 frasi significative del contenuto, troncate a 155 caratteri.

## 🔄 Conversione Tabelle

Utilizza il sistema esistente `convert-takeaway-table.js` per convertire automaticamente:
- Tabelle a 2 colonne → `TakeawayTable` component
- Tabelle 3+ colonne → `FlexibleTable` component
- Preserva formattazione e stile

## 📝 Logging

Il server logga tutte le operazioni:
```
[2025-01-20T15:30:00.000Z] POST /webhook/article
📝 Ricevuto nuovo articolo: "Titolo Esempio"
✅ File creato: titolo-esempio.mdx
🔄 Conversione tabelle per: src/content/insights/titolo-esempio.mdx
✅ Tabelle convertite con successo
📝 Commit e push per: titolo-esempio.mdx
✅ Articolo pushato su Git con successo
🎉 Articolo pubblicato con successo: titolo-esempio
```

## 🛡️ Sicurezza

- **Bearer Token Authentication** obbligatoria
- **Validazione payload** completa
- **Controllo file esistenti** (evita sovrascritture)
- **Sanitizzazione slug** per sicurezza filesystem
- **Gestione errori** robusta

## 🚨 Gestione Errori

### Errori Comuni

**401 Unauthorized**
```json
{"error": "Missing or invalid Authorization header"}
```

**400 Bad Request**
```json
{"error": "Missing required fields: title and content_markdown"}
```

**409 Conflict**
```json
{
  "error": "Article already exists",
  "slug": "existing-article",
  "filePath": "existing-article.mdx"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "message": "Dettagli errore specifico"
}
```

## 🔧 Manutenzione

### Pulizia File di Test
```bash
rm -f src/content/insights/come-l-intelligenza-artificiale-sta-trasformando-il-marketing-digitale.mdx*
```

### Restart Server
```bash
# Trova processo
ps aux | grep webhook-server

# Kill processo
kill <PID>

# Riavvia
./start-webhook.sh
```

### Backup e Recovery
Il sistema crea automaticamente backup durante la conversione tabelle. Per recovery:
```bash
# Ripristina da backup
cp file.mdx.backup file.mdx
```

## 📈 Monitoraggio

### Health Check Automatico
```bash
# Verifica stato server
curl http://localhost:3001/health

# Risposta attesa
{"status":"OK","timestamp":"2025-01-20T15:30:00.000Z","uptime":3600}
```

### Log Monitoring
```bash
# Segui log in tempo reale
tail -f webhook.log

# Filtra errori
grep "❌\|ERROR" webhook.log
```

## 🎉 Esempio Completo

1. **Avvia server**: `./start-webhook.sh`
2. **Invia articolo**: `./test-webhook.sh`
3. **Verifica risultato**: Controlla `src/content/insights/`
4. **Conferma Git**: `git log --oneline -1`

Il sistema è ora pronto per ricevere articoli da qualsiasi tool esterno e pubblicarli automaticamente su Chermaz.com! 🚀
