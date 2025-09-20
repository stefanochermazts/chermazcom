# 🚀 Deploy Sistema Webhook su Netlify

Guida completa per deployare il sistema webhook di Chermaz.com su Netlify usando Netlify Functions e GitHub API.

## 📋 Panoramica

Il sistema webhook su Netlify utilizza:
- **Netlify Functions** (serverless) invece di server Express persistente
- **GitHub API** per creare/aggiornare file invece di operazioni Git locali
- **Variabili ambiente Netlify** per configurazione sicura
- **Redirect automatici** per URL puliti

## 🛠️ Setup Iniziale

### 1. Prerequisiti
```bash
# Installa Netlify CLI
npm install -g netlify-cli

# Login a Netlify
netlify login

# Collega il progetto (se non già fatto)
netlify init
# oppure
netlify link
```

### 2. Configurazione GitHub Token
1. Vai su [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. **Generate new token (classic)**
3. Seleziona scope: **repo (full control)**
4. Copia il token generato (inizia con `ghp_`)

### 3. Deploy
```bash
# Deploy automatico con script
./deploy-netlify.sh

# Deploy manuale
cd netlify/functions && npm install && cd ../..
netlify deploy --prod
```

## ⚙️ Configurazione Variabili Ambiente

Nel **dashboard Netlify** (`Site settings > Environment variables`):

```bash
# Obbligatorie
WEBHOOK_SECRET = "your-secure-webhook-secret-here"
GITHUB_TOKEN = "ghp_your-github-personal-access-token"
GITHUB_OWNER = "your-github-username"
GITHUB_REPO = "chermazcom"

# Opzionali (con default)
NODE_VERSION = "18"
```

### Sicurezza del Secret
Genera un secret sicuro:
```bash
# Genera secret casuale
openssl rand -base64 32

# Oppure usa UUID
uuidgen
```

## 📡 Endpoints Disponibili

Dopo il deploy, avrai questi endpoint:

### Endpoint Principali
```bash
# Webhook per ricevere articoli
POST https://your-site.netlify.app/.netlify/functions/webhook-article
POST https://your-site.netlify.app/api/webhook/article (redirect)

# Test del webhook
POST https://your-site.netlify.app/.netlify/functions/webhook-test
POST https://your-site.netlify.app/api/webhook/test (redirect)
```

### Autenticazione
Tutti gli endpoint richiedono:
```bash
Authorization: Bearer your-webhook-secret
Content-Type: application/json
```

## 🧪 Testing

### Test Automatico Completo
```bash
# Configura URL del tuo sito
export NETLIFY_URL="https://your-site.netlify.app"
export WEBHOOK_SECRET="your-webhook-secret"

# Esegui tutti i test
./test-netlify-webhook.sh
```

### Test Manuali

#### 1. Test Endpoint
```bash
curl -X POST https://your-site.netlify.app/api/webhook/test \
  -H "Authorization: Bearer your-webhook-secret" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Risposta attesa:**
```json
{
  "success": true,
  "message": "Webhook test successful",
  "environment": {
    "hasWebhookSecret": true,
    "hasGithubToken": true
  }
}
```

#### 2. Test Articolo Completo
```bash
curl -X POST https://your-site.netlify.app/api/webhook/article \
  -H "Authorization: Bearer your-webhook-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123,
    "title": "Test Articolo Netlify",
    "content_markdown": "# Test\n\nContenuto di prova...",
    "languageCode": "it"
  }'
