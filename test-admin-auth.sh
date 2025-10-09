#!/bin/bash

# Test script per verificare che l'autenticazione admin funzioni

echo "🧪 Test Admin Authentication"
echo "=============================="
echo ""

# Colori
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verifica che .env.local esista
echo "1️⃣  Controllo file .env.local..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ File .env.local trovato${NC}"
    if grep -q "ADMIN_PASSWORD" .env.local; then
        echo -e "${GREEN}✅ ADMIN_PASSWORD presente${NC}"
    else
        echo -e "${RED}❌ ADMIN_PASSWORD non trovata in .env.local${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ File .env.local non trovato${NC}"
    echo -e "${YELLOW}Crea il file .env.local con:${NC}"
    echo "ADMIN_PASSWORD=tua-password"
    exit 1
fi

echo ""

# 2. Verifica che Netlify Dev sia attivo
echo "2️⃣  Controllo Netlify Functions..."
if curl -s http://localhost:8888/.netlify/functions/admin-auth > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Netlify Functions attive su porta 8888${NC}"
else
    echo -e "${RED}❌ Netlify Functions non rispondono${NC}"
    echo -e "${YELLOW}Avvia con: npm run dev:netlify${NC}"
    exit 1
fi

echo ""

# 3. Test autenticazione con password di esempio
echo "3️⃣  Test autenticazione..."
echo -e "${YELLOW}Inserisci la password (o premi Invio per usare quella in .env.local):${NC}"
read -s PASSWORD

if [ -z "$PASSWORD" ]; then
    PASSWORD=$(grep ADMIN_PASSWORD .env.local | cut -d '=' -f2)
fi

RESPONSE=$(curl -s -X POST http://localhost:8888/.netlify/functions/admin-auth \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$PASSWORD\"}")

echo "Risposta API:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo -e "${GREEN}✅ AUTENTICAZIONE RIUSCITA!${NC}"
    echo ""
    echo "🎉 Tutto funziona correttamente!"
    echo "Vai su: http://localhost:4321/admin"
else
    echo ""
    echo -e "${RED}❌ AUTENTICAZIONE FALLITA${NC}"
    echo ""
    echo "Possibili cause:"
    echo "- Password errata"
    echo "- ADMIN_PASSWORD non configurata correttamente in .env.local"
    echo "- Variabili d'ambiente non caricate da Netlify Dev"
fi


