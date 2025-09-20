# 🔧 Configurazione Variabili Ambiente Netlify

## Variabili Obbligatorie

Vai su: **Netlify Dashboard > Site settings > Environment variables**

### 1. WEBHOOK_SECRET
```
Key: WEBHOOK_SECRET
Value: your-secure-webhook-secret-here
```
**Genera un secret sicuro:**
```bash
# Su WSL/Linux
openssl rand -base64 32
# Oppure
echo "chermaz-webhook-$(date +%s)-$(openssl rand -hex 8)"
```

### 2. GITHUB_TOKEN
```
Key: GITHUB_TOKEN  
Value: ghp_your-github-personal-access-token
```

**Come creare GitHub Token:**
1. Vai su: https://github.com/settings/tokens
2. **"Generate new token (classic)"**
3. **Scopes da selezionare:**
   - ✅ `repo` (Full control of private repositories)
4. **Copia il token** (inizia con `ghp_`)

### 3. GITHUB_OWNER
```
Key: GITHUB_OWNER
Value: your-github-username
```

### 4. GITHUB_REPO
```
Key: GITHUB_REPO
Value: chermazcom
```

## Verifica Configurazione

Dopo aver configurato le variabili, testa:

```bash
# Sostituisci con il tuo URL Netlify
curl -X POST https://your-site.netlify.app/api/webhook/test \
  -H "Authorization: Bearer your-webhook-secret" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Risposta attesa:**
```json
{
  "success": true,
  "environment": {
    "hasWebhookSecret": true,
    "hasGithubToken": true
  }
}
```
