#!/bin/bash

# Script per testare il webhook server
# Invia un articolo di esempio per verificare il funzionamento

WEBHOOK_URL="http://localhost:3001"
SECRET="chermaz-webhook-secret-2025"

echo "🧪 Test Webhook Server per Chermaz.com"
echo "======================================"

# Verifica se il server è in esecuzione
echo "🔍 Verifica server..."
if ! curl -s "$WEBHOOK_URL/health" > /dev/null; then
    echo "❌ Server webhook non raggiungibile su $WEBHOOK_URL"
    echo "   Avvia il server con: ./start-webhook.sh"
    exit 1
fi

echo "✅ Server webhook attivo"

# Test 1: Health check
echo ""
echo "📊 Test 1: Health Check"
curl -s "$WEBHOOK_URL/health" | jq '.' || echo "Risposta ricevuta (jq non disponibile)"

# Test 2: Test endpoint
echo ""
echo "🔧 Test 2: Test Endpoint"
curl -X POST "$WEBHOOK_URL/webhook/test" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d '{"test": true, "timestamp": "'$(date -Iseconds)'"}' \
  | jq '.' 2>/dev/null || echo "Test completato"

# Test 3: Invio articolo completo
echo ""
echo "📝 Test 3: Invio Articolo Completo"
echo "Invio articolo di esempio..."

response=$(curl -s -X POST "$WEBHOOK_URL/webhook/article" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d @test-webhook.json)

echo "Risposta ricevuta:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

# Verifica se il file è stato creato
echo ""
echo "📁 Verifica File Creato"
if [ -f "src/content/insights/come-l-intelligenza-artificiale-sta-trasformando-il-marketing-digitale.mdx" ]; then
    echo "✅ File articolo creato con successo!"
    echo "📄 Percorso: src/content/insights/come-l-intelligenza-artificiale-sta-trasformando-il-marketing-digitale.mdx"
    
    # Mostra le prime righe del frontmatter
    echo ""
    echo "🔍 Frontmatter generato:"
    head -15 "src/content/insights/come-l-intelligenza-artificiale-sta-trasformando-il-marketing-digitale.mdx"
    echo "..."
else
    echo "❌ File articolo non trovato"
fi

# Test 4: Verifica Git
echo ""
echo "📋 Test 4: Verifica Git"
if git log --oneline -1 | grep -q "Come l'Intelligenza Artificiale"; then
    echo "✅ Commit Git creato con successo!"
    git log --oneline -1
else
    echo "⚠️  Commit Git non trovato (normale se Git non è configurato)"
fi

echo ""
echo "🎉 Test completati!"
echo ""
echo "💡 Per pulire i file di test:"
echo "   rm -f src/content/insights/come-l-intelligenza-artificiale-sta-trasformando-il-marketing-digitale.mdx*"
