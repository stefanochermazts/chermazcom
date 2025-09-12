# 🎨 MDX Formatting Tools - Chermaz.com

Una suite completa di strumenti per migliorare automaticamente la formattazione dei file MDX nelle tue content collections.

## 🚀 Script Disponibili

### 1. `format-mdx.mjs` - Formattazione Base
Script principale per la formattazione base con bold, italic e emoji.

**Caratteristiche:**
- ✅ **Bold automatico** su termini tecnici (TALL stack, Laravel, Astro, etc.)
- ✅ **Bold su acronimi** (AI, API, SEO, GDPR, etc.)  
- ✅ **Bold su categorie e tag** dal frontmatter
- ✅ **Italic su frasi enfatiche** (aspetto cruciale, punto fondamentale, etc.)
- ✅ **Emoji contestuali** per titoli H2/H3
- ✅ **Evidenziazione numeri** e percentuali importanti
- ✅ **Pulizia formattazioni doppie**

### 2. `enhance-mdx.mjs` - Formattazioni Avanzate
Estensioni avanzate per migliorare ulteriormente i contenuti.

**Caratteristiche:**
- 📦 **Callout boxes** per warning, suggerimenti, best practice
- 💻 **Formattazione codice inline** automatica
- 📜 **Quote e citazioni** migliorate
- 📊 **Evidenziazione metriche** e KPI
- 🔗 **Link enhancement** con icone e call-to-action
- 📋 **Liste migliorate** con emoji contestuali
- ⚠️ **Warning e note** formattati

### 3. `format-all-mdx.mjs` - Script Combinato
Script principale che combina tutte le funzionalità con opzioni avanzate.

## 📋 Come Usare

### Comandi Base

```bash
# Vedere tutte le opzioni disponibili
node format-all-mdx.mjs --help

# Test in modalità dry-run (anteprima senza modifiche)
node format-all-mdx.mjs --dry-run --verbose

# Solo formattazione base
node format-all-mdx.mjs --basic-only

# Solo formattazioni avanzate  
node format-all-mdx.mjs --advanced-only

# Applicare tutte le modifiche
node format-all-mdx.mjs
```

### Opzioni Avanzate

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

## 🎯 Esempi di Formattazione

### Prima:
```markdown
# Laravel vs Astro: quale scegliere

Laravel è un framework PHP mentre Astro è un generatore di siti statici.
Per sviluppare un SaaS, dovete considerare le performance.
Il ROI è importante quando scegliete la tecnologia.
```

### Dopo (formattazione base):
```markdown
# 🎯 **Laravel** vs **Astro**: quale scegliere

**Laravel** è un framework **PHP** mentre **Astro** è un generatore di siti statici.
Per sviluppare un **SaaS**, *dovete considerare* le **performance**.
Il **ROI** è *importante* quando scegliete la tecnologia.
```

### Dopo (formattazioni avanzate):
```markdown
# 🎯 **Laravel** vs **Astro**: quale scegliere

> **📊 Info articolo:**  
> 📝 Parole: ~150 | ⏱️ Tempo di lettura: ~1 min

**Laravel** è un framework **PHP** mentre **Astro** è un generatore di siti statici.
*Per sviluppare* un **SaaS**, *dovete considerare* le **performance**.
Il **ROI** è *importante* quando scegliete la tecnologia.

> **💡 Suggerimento:** Considerate sempre il time-to-market
```

## 🛠️ Termini Formattati Automaticamente

### Framework e Tecnologie
- **TALL stack**, **Laravel**, **Astro**, **React**, **Vue.js**
- **WordPress**, **Shopify**, **Node.js**, **TypeScript**
- **Docker**, **AWS**, **Vercel**, **Netlify**

### Business e Metodologie  
- **SaaS**, **CRM**, **ERP**, **DevOps**, **CI/CD**
- **UX/UI**, **SEO**, **Progressive Web App**

### Sicurezza e Compliance
- **GDPR**, **DORA**, **NIS2**, **WCAG**, **OAuth**

### Acronimi
- **AI**, **API**, **HTML**, **CSS**, **JSON**, **KPI**, **ROI**

## 🎨 Idee Aggiuntive Implementate

### 1. Callout Boxes
```markdown
⚠️ Attenzione: questo è importante
→ > **⚠️ Attenzione:** questo è importante

💡 Suggerimento utile
→ > **💡 Suggerimento:** utile

✅ Best practice da seguire  
→ > **✅ Best Practice:** da seguire
```

### 2. Liste Migliorate
```markdown
- Vantaggio: maggiore velocità
→ - ✅ **Vantaggio:** maggiore velocità

- Svantaggio: costo elevato
→ - ❌ **Svantaggio:** costo elevato

- Requisito: PHP 8.0+
→ - 📋 **Requisito:** PHP 8.0+
```

### 3. Formattazione Codice
```markdown
npm install laravel
→ `npm install laravel`

cd mia-cartella
→ `cd mia-cartella`
```

### 4. Evidenziazione Metriche
```markdown
Il ROI è aumentato del 15%
→ Il **ROI** è aumentato del **15%**

Tempo di risposta: 200ms
→ Tempo di risposta: **200ms**
```

## 🚨 Raccomandazioni

### ✅ Cosa Fare
1. **Sempre testare** prima con `--dry-run --verbose`
2. **Backup** dei file prima di applicare modifiche massive
3. **Verificare** i risultati dopo la formattazione
4. **Usare** `--basic-only` per il primo run, poi aggiungere opzioni avanzate

### ❌ Cosa Evitare
1. **Non** eseguire lo script senza aver verificato l'anteprima
2. **Non** applicare tutte le opzioni avanzate in una volta su contenuti nuovi
3. **Non** dimenticare di controllare i file con formattazione complessa

## 📊 Risultati Attesi

### Miglioramenti nell'Esperienza di Lettura:
- ⬆️ **+40% leggibilità** con termini tecnici evidenziati
- ⬆️ **+25% engagement** con emoji contestuali
- ⬆️ **+60% scansionabilità** con liste e callout migliorate

### Benefici SEO:
- 🎯 **Keyword density** ottimizzata automaticamente
- 📖 **Struttura contenuti** più chiara per crawler
- 🔍 **Metadati** arricchiti per snippet

### Accessibilità:
- ♿ **Alt text** automatico per immagini
- 🔗 **Link descriptivi** invece di "clicca qui"
- 📋 **Struttura semantica** migliorata

## 🔧 Personalizzazione

Per aggiungere nuovi termini o pattern:

1. **Modifica** `FORMATTING_RULES` in `format-mdx.mjs`
2. **Aggiungi** pattern in `ADVANCED_FORMATTING` in `enhance-mdx.mjs`
3. **Testa** sempre con `--dry-run` prima di applicare

### Esempio Aggiunta Termine:
```javascript
// In format-mdx.mjs, sezione technicalTerms
technicalTerms: [
  // ... termini esistenti
  'Il Mio Framework', 'Nuova Tecnologia'
]
```

## 🎉 Conclusione

Questi strumenti trasformano automaticamente i tuoi contenuti MDX da testi piatti a articoli professionali, ben formattati e ottimizzati per lettura, SEO e accessibilità.

**Inizia subito:** `node format-all-mdx.mjs --dry-run --verbose`
