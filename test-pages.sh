#!/bin/bash

# Script per testare rapidamente le pagine principali
# Uso: ./test-pages.sh [porta]

PORT=${1:-4324}
BASE_URL="http://localhost:$PORT"

echo "🧪 Testing pages on $BASE_URL"
echo "================================"

# Array delle pagine da testare
pages=(
    "/"
    "/it/"
    "/it/contatti/"
    "/it/servizi/"
    "/it/chi-sono/"
    "/it/privacy/"
    "/it/insights/"
    "/it/case-studies/"
    "/it/contact/"
    "/it/services/"
    "/it/about/"
)

for page in "${pages[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$page")
    if [ "$status" = "200" ]; then
        echo "✅ $page → $status"
    elif [ "$status" = "301" ] || [ "$status" = "302" ]; then
        echo "🔄 $page → $status (redirect)"
    else
        echo "❌ $page → $status"
    fi
done

echo ""
echo "🌐 Apri il browser su: $BASE_URL"
