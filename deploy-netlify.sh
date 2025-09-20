#!/bin/bash

# Script per deploy del sistema webhook su Netlify
# Configura tutto il necessario per il funzionamento

echo "🚀 Deploy Sistema Webhook su Netlify"
echo "===================================="

# Controlla se Netlify CLI è installato
if ! command -v netlify &> /dev/null; then
    echo "📦 Installazione Netlify CLI..."
    npm install -g netlify-cli
fi

# Controlla se siamo in un progetto Netlify
if [ ! -f ".netlify/state.json" ]; then
    echo "⚠️  Progetto non ancora collegato a Netlify"
    echo "   Esegui: netlify init"
    echo "   Oppure: netlify link"
    exit 1
fi

# Installa dipendenze per le functions
echo "📦 Installazione dipendenze functions..."
cd netlify/functions
npm install
cd ../..

# Verifica configurazione
echo "🔍 Verifica configurazione..."

# Controlla netlify.toml
if [ ! -f "netlify.toml" ]; then
    echo "❌ netlify.toml non trovato"
    exit 1
fi

echo "✅ netlify.toml presente"

# Controlla functions
if [ ! -f "netlify/functions/webhook-article.js" ]; then
    echo "❌ Function webhook-article.js non trovata"
    exit 1
fi

echo "✅ Functions presenti"

# Deploy
echo ""
echo "🚀 Deploy su Netlify..."
netlify deploy --prod

# Ottieni URL del sito
SITE_URL=$(netlify status --json | jq -r '.site_url' 2>/dev/null)
if [ "$SITE_URL" = "null" ] || [ -z "$SITE_URL" ]; then
    SITE_URL="https://your-site.netlify.app"
fi

echo ""
echo "🎉 Deploy completato!"
echo ""
echo "📡 Endpoints webhook disponibili:"
echo "   POST $SITE_URL/.netlify/functions/webhook-article"
echo "   POST $SITE_URL/api/webhook/article (redirect)"
echo "   POST $SITE_URL/.netlify/functions/webhook-test"
echo "   POST $SITE_URL/api/webhook/test (redirect)"
echo ""
echo "⚙️  Configurazione richiesta nel dashboard Netlify:"
echo "   1. Vai su: https://app.netlify.com/sites/[your-site]/settings/env-vars"
echo "   2. Aggiungi le seguenti variabili ambiente:"
echo ""
echo "   WEBHOOK_SECRET = your-secure-webhook-secret"
echo "   GITHUB_TOKEN = ghp_your-github-personal-access-token"
echo "   GITHUB_OWNER = your-github-username"
echo "   GITHUB_REPO = chermazcom"
echo ""
echo "📝 Per creare GitHub Token:"
echo "   1. Vai su: https://github.com/settings/tokens"
echo "   2. Generate new token (classic)"
echo "   3. Seleziona scopes: repo (full control)"
echo "   4. Copia il token generato"
echo ""
echo "🧪 Test dopo configurazione:"
echo "   curl -X POST $SITE_URL/api/webhook/test \\"
echo "     -H \"Authorization: Bearer your-webhook-secret\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"test\": true}'"
