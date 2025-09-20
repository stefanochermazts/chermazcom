#!/bin/bash

# Test semplice per webhook Netlify (senza CLI)
# Usa solo curl per testare gli endpoint

echo "🧪 Test Webhook Netlify (Senza CLI)"
echo "=================================="

# Configurazione
read -p "🔗 Inserisci URL Netlify (es: https://amazing-site-123456.netlify.app): " NETLIFY_URL
read -p "🔐 Inserisci Webhook Secret: " WEBHOOK_SECRET

if [ -z "$NETLIFY_URL" ] || [ -z "$WEBHOOK_SECRET" ]; then
    echo "❌ URL o Secret mancanti"
    exit 1
fi

echo ""
echo "🔍 Testing endpoint: $NETLIFY_URL/api/webhook/test"

# Test 1: Endpoint di test
response=$(curl -s -w "\n%{http_code}" -X POST "$NETLIFY_URL/api/webhook/test" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"test": true, "timestamp": "'$(date -Iseconds)'"}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

echo "📊 Risposta HTTP: $http_code"

if [ "$http_code" = "200" ]; then
    echo "✅ Test endpoint: SUCCESS"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    
    # Verifica configurazione
    has_webhook=$(echo "$body" | jq -r '.environment.hasWebhookSecret' 2>/dev/null)
    has_github=$(echo "$body" | jq -r '.environment.hasGithubToken' 2>/dev/null)
    
    echo ""
    echo "🔧 Configurazione:"
    if [ "$has_webhook" = "true" ]; then
        echo "✅ WEBHOOK_SECRET configurato"
    else
        echo "❌ WEBHOOK_SECRET mancante"
    fi
    
    if [ "$has_github" = "true" ]; then
        echo "✅ GITHUB_TOKEN configurato"
    else
        echo "❌ GITHUB_TOKEN mancante"
    fi
    
    if [ "$has_webhook" = "true" ] && [ "$has_github" = "true" ]; then
        echo ""
        echo "🎉 Configurazione completa! Il webhook è pronto per ricevere articoli."
        echo ""
        echo "📝 Endpoint per tool esterni:"
        echo "   POST $NETLIFY_URL/api/webhook/article"
        echo "   Authorization: Bearer $WEBHOOK_SECRET"
        echo ""
        echo "💡 Testa con un articolo di esempio:"
        echo "   curl -X POST $NETLIFY_URL/api/webhook/article \\"
        echo "     -H \"Authorization: Bearer $WEBHOOK_SECRET\" \\"
        echo "     -H \"Content-Type: application/json\" \\"
        echo "     -d @test-webhook.json"
    else
        echo ""
        echo "⚠️  Configurazione incompleta. Aggiungi le variabili mancanti nel dashboard Netlify."
    fi
    
else
    echo "❌ Test fallito"
    echo "Risposta: $body"
    echo ""
    echo "🔧 Possibili cause:"
    echo "1. URL Netlify errato"
    echo "2. Webhook secret errato"
    echo "3. Sito non ancora deployato"
    echo "4. Functions non configurate"
fi
