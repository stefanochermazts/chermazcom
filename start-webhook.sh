#!/bin/bash

# Script di avvio per il webhook server
# Configura l'ambiente e avvia il server

echo "🚀 Avvio Webhook Server per Chermaz.com"
echo "========================================"

# Controlla se Node.js è installato
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trovato. Installalo prima di continuare."
    exit 1
fi

# Controlla se Git è configurato
if ! git config user.name &> /dev/null; then
    echo "⚠️  Git non configurato. Configuralo con:"
    echo "   git config --global user.name 'Your Name'"
    echo "   git config --global user.email 'your.email@example.com'"
fi

# Crea directory se non esiste
mkdir -p src/content/insights

# Controlla dipendenze
if [ ! -d "node_modules" ]; then
    echo "📦 Installazione dipendenze..."
    npm install express
fi

# Configurazione variabili ambiente
export WEBHOOK_PORT=${WEBHOOK_PORT:-3001}
export WEBHOOK_SECRET=${WEBHOOK_SECRET:-"chermaz-webhook-secret-2025"}

echo "📡 Porta: $WEBHOOK_PORT"
echo "🔐 Secret: ${WEBHOOK_SECRET:0:8}..."
echo "📁 Directory: src/content/insights"
echo ""

# Rendi eseguibili gli script
chmod +x webhook-server.js
chmod +x convert-takeaway-table.js

echo "🎯 Endpoints disponibili:"
echo "   POST /webhook/article  - Ricevi nuovi articoli"
echo "   POST /webhook/test     - Test del webhook"
echo "   GET  /health          - Health check"
echo ""

echo "📝 Esempio di test con curl:"
echo 'curl -X POST http://localhost:3001/webhook/test \'
echo '  -H "Authorization: Bearer chermaz-webhook-secret-2025" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d "{\"test\": true}"'
echo ""

# Avvia il server
echo "🚀 Avvio server..."
node webhook-server.js