```

## 🔄 Processo Automatico

Quando ricevi un webhook, il sistema:

1. **Valida** autenticazione e payload
2. **Genera** slug dal titolo
3. **Crea** frontmatter automatico
4. **Converte** tabelle markdown in componenti
5. **Usa GitHub API** per creare/aggiornare file
6. **Commit automatico** con messaggio dettagliato
7. **Risponde** con dettagli pubblicazione

### Differenze vs Server Locale
- ✅ **Serverless**: Nessun server da mantenere
- ✅ **Scalabile**: Auto-scaling Netlify
- ✅ **GitHub API**: Più affidabile di Git locale
- ✅ **HTTPS**: SSL automatico
- ⚠️ **Cold start**: Primo request può essere lento
- ⚠️ **Timeout**: 10 secondi max per function

## 📁 Struttura File

```
netlify/
├── functions/
│   ├── package.json          # Dipendenze functions
│   ├── webhook-article.js    # Function principale
│   └── webhook-test.js       # Function di test
netlify.toml                  # Configurazione Netlify
deploy-netlify.sh            # Script deploy
test-netlify-webhook.sh      # Script test
```

## 🛡️ Sicurezza

### Autenticazione
- **Bearer token** obbligatorio
- **Secret validation** su ogni request
- **CORS headers** configurati

### GitHub API
- **Personal Access Token** con scope limitato
- **Repository specifico** configurato
- **Commit attribution** automatica

### Netlify
- **Environment variables** criptate
- **HTTPS** automatico
- **Rate limiting** integrato

## 🚨 Troubleshooting

### Errori Comuni

#### 401 Unauthorized
```json
{"error": "Invalid webhook secret"}
```
**Soluzione**: Verifica `WEBHOOK_SECRET` nel dashboard Netlify

#### 500 GitHub API Error
```json
{"error": "GitHub API error: Bad credentials"}
```
**Soluzione**: Verifica `GITHUB_TOKEN` e permessi

#### Function Timeout
**Soluzione**: Ottimizza payload o dividi operazioni

### Debug

#### 1. Verifica Configurazione
```bash
curl https://your-site.netlify.app/api/webhook/test \
  -H "Authorization: Bearer your-secret" \
  -d '{"config_check": true}'
```

#### 2. Netlify Function Logs
1. Vai su **Netlify Dashboard**
2. **Functions** tab
3. **View function logs**

#### 3. GitHub Repository
Verifica che i commit appaiano nel repository GitHub

## 🔧 Manutenzione

### Update Functions
```bash
# Modifica functions
vim netlify/functions/webhook-article.js

# Deploy aggiornamenti
netlify deploy --prod
```

### Rotate Secrets
1. Genera nuovo secret
2. Aggiorna `WEBHOOK_SECRET` in Netlify
3. Aggiorna configurazione nei tool esterni

### Monitor Performance
- **Netlify Analytics**: Requests e performance
- **GitHub Insights**: Commit frequency
- **Function logs**: Errori e debug

## 📈 Scaling

### Ottimizzazioni
- **Payload size**: Mantieni sotto 6MB
- **Dependencies**: Minimizza imports nelle functions
- **Caching**: GitHub API ha rate limits

### Limiti Netlify
- **Function timeout**: 10 secondi
- **Payload size**: 6MB max
- **Concurrent executions**: 1000
- **Monthly invocations**: 125K (piano gratuito)

## 🎯 Esempio Integrazione

### Tool Esterno
```javascript
// Invia articolo a Netlify webhook
const response = await fetch('https://your-site.netlify.app/api/webhook/article', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-webhook-secret',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 123,
    title: 'Nuovo Articolo',
    content_markdown: '# Contenuto...',
    languageCode: 'it'
  })
});

const result = await response.json();
console.log('Articolo pubblicato:', result.article.githubUrl);
```

## 🎉 Vantaggi vs Server Locale

| Aspetto | Server Locale | Netlify Functions |
|---------|---------------|-------------------|
| **Costi** | Server dedicato | Pay-per-use |
| **Manutenzione** | Manuale | Zero |
| **Scalabilità** | Limitata | Automatica |
| **SSL** | Configurazione manuale | Automatico |
| **Uptime** | Dipende da infra | 99.9%+ |
| **Cold Start** | Sempre pronto | 1-2 secondi |

Il sistema è ora **production-ready** su Netlify! 🚀
