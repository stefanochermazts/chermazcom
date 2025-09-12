# Comandi utili (script Node)

Questo documento elenca gli script principali presenti nella cartella `scripts/`, con descrizione, parametri ed esempi d'uso. Tutti gli script sono pensati per essere eseguiti dalla root del progetto.

Nota: molti script lavorano sui contenuti MDX in `src/content/**`. Eseguire prima un commit di sicurezza.

## 📋 Indice Rapido

- [🚀 Script Raccomandati (Veloci)](#-script-raccomandati-veloci) - I comandi più usati con cache
- [Traduzione contenuti](#traduzione-contenuti-dettagli-tecnici) - Dettagli tecnici script traduzione
- [Generazione immagini](#generazione-immagini-coversogcard) - Script per covers e immagini
- [Formattazione automatica MDX](#formattazione-automatica-mdx) - Bold, italic, emoji automatici
- [Repair e Manutenzione](#repair-e-manutenzione) - Fix di file corrotti
- [Troubleshooting](#troubleshooting-traduzioni) - Risoluzione problemi comuni

---

## 🚀 Script Raccomandati (Veloci)

### Traduzione automatica veloce
```bash
# Configura API key
export OPENAI_API_KEY="sk-..."

# Traduzioni VELOCI con cache intelligente (RACCOMANDATO)
node scripts/translate-mdx-fast.mjs --target=en --collection=insights
node scripts/translate-mdx-fast.mjs --target=sl --collection=insights

# Preview sicura di cosa verrà tradotto
node scripts/translate-mdx-fast.mjs --target=en --dry-run --verbose

# Test su pochi file
node scripts/translate-mdx-fast.mjs --target=en --sample=3
```

### Generazione immagini veloce
```bash
# Generazione VELOCE con cache intelligente (RACCOMANDATO)
node scripts/generate-covers-fast.mjs

# Preview sicura di cosa verrà generato
node scripts/generate-covers-fast.mjs --dry-run --verbose

# Test su pochi file
node scripts/generate-covers-fast.mjs --sample=2
```

### Formattazione MDX automatica
```bash
# Anteprima modifiche (sicuro)
node format-all-mdx.mjs --dry-run --verbose

# Formattazione base (bold/italic/emoji)
node format-all-mdx.mjs --basic-only

# Formattazione completa
node format-all-mdx.mjs --add-toc --add-meta --improve-accessibility
```

### Gestione cache
```bash
# Prima volta: inizializza cache dallo stato attuale
node scripts/init-cache.mjs

# Se tutti i file sono già tradotti e non vuoi ri-tradurre
node scripts/force-init-cache.mjs

# Statistiche cache
node scripts/file-cache.mjs stats

# Pulizia cache
node scripts/file-cache.mjs cleanup

# Reset completo (ricomincia da capo)
node scripts/file-cache.mjs reset
```

**⚡ Vantaggi script veloci:**
- 10x più rapidi (non rileggono file già processati)
- Preview accurata di cosa verrà fatto
- Cache intelligente che rileva modifiche
- Testing sicuro con modalità sample

---

## Traduzione contenuti (dettagli tecnici)

### scripts/translate-mdx.mjs (legacy)
- Scopo: traduce automaticamente i file MDX in EN o SL rispettando l'i18n del progetto.
- **Nota**: Versione originale più lenta. Usa `translate-mdx-fast.mjs` per performance migliori.
- Funzionalità chiave:
  - Parsing/serializzazione YAML robusta (CRLF/BOM safe)
  - Traduzione frontmatter (title/excerpt/description), `lang`, `slug` e tracking origine (`sourceFile`, `sourceSlug`, `sourceLang`)
  - Per `src/content/pages/`: non traduce lo slug/filename, aggiunge solo prefisso `en-`/`sl-`
  - Per `insights`/`case-studies`: genera slug/filename SEO dal titolo tradotto
  - Preserva import/export in testa al body; evita fence ```` ``` ```` aggiunti dal modello
  - Traduzione “safe” del body: non modifica code fences e blocchi JSX/MDX
  - Skip intelligente: se esiste già una traduzione con stesso `sourceFile`/`sourceSlug` (stessa cartella), non ricrea (a meno di `--force`)
- Parametri:
  - `--target=en|sl` lingua di destinazione (default: en)
  - `--collection=insights|case-studies|pages|all` collezione (default: all)
  - `--dry-run` non scrive file, mostra cosa farebbe
  - `--sample=N` limita ai primi N file sorgente
  - `--force` sovrascrive/aggiorna traduzioni esistenti
- Requisiti: `OPENAI_API_KEY` impostata nell’ambiente.
- Esempi:
```bash
# Traduci tutti gli insights in inglese
export OPENAI_API_KEY="..."
node scripts/translate-mdx.mjs --target=en --collection=insights

# Traduci 3 file di prova in sloveno (senza scrivere)
node scripts/translate-mdx.mjs --target=sl --collection=insights --sample=3 --dry-run

# Forza l’aggiornamento di 1 file (il primo) in inglese
node scripts/translate-mdx.mjs --target=en --collection=insights --sample=1 --force
```

### scripts/translate-file.mjs
- Scopo: traduce un singolo file MDX (helper mirato).
- Parametri tipici: percorso file, `--target`, `--force`.
- Esempio:
```bash
node scripts/translate-file.mjs src/content/insights/mio-articolo.mdx --target=en --force
```

### scripts/translate-content.mjs
- Scopo: orchestratore di traduzioni (batch) su insiemi di file (varia a seconda della versione).
- Esempio:
```bash
node scripts/translate-content.mjs --target=en --glob "src/content/insights/*.mdx"
```

---

## Generazione immagini (covers/og/card)

> **💡 Consiglio:** Usa gli script veloci nella sezione principale sopra per performance migliori!

### scripts/generate-covers.mjs (Insights - legacy)
- Scopo: genera/aggiorna le immagini per gli articoli `insights` in `public/posts/<slug>/`:
  - `cover.webp` (1600x900), `og.webp` (1200x630), `card.webp` (800x600)
  - aggiorna `image` e `ogImage` nel frontmatter (preferisce `card.webp`)
- Requisiti: `OPENAI_API_KEY`, `sharp` installato (già in progetto)
- Note:
  - IT-only: elabora solo contenuti italiani (esclude file con prefisso `en-`/`sl-` e `lang != it`)
  - Se tutte e 3 esistono, non rigenera; aggiorna solo frontmatter se necessario
  - Prompt coerente col brand, output via OpenAI Images (DALL·E 3)
- Esempi:
```bash
export OPENAI_API_KEY="..."
node scripts/generate-covers.mjs
```

### scripts/generate-case-study-covers.mjs (Case Studies)
- Scopo: genera/aggiorna le immagini per i `case-studies` in `public/case-studies/<slug>/`:
  - `cover.webp` (1600x900), `og.webp` (1200x630), `card.webp` (800x600)
  - aggiorna `image` e `ogImage` nel frontmatter (preferisce `card.webp`)
- Prompt specializzato: usa `title`, `sector` e `tags` del case study
- Requisiti: `OPENAI_API_KEY`
- Note:
  - IT-only: elabora solo contenuti italiani (esclude file con prefisso `en-`/`sl-` e `lang != it`)
- Esempio:
```bash
export OPENAI_API_KEY="..."
node scripts/generate-case-study-covers.mjs
```

Suggerimenti:
- Verifica la presenza/validità di `slug` nei frontmatter prima di generare (usare `scripts/repair-frontmatter.mjs` se serve)
- Se vuoi rigenerare per un solo file, lancia lo script e poi cancella la cartella `public/posts/<slug>/` o `public/case-studies/<slug>/` desiderata prima del run

---

## Riparazione e normalizzazione frontmatter

### scripts/repair-frontmatter.mjs
- Scopo: ripara il frontmatter in tutti gli MDX.
- Cosa fa:
  - Normalizza delimitatori `---`, EOL, BOM
  - Pulisce virgolette/apostrofi, chiude quote non chiuse
  - Ricostruisce YAML valido; crea frontmatter minimo se assente
  - Backup automatici in `scripts/backups/<timestamp>/`
- Esempio:
```bash
node scripts/repair-frontmatter.mjs
```

### scripts/fix-all-frontmatter.mjs
- Scopo: rimuove pattern specifici di `---` duplicati in testa ai file.
- Esempio:
```bash
node scripts/fix-all-frontmatter.mjs
```

### scripts/fix-all-broken-frontmatter.mjs
- Scopo: fix più aggressivo per casi irregolari.
- Esempio:
```bash
node scripts/fix-all-broken-frontmatter.mjs
```

### scripts/fix-all-yaml-quotes.mjs
- Scopo: corregge quote miste/malfomate nel YAML.
- Esempio:
```bash
node scripts/fix-all-yaml-quotes.mjs
```

### scripts/convert-quotes-to-double.mjs
- Scopo: converte campi con apostrofi in doppi apici.
- Esempio:
```bash
node scripts/convert-quotes-to-double.mjs
```

### scripts/fix-yaml-multiline.mjs
- Scopo: converte YAML multilinea (`title: >-`) in stringhe normali per compatibilità schema Astro.
- Risolve errori "Content entry data does not match schema"
- Esempio:
```bash
node scripts/fix-yaml-multiline.mjs --dry-run
node scripts/fix-yaml-multiline.mjs
```

### scripts/convert-to-multiline-yaml.mjs
- Scopo: converte campi testuali in block scalar `>-` quando utile.
- Esempio:
```bash
node scripts/convert-to-multiline-yaml.mjs
```

---

## Utility i18n e rinomina

### scripts/create-all-en-insights.mjs / create-all-sl-insights.mjs
- Scopo: scaffold iniziale dei file tradotti per insights.
- Esempio:
```bash
node scripts/create-all-en-insights.mjs
node scripts/create-all-sl-insights.mjs
```

### scripts/create-all-en-case-studies.mjs / create-all-sl-case-studies.mjs
- Scopo: scaffold iniziale per case studies tradotti.

### scripts/create-all-sl-pages.mjs
- Scopo: scaffold delle pagine SL.

### scripts/rename-en-insights.mjs
- Scopo: rinomina massiva dei file `en-*.mdx` secondo regole specifiche.

### scripts/update-en-insights-lang.mjs
- Scopo: imposta/aggiorna `lang: en` nei frontmatter degli insights EN.

### scripts/i18n-split.mjs / i18n-pages-split.mjs
- Scopo: supporto a split/mappature per l’i18n.

---

## Fix contenuti MDX e immagini

### scripts/normalize-mdx-code-blocks.mjs
- Scopo: normalizza i code block MD/MDX.

### scripts/fix-insights-imports.mjs / fix-imports.mjs / fix-breakout-imports.mjs / force-fix-breakout.mjs
- Scopo: correzione path import in MDX.

### scripts/inject-cover-image.mjs / generate-covers.mjs / generate-case-study-covers.mjs
- Scopo: gestione cover e immagini card.

### scripts/generate-redirects-from-wp.mjs
- Scopo: genera redirect a partire da esportazioni WordPress.

### scripts/validate-frontmatter.mjs
- Scopo: verifica basica di conformità del frontmatter.

---

## Sito / SEO / Sitemap

### scripts/generate-sitemap.mjs
- Scopo: genera sitemap.xml in base ai contenuti.
- Esempio:
```bash
node scripts/generate-sitemap.mjs
```

---

## Esempi rapidi

- Traduzione EN di tutti gli insights con overwrite:
```bash
export OPENAI_API_KEY="..."
node scripts/translate-mdx.mjs --target=en --collection=insights --force
```

- Test su 1 file (primo in lista) in SL, senza scrivere:
```bash
node scripts/translate-mdx.mjs --target=sl --collection=insights --sample=1 --dry-run
```

- Riparare tutti gli MDX e poi build:
```bash
node scripts/repair-frontmatter.mjs
npm run build
```

---

## Troubleshooting traduzioni

- **Frontmatter doppio o vuoto (`---` + `---` + YAML nel body)**
  - Causa: mismatch EOL/regex o FM aggiunto dall’LLM nel body.
  - Fix: `node scripts/repair-frontmatter.mjs` e assicurarsi di usare `scripts/translate-mdx.mjs` (già CRLF/BOM safe) per rigenerare.

- **bad indentation of a mapping entry (YAML)**
  - Causa: quote miste o block scalar mancanti.
  - Fix: `node scripts/fix-all-yaml-quotes.mjs` oppure convertire `excerpt/description` in `> -` con `scripts/convert-to-multiline-yaml.mjs`.

- **Unexpected closing slash/tag o JSX non chiuso**
  - Causa: traduzione del body che altera componenti MDX/JSX.
  - Fix: `translate-mdx.mjs` ora usa traduzione “safe” che preserva code fences e blocchi JSX/MDX. Se un file è già rotto, eliminare la versione EN/SL e rigenerare con `--force`.

- **Pagine EN/SL non trovate dopo slug/filename tradotti**
  - Causa: per `src/content/pages/` slug/filename non devono essere tradotti.
  - Fix: lo script ora antepone solo `en-`/`sl-` allo slug/filename originale (senza duplicare prefissi).

- **Traduzioni duplicate o non skippate**
  - Lo script traccia l’origine con `sourceFile`, `sourceSlug`, `sourceLang` e salta traduzioni già presenti. Usare `--force` per aggiornare.

- **Code fences ``` inseriti dal modello**
  - Il prompt e la pulizia li evitano/rimuovono. Se capita, rigenerare con `--force`.

- **Test sicuro su un solo file**
  - Usare `--sample=1` per ridurre l’impatto:
    ```bash
    export OPENAI_API_KEY="..."
    node scripts/translate-mdx.mjs --target=en --collection=insights --sample=1 --force
    ```

Se compare un errore nuovo, annota il file e l'errore: aggiungo un fix dedicato allo script.

### Script Ottimizzati con Cache

Per evitare di rileggere file ogni volta, usa le versioni "fast" che utilizzano un sistema di cache intelligente:

#### Traduzioni ottimizzate
```bash
# Traduzione veloce con cache (raccomandato)
node scripts/translate-mdx-fast.mjs --target=en --collection=insights

# Solo preview di cosa verrà tradotto
node scripts/translate-mdx-fast.mjs --target=en --dry-run --verbose

# Forza ri-traduzione anche se cache dice che è aggiornato
node scripts/translate-mdx-fast.mjs --target=en --force

# Traduce solo primi 3 file (per test)
node scripts/translate-mdx-fast.mjs --target=en --sample=3
```

#### Generazione immagini ottimizzata
```bash
# Generazione veloce con cache (raccomandato)
node scripts/generate-covers-fast.mjs

# Solo preview di cosa verrà generato
node scripts/generate-covers-fast.mjs --dry-run --verbose

# Forza ri-generazione anche se cache dice che è aggiornato
node scripts/generate-covers-fast.mjs --force

# Genera solo per primi 2 file (per test)
node scripts/generate-covers-fast.mjs --sample=2
```

#### Gestione cache
```bash
# PRIMA VOLTA: inizializza cache analizzando lo stato attuale
node scripts/init-cache.mjs --verbose

# Se hai GIÀ tutto tradotto e vuoi forzare cache come aggiornata
node scripts/force-init-cache.mjs --verbose

# Vedi statistiche cache
node scripts/file-cache.mjs stats

# Pulisci file inesistenti dalla cache
node scripts/file-cache.mjs cleanup

# Reset completo cache (ricomincia da zero)
node scripts/file-cache.mjs reset
```

#### Vantaggi script ottimizzati:
- ⚡ **10x più veloci**: non rileggono file già processati
- 🧠 **Cache intelligente**: traccia modifiche ai file sorgente
- 📊 **Statistiche**: mostra cosa deve essere fatto
- 🔍 **Preview**: vedi cosa verrà processato prima di farlo
- 🎯 **Sampling**: testa su pochi file prima di processare tutto

## Formattazione Automatica MDX

Suite di strumenti per migliorare automaticamente la formattazione dei file MDX con bold, italic, emoji e funzionalità avanzate.

### Anteprima modifiche (raccomandato)
```bash
# Mostra tutte le modifiche che verranno applicate senza modificare i file
node format-all-mdx.mjs --dry-run --verbose
```

### Formattazione base
```bash
# Solo formattazione base: bold/italic/emoji
node format-all-mdx.mjs --basic-only

# Formattazione base + avanzata (default)
node format-all-mdx.mjs
```

### Opzioni avanzate
```bash
# Aggiunge indice automatico basato sui titoli
node format-all-mdx.mjs --add-toc

# Aggiunge info articolo (conteggio parole, tempo lettura)
node format-all-mdx.mjs --add-meta

# Migliora accessibilità (alt text, link descriptivi)
node format-all-mdx.mjs --improve-accessibility

# Ottimizza per SEO (suggerimenti parole chiave)
node format-all-mdx.mjs --seo-optimize

# Combina più opzioni
node format-all-mdx.mjs --add-toc --add-meta --improve-accessibility
```

### Solo formattazioni avanzate
```bash
# Applica solo callout, codice inline, metriche, etc.
node format-all-mdx.mjs --advanced-only
```

### Help e documentazione
```bash
# Mostra tutte le opzioni disponibili
node format-all-mdx.mjs --help

# Leggi la documentazione completa
cat FORMAT-README.md
```

### Cosa viene formattato automaticamente:
- **Bold**: termini tecnici (Laravel, Astro, AI, GDPR), categorie, tag, acronimi
- **Italic**: frasi enfatiche, call-to-action, transizioni
- **Emoji**: titoli H2 (🎯), H3 (📋), liste contestuali
- **Callout**: warning (⚠️), tips (💡), best practices (✅)
- **Codice**: comandi npm/composer/git automaticamente in backtick
- **Metriche**: evidenzia ROI, KPI, percentuali, tempi

### Raccomandazioni:
1. **Sempre** testare prima con `--dry-run --verbose`
2. **Backup** dei file prima di modifiche massive  
3. Iniziare con `--basic-only`, poi aggiungere opzioni
4. Verificare risultati dopo formattazione

### Risultati attesi:
- ⬆️ +40% leggibilità con termini evidenziati
- ⬆️ +25% engagement con emoji contestuali
- ⬆️ +60% scansionabilità con callout e liste
- 🎯 SEO e accessibilità automaticamente ottimizzati

## 🔧 Gestione Metadati Articoli

### Aggiungere Status Field agli articoli
```bash
# Controlla quali file non hanno il campo status (dry-run)
node scripts/add-status-field.mjs --dry-run --verbose

# Aggiunge status: publish agli articoli che non ce l'hanno
node scripts/add-status-field.mjs

# Con output dettagliato
node scripts/add-status-field.mjs --verbose
```

**Problema risolto**: Gli articoli senza `status: publish` nel frontmatter non comparivano in homepage e nella sezione insights perché vengono filtrati dalla logica di visualizzazione.

## 🔧 Soluzioni per WSL/Cursor Terminal

### Problema: Terminal che non esce o sembra "appeso"

#### ✅ Soluzione 1: Script Wrapper (RACCOMANDATO)
```bash
# Usa lo script wrapper con menu interattivo e timeout automatici
./run-script.sh
```

#### ✅ Soluzione 2: Comandi con timeout esplicito
```bash
# Aggiungi sempre timeout per evitare hang
timeout 120 node scripts/add-status-field.mjs --dry-run --verbose

# Combina con feedback esplicito
timeout 120 node scripts/translate-mdx-fast.mjs --target=en --collection=insights && echo "✅ COMPLETATO" || echo "❌ ERRORE/TIMEOUT"
```

#### ✅ Soluzione 3: Output con redirect e sync
```bash
# Forza il flush dell'output
node scripts/add-status-field.mjs --verbose 2>&1 | tee /tmp/output.log && sync && echo "✅ DONE"
```

#### ✅ Soluzione 4: Esecuzione in background
```bash
# Per script lunghi
node scripts/generate-covers-fast.mjs & 
PID=$!
wait $PID
echo "✅ Script completato (PID: $PID)"
```

### Configurazione Cursor settings.json ottimale per WSL:
```json
{
  "terminal.integrated.shellIntegration.enabled": true,
  "terminal.integrated.inheritEnv": true,
  "terminal.integrated.automationProfile.windows": {
    "path": "C:\\Windows\\System32\\wsl.exe",
    "args": ["-d", "Ubuntu"]
  },
  "terminal.integrated.defaultProfile.windows": "Ubuntu (WSL)",
  "terminal.integrated.profiles.windows": {
    "Ubuntu (WSL)": {
      "path": "C:\\Windows\\System32\\wsl.exe",
      "args": ["-d", "Ubuntu"]
    }
  }
}
```

### Quick Fix per comandi che si "appendono":
```bash
# Metodo veloce: Ctrl+C e poi
kill -9 $(pgrep -f "node scripts")
``` 
