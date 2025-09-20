#!/bin/bash

# Script per installare Netlify CLI su WSL con metodi alternativi

echo "🔧 Installazione Netlify CLI su WSL"
echo "==================================="

# Metodo 1: Yarn (spesso funziona meglio su WSL)
echo "📦 Tentativo 1: Installazione con Yarn"
if command -v yarn &> /dev/null; then
    echo "Yarn trovato, installazione in corso..."
    if yarn global add netlify-cli; then
        echo "✅ Netlify CLI installato con Yarn!"
        netlify --version
        exit 0
    else
        echo "❌ Installazione con Yarn fallita"
    fi
else
    echo "Yarn non trovato, installazione..."
    if npm install -g yarn; then
        echo "Yarn installato, retry..."
        if yarn global add netlify-cli; then
            echo "✅ Netlify CLI installato con Yarn!"
            netlify --version
            exit 0
        fi
    fi
fi

# Metodo 2: NPM con cache pulita
echo ""
echo "📦 Tentativo 2: NPM con cache pulita"
npm cache clean --force
npm config set registry https://registry.npmjs.org/
if npm install -g netlify-cli --verbose; then
    echo "✅ Netlify CLI installato con NPM!"
    netlify --version
    exit 0
else
    echo "❌ Installazione con NPM fallita"
fi

# Metodo 3: NPX locale
echo ""
echo "📦 Tentativo 3: Installazione locale con NPX"
if npm install netlify-cli --save-dev; then
    echo "✅ Netlify CLI installato localmente!"
    echo "Usa: npx netlify [comando]"
    npx netlify --version
    
    # Crea alias per comodità
    echo ""
    echo "💡 Aggiungi questo alias al tuo ~/.bashrc:"
    echo "alias netlify='npx netlify'"
    echo ""
    echo "Oppure usa direttamente: npx netlify [comando]"
    exit 0
else
    echo "❌ Installazione locale fallita"
fi

# Metodo 4: Download diretto binary
echo ""
echo "📦 Tentativo 4: Download binary diretto"
ARCH=$(uname -m)
OS="linux"

case $ARCH in
    x86_64) ARCH="x64" ;;
    aarch64) ARCH="arm64" ;;
    armv7l) ARCH="armv7" ;;
esac

DOWNLOAD_URL="https://github.com/netlify/cli/releases/latest/download/netlify-cli-${OS}-${ARCH}.tar.gz"

echo "Download da: $DOWNLOAD_URL"
if curl -L "$DOWNLOAD_URL" -o netlify-cli.tar.gz; then
    tar -xzf netlify-cli.tar.gz
    sudo mv netlify-cli/bin/netlify /usr/local/bin/
    rm -rf netlify-cli netlify-cli.tar.gz
    
    if command -v netlify &> /dev/null; then
        echo "✅ Netlify CLI installato tramite binary!"
        netlify --version
        exit 0
    else
        echo "❌ Binary installation fallita"
    fi
else
    echo "❌ Download binary fallito"
fi

# Metodo 5: Snap (se disponibile)
echo ""
echo "📦 Tentativo 5: Snap package"
if command -v snap &> /dev/null; then
    if sudo snap install netlify; then
        echo "✅ Netlify CLI installato con Snap!"
        netlify --version
        exit 0
    else
        echo "❌ Installazione Snap fallita"
    fi
else
    echo "Snap non disponibile"
fi

echo ""
echo "❌ Tutti i metodi di installazione sono falliti"
echo ""
echo "🔄 Alternative:"
echo "1. Usa deploy tramite Git (raccomandato): vedi deploy-git-netlify.md"
echo "2. Usa deploy manuale: ./deploy-manual-netlify.sh"
echo "3. Usa Windows PowerShell per installare Netlify CLI"
echo "4. Usa GitHub Actions per deploy automatico"
echo ""
echo "💡 La soluzione più semplice è il deploy tramite Git che non richiede CLI!"
