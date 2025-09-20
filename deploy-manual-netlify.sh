#!/bin/bash

# Deploy manuale su Netlify senza CLI
# Usa API diretta di Netlify per deploy

echo "🚀 Deploy Manuale su Netlify (Senza CLI)"
echo "========================================"

# Configurazione
SITE_ID=${NETLIFY_SITE_ID:-""}
ACCESS_TOKEN=${NETLIFY_ACCESS_TOKEN:-""}

if [ -z "$SITE_ID" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Configurazione mancante!"
    echo ""
    echo "Configura le variabili ambiente:"
    echo "export NETLIFY_SITE_ID='your-site-id'"
    echo "export NETLIFY_ACCESS_TOKEN='your-access-token'"
    echo ""
    echo "Per ottenere i valori:"
    echo "1. Site ID: Dashboard Netlify > Site settings > General"
    echo "2. Access Token: https://app.netlify.com/user/applications#personal-access-tokens"
    exit 1
fi

# Verifica dipendenze
if ! command -v curl &> /dev/null; then
    echo "❌ curl non trovato. Installalo con: sudo apt install curl"
    exit 1
fi

if ! command -v zip &> /dev/null; then
    echo "❌ zip non trovato. Installalo con: sudo apt install zip"
    exit 1
fi

echo "📦 Preparazione build..."

# Build del sito
if ! npm run build; then
    echo "❌ Build fallito"
    exit 1
fi

echo "✅ Build completato"

# Installa dipendenze functions
echo "📦 Installazione dipendenze functions..."
cd netlify/functions
if [ -f "package.json" ]; then
    npm install --production
fi
cd ../..

# Crea archivio per deploy
echo "📦 Creazione archivio deploy..."
DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copia dist
cp -r dist/* "$DEPLOY_DIR/"

# Copia functions
mkdir -p "$DEPLOY_DIR/.netlify/functions"
cp -r netlify/functions/* "$DEPLOY_DIR/.netlify/functions/"

# Crea zip
cd "$DEPLOY_DIR"
zip -r "../${DEPLOY_DIR}.zip" . > /dev/null
cd ..

echo "✅ Archivio creato: ${DEPLOY_DIR}.zip"

# Deploy via API
echo "🚀 Deploy su Netlify..."

DEPLOY_RESPONSE=$(curl -s -X POST \
  "https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/zip" \
  --data-binary "@${DEPLOY_DIR}.zip")

DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
DEPLOY_URL=$(echo "$DEPLOY_RESPONSE" | grep -o '"deploy_ssl_url":"[^"]*"' | cut -d'"' -f4)

if [ -n "$DEPLOY_ID" ]; then
    echo "✅ Deploy avviato!"
    echo "📋 Deploy ID: $DEPLOY_ID"
    echo "🔗 URL: $DEPLOY_URL"
    
    # Monitora stato deploy
    echo "⏳ Monitoraggio deploy..."
    for i in {1..30}; do
        STATUS_RESPONSE=$(curl -s \
          "https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys/${DEPLOY_ID}" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}")
        
        STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
        
        case "$STATUS" in
            "ready")
                echo "✅ Deploy completato con successo!"
                echo "🌐 Sito live: $DEPLOY_URL"
                break
                ;;
            "error"|"failed")
                echo "❌ Deploy fallito"
                echo "$STATUS_RESPONSE"
                break
                ;;
            *)
                echo "⏳ Stato: $STATUS (tentativo $i/30)"
                sleep 10
                ;;
        esac
    done
else
    echo "❌ Deploy fallito"
    echo "$DEPLOY_RESPONSE"
fi

# Pulizia
echo "🧹 Pulizia file temporanei..."
rm -rf "$DEPLOY_DIR" "${DEPLOY_DIR}.zip"

echo "🎉 Deploy completato!"
