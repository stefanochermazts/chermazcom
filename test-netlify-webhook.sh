#!/bin/bash

# Script per testare il webhook su Netlify
# Testa sia locale che produzione

# Configurazione
NETLIFY_URL=${NETLIFY_URL:-"https://your-site.netlify.app"}
WEBHOOK_SECRET=${WEBHOOK_SECRET:-"your-webhook-secret"}

echo "🧪 Test Webhook Netlify per Chermaz.com"
echo "======================================="
echo "URL: $NETLIFY_URL"
echo "Secret: ${WEBHOOK_SECRET:0:8}..."
echo ""

# Test 1: Test endpoint
echo "🔧 Test 1: Test Endpoint"
echo "Endpoint: $NETLIFY_URL/api/webhook/test"

response1=$(curl -s -w "\n%{http_code}" -X POST "$NETLIFY_URL/api/webhook/test" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"test": true, "timestamp": "'$(date -Iseconds)'"}')

http_code1=$(echo "$response1" | tail -n1)
body1=$(echo "$response1" | head -n -1)

if [ "$http_code1" = "200" ]; then
    echo "✅ Test endpoint: SUCCESS"
    echo "$body1" | jq '.' 2>/dev/null || echo "$body1"
else
    echo "❌ Test endpoint: FAILED (HTTP $http_code1)"
    echo "$body1"
fi

echo ""

# Test 2: Webhook articolo (solo se test 1 è passato)
if [ "$http_code1" = "200" ]; then
    echo "📝 Test 2: Webhook Articolo"
    echo "Endpoint: $NETLIFY_URL/api/webhook/article"
    
    # Crea payload di test
    test_payload=$(cat << 'EOF'
{
  "id": 999,
  "title": "Test Netlify Webhook - Articolo di Prova",
  "metaDescription": "Articolo di test per verificare il funzionamento del webhook su Netlify",
  "content_markdown": "# Test Netlify Webhook - Articolo di Prova\n\nQuesto è un articolo di test per verificare che il sistema webhook funzioni correttamente su Netlify.\n\n## Funzionalità Testate\n\n| Funzionalità | Status |\n|--------------|--------|\n| **Ricezione Webhook** | ✅ Funzionante |\n| **Generazione Frontmatter** | ✅ Automatica |\n| **Conversione Tabelle** | ✅ Componenti eleganti |\n| **Commit GitHub** | ✅ Automatico |\n\n## Contenuto di Esempio\n\nL'intelligenza artificiale sta trasformando il modo in cui lavoriamo. Questo test verifica che:\n\n- Il frontmatter venga generato correttamente\n- Le tabelle vengano convertite in componenti\n- Il file venga creato su GitHub\n- Tutto il processo sia automatico\n\n## Conclusioni\n\nSe vedi questo articolo pubblicato, il sistema webhook funziona perfettamente! 🎉",
  "languageCode": "it",
  "publicUrl": "https://chermaz.com/it/insights/test-netlify-webhook",
  "createdAt": "2025-01-20T15:30:00.000Z"
}
EOF
)
    
    response2=$(curl -s -w "\n%{http_code}" -X POST "$NETLIFY_URL/api/webhook/article" \
      -H "Authorization: Bearer $WEBHOOK_SECRET" \
      -H "Content-Type: application/json" \
      -d "$test_payload")
    
    http_code2=$(echo "$response2" | tail -n1)
    body2=$(echo "$response2" | head -n -1)
    
    if [ "$http_code2" = "200" ]; then
        echo "✅ Webhook articolo: SUCCESS"
        echo "$body2" | jq '.' 2>/dev/null || echo "$body2"
        
        # Estrai GitHub URL se presente
        github_url=$(echo "$body2" | jq -r '.article.githubUrl' 2>/dev/null)
        if [ "$github_url" != "null" ] && [ -n "$github_url" ]; then
            echo ""
            echo "🔗 Articolo creato su GitHub: $github_url"
        fi
        
    else
        echo "❌ Webhook articolo: FAILED (HTTP $http_code2)"
        echo "$body2"
    fi
else
    echo "⏭️  Saltando test articolo (test endpoint fallito)"
fi

echo ""

# Test 3: Verifica configurazione
echo "⚙️  Test 3: Verifica Configurazione"

# Controlla se le variabili ambiente sono configurate
config_test=$(curl -s -X POST "$NETLIFY_URL/api/webhook/test" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"config_check": true}')

has_webhook_secret=$(echo "$config_test" | jq -r '.environment.hasWebhookSecret' 2>/dev/null)
has_github_token=$(echo "$config_test" | jq -r '.environment.hasGithubToken' 2>/dev/null)

if [ "$has_webhook_secret" = "true" ]; then
    echo "✅ WEBHOOK_SECRET configurato"
else
    echo "❌ WEBHOOK_SECRET mancante"
fi

if [ "$has_github_token" = "true" ]; then
    echo "✅ GITHUB_TOKEN configurato"
else
    echo "❌ GITHUB_TOKEN mancante"
fi

echo ""
echo "🎯 Riepilogo Test:"
echo "=================="

if [ "$http_code1" = "200" ]; then
    echo "✅ Endpoint test: OK"
else
    echo "❌ Endpoint test: FAILED"
fi

if [ "$http_code2" = "200" ]; then
    echo "✅ Webhook articolo: OK"
elif [ "$http_code1" != "200" ]; then
    echo "⏭️  Webhook articolo: SKIPPED"
else
    echo "❌ Webhook articolo: FAILED"
fi

if [ "$has_webhook_secret" = "true" ] && [ "$has_github_token" = "true" ]; then
    echo "✅ Configurazione: OK"
else
    echo "❌ Configurazione: INCOMPLETA"
fi

echo ""

if [ "$http_code1" = "200" ] && [ "$http_code2" = "200" ]; then
    echo "🎉 Tutti i test sono passati! Il webhook è pronto per l'uso."
    echo ""
    echo "💡 Per pulire l'articolo di test:"
    echo "   Vai su GitHub e rimuovi: src/content/insights/test-netlify-webhook-articolo-di-prova.mdx"
else
    echo "⚠️  Alcuni test sono falliti. Controlla la configurazione:"
    echo ""
    echo "1. Variabili ambiente nel dashboard Netlify:"
    echo "   - WEBHOOK_SECRET"
    echo "   - GITHUB_TOKEN"
    echo "   - GITHUB_OWNER"
    echo "   - GITHUB_REPO"
    echo ""
    echo "2. Permessi GitHub Token:"
    echo "   - repo (full control)"
    echo ""
    echo "3. URL corretto del sito Netlify"
fi
