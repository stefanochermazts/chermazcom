# 🚀 Deploy Netlify tramite Git (Senza CLI)

## Setup Automatico via Dashboard Netlify

### 1. Collega Repository GitHub
1. Vai su [netlify.com](https://netlify.com) e fai login
2. **New site from Git** → **GitHub**
3. Seleziona repository `chermazcom`
4. Configurazione build:
   ```
   Build command: npm run build
   Publish directory: dist
   Functions directory: netlify/functions
   ```

### 2. Configurazione Automatica
Netlify rileverà automaticamente `netlify.toml` e configurerà:
- ✅ Build settings
- ✅ Functions directory
- ✅ Redirects
- ✅ Headers

### 3. Variabili Ambiente
Nel dashboard Netlify (`Site settings > Environment variables`):
```
WEBHOOK_SECRET = "your-secure-webhook-secret"
GITHUB_TOKEN = "ghp_your-github-personal-access-token"
GITHUB_OWNER = "your-github-username"
GITHUB_REPO = "chermazcom"
```

### 4. Deploy Automatico
Ogni push su `main` triggera automaticamente:
1. Build del sito Astro
2. Deploy delle Netlify Functions
3. Aggiornamento endpoints webhook

## Vantaggi Deploy Git
- ✅ **Zero configurazione locale**
- ✅ **Deploy automatici** ad ogni push
- ✅ **Preview deployments** per PR
- ✅ **Rollback facile** tramite dashboard
- ✅ **Nessun CLI richiesto**

## Test dopo Deploy
```bash
# Sostituisci con il tuo URL Netlify
export NETLIFY_URL="https://amazing-site-123456.netlify.app"
export WEBHOOK_SECRET="your-webhook-secret"

# Test endpoint
curl -X POST $NETLIFY_URL/api/webhook/test \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```
