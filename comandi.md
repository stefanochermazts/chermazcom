# Comandi utili (script Node)

Questo documento elenca gli script principali presenti nella cartella `scripts/`, con descrizione, parametri ed esempi d'uso. Tutti gli script sono pensati per essere eseguiti dalla root del progetto.

Nota: molti script lavorano sui contenuti MDX in `src/content/**`. Eseguire prima un commit di sicurezza.

---

## Traduzione contenuti

### scripts/translate-mdx.mjs
- Scopo: traduce automaticamente i file MDX in EN o SL rispettando l'i18n del progetto.
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

### scripts/generate-covers.mjs (Insights)
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

Se compare un errore nuovo, annota il file e l’errore: aggiungo un fix dedicato allo script. 
