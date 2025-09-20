#!/bin/bash

# Script per generare frontmatter per articoli insights
# Uso: ./generate-frontmatter.sh <nome-file-articolo>

if [ $# -eq 0 ]; then
    echo "Uso: $0 <nome-file-articolo>"
    echo "Esempio: $0 comprendere-il.processo-adozione-intelligenza-artificiale"
    exit 1
fi

ARTICLE_NAME="$1"
CURRENT_DATE=$(date +%Y-%m-%d)

# Rimuovi estensione se presente
ARTICLE_SLUG=$(echo "$ARTICLE_NAME" | sed 's/\.mdx$//')

# Genera il frontmatter
cat << FRONTMATTER
---
title: "Comprendere il processo adozione intelligenza artificiale"
slug: ${ARTICLE_SLUG}
lang: it
status: publish
excerpt: "Scopri come le aziende integrano l'IA nei processi aziendali: dalla valutazione strategica all'implementazione, vantaggi competitivi e gestione delle sfide etiche per una trasformazione digitale efficace."
date: ${CURRENT_DATE}
categories: ["Intelligenza Artificiale", "Trasformazione Digitale", "Strategia Aziendale"]
tags: ["adozione IA", "processo aziendale", "trasformazione digitale", "strategia tecnologica", "innovazione"]
---
FRONTMATTER

echo ""
echo "Frontmatter generato per l'articolo: $ARTICLE_SLUG"
echo "Data: $CURRENT_DATE"
echo ""
echo "Per creare versioni EN e SL:"
echo "- EN: slug: en-${ARTICLE_SLUG}, lang: en"
echo "- SL: slug: sl-${ARTICLE_SLUG}, lang: sl"
