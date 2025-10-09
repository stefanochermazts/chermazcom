# 🚀 Admin CMS - Quick Start

Guida di 5 minuti per iniziare a usare il CMS Admin.

## 1️⃣ Setup Iniziale (una volta)

### Crea file `.env` nella root del progetto:

```bash
# Password per accedere all'admin (cambiarla!)
ADMIN_PASSWORD=tua-password-sicura

# OpenAI API Key (necessaria per traduzione e immagini)
OPENAI_API_KEY=sk-your-api-key-here
```

**Dove trovare la OpenAI API Key?**
- Vai su https://platform.openai.com/api-keys
- Crea un nuovo API key
- Copia e incolla nel file `.env`

---

## 2️⃣ Avvia il CMS

```bash
npm run dev:netlify
```

Aspetta che si avvii (circa 10-15 secondi) e vedrai:

```
◈ Netlify Dev ◈
◈ Server now ready on http://localhost:8888
```

---

## 3️⃣ Accedi all'Admin

Apri il browser su:
```
http://localhost:4321/admin
```

Inserisci la password che hai configurato in `.env`

---

## 4️⃣ Crea il Tuo Primo Articolo

### Form da compilare:

1. **Tipo Contenuto**: Scegli "Insight (Blog)"
2. **Titolo**: Es. "La mia guida completa su TypeScript"
3. **Slug**: Si genera automaticamente → `la-mia-guida-completa-su-typescript`
4. **Excerpt**: Breve descrizione per SEO (2-3 righe)
5. **Categorie**: Es. `Development, Tutorial`
6. **Tags**: Es. `typescript, javascript, tutorial`
7. **Contenuto**: Scrivi in Markdown

**Esempio contenuto:**
```markdown
## Introduzione

TypeScript è un linguaggio potente che estende JavaScript con tipi statici.

### Perché usare TypeScript?

- **Type Safety**: Errori rilevati in fase di compilazione
- **IntelliSense**: Autocompletamento migliore nell'IDE
- **Refactoring**: Più sicuro e veloce

## Conclusione

TypeScript migliora significativamente la qualità del codice.
```

### Click "Salva Articolo (IT)"

✅ **File creato:** `src/content/insights/la-mia-guida-completa-su-typescript.mdx`

---

## 5️⃣ (Opzionale) Genera Immagine Cover

Click su **"Genera Immagine (DALL-E)"**

⏱️ Attendi 10-30 secondi...

✅ **Immagine creata:** `/public/images/covers/la-mia-guida-completa-su-typescript-cover.jpg`

---

## 6️⃣ (Opzionale) Traduci

### Traduci in Inglese:
Click **"Traduci EN"** → Crea `en-la-mia-guida-completa-su-typescript.mdx`

### Traduci in Sloveno:
Click **"Traduci SL"** → Crea `sl-la-mia-guida-completa-su-typescript.mdx`

⏱️ Ogni traduzione richiede 30-60 secondi

---

## 7️⃣ Verifica il Risultato

### Apri nel browser:

**Italiano:**
```
http://localhost:4321/it/insights/la-mia-guida-completa-su-typescript
```

**Inglese:**
```
http://localhost:4321/en/insights/la-mia-guida-completa-su-typescript
```

**Sloveno:**
```
http://localhost:4321/sl/insights/la-mia-guida-completa-su-typescript
```

---

## 8️⃣ Pubblica su Git

```bash
# Aggiungi i nuovi file
git add src/content/insights/
git add public/images/covers/

# Commit
git commit -m "Add: nuovo articolo su TypeScript"

# Push
git push origin main
```

Netlify rileverà automaticamente il push e farà il rebuild (~2-5 minuti).

---

## 🎯 Comandi Utili

```bash
# Avvia CMS admin
npm run dev:netlify

# Solo Astro dev (senza functions)
npm run dev

# Verifica file creati
ls -la src/content/insights/

# Verifica immagini generate
ls -la public/images/covers/
```

---

## ❓ Problemi Comuni

### "OpenAI API key non configurata"
**Soluzione:** Verifica che il file `.env` contenga `OPENAI_API_KEY=sk-...`

### "Password errata"
**Soluzione:** Verifica `ADMIN_PASSWORD` nel file `.env`

### "File già esistente"
**Soluzione:** Cambia lo slug o elimina il file esistente

### Preview non funziona
**Soluzione:** Ricarica la pagina dopo aver salvato

### Functions non partono
**Soluzione:** 
1. Verifica di aver usato `npm run dev:netlify` (non `npm run dev`)
2. Aspetta 15-20 secondi per l'avvio completo

---

## 📚 Documentazione Completa

Per dettagli su:
- API endpoints
- Troubleshooting avanzato
- Personalizzazioni
- Costi OpenAI

Leggi: **[ADMIN-CMS-README.md](./ADMIN-CMS-README.md)**

---

## 💡 Tips

- **Salva spesso**: Il CMS non ha auto-save
- **Preview prima**: Controlla sempre il preview prima di salvare
- **Slug univoci**: Usa slug diversi per ogni articolo
- **Backup**: Fai commit regolari su git
- **Test locale**: Verifica sempre localmente prima di pushare

---

**Buona scrittura! ✍️**



