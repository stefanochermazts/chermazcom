#!/bin/bash
# Script wrapper per migliorare l'integrazione con Cursor/WSL

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per eseguire comandi con timeout e feedback
run_with_feedback() {
    local cmd="$1"
    local timeout_sec="${2:-120}"
    local desc="${3:-Comando}"
    
    echo -e "${BLUE}🚀 Esecuzione: ${desc}${NC}"
    echo -e "${YELLOW}Comando: ${cmd}${NC}"
    echo "---"
    
    # Esegui con timeout
    if timeout "${timeout_sec}" bash -c "$cmd"; then
        local exit_code=$?
        if [ $exit_code -eq 0 ]; then
            echo "---"
            echo -e "${GREEN}✅ ${desc} completato con successo${NC}"
        else
            echo "---"
            echo -e "${RED}❌ ${desc} terminato con errore (exit code: $exit_code)${NC}"
        fi
    else
        echo "---"
        echo -e "${RED}⏰ ${desc} interrotto per timeout (${timeout_sec}s)${NC}"
    fi
    
    # Forza flush dell'output
    sync
    sleep 0.5
}

# Menu interattivo
show_menu() {
    echo -e "${BLUE}=== SCRIPT CHERMAZCOM ===${NC}"
    echo "1) 🔍 Controlla articoli senza status (dry-run)"
    echo "2) ✅ Aggiungi status: publish agli articoli"
    echo "3) 🌍 Traduci articoli (EN)"
    echo "4) 🖼️  Genera immagini covers"
    echo "5) 📊 Statistiche cache"
    echo "6) 🧹 Inizializza cache"
    echo "7) 💻 Comando personalizzato"
    echo "8) 🚪 Esci"
    echo ""
    read -p "Scegli un'opzione (1-8): " choice
}

# Script principale
main() {
    while true; do
        show_menu
        
        case $choice in
            1)
                run_with_feedback "node scripts/add-status-field.mjs --dry-run --verbose" 60 "Controllo status articoli"
                ;;
            2)
                run_with_feedback "node scripts/add-status-field.mjs --verbose" 60 "Aggiunta status agli articoli"
                ;;
            3)
                run_with_feedback "node scripts/translate-mdx-fast.mjs --target=en --collection=insights" 300 "Traduzione articoli"
                ;;
            4)
                run_with_feedback "node scripts/generate-covers-fast.mjs" 300 "Generazione immagini"
                ;;
            5)
                run_with_feedback "node scripts/file-cache.mjs stats" 30 "Statistiche cache"
                ;;
            6)
                run_with_feedback "node scripts/init-cache.mjs" 60 "Inizializzazione cache"
                ;;
            7)
                echo -n "Inserisci comando: "
                read custom_cmd
                if [ -n "$custom_cmd" ]; then
                    run_with_feedback "$custom_cmd" 300 "Comando personalizzato"
                fi
                ;;
            8)
                echo -e "${GREEN}👋 Arrivederci!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Opzione non valida${NC}"
                ;;
        esac
        
        echo ""
        read -p "Premi INVIO per continuare..."
        clear
    done
}

# Rendi eseguibile e avvia
chmod +x "$0" 2>/dev/null
main
