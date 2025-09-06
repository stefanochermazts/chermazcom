# TODO — Migrazione chermaz.com → Astro + Netlify

> Checklist operativa derivata da `analisi.funzionale.md` (stile GitHub)

## 0) Prerequisiti (dev)
- [ ] Node.js LTS (≥ 20) installato
- [ ] Git configurato (utente, email, SSH/HTTPS)
- [ ] Editor: Cursor operativo
- [ ] Account Netlify disponibile

## 1) Export contenuti da WordPress
- [ ] Scegli metodo di export: REST API (consigliato) oppure WXR
- [ ] Se REST API: verifica endpoint
  - [ ] Posts: `https://chermaz.com/wp-json/wp/v2/posts?per_page=100&page=1`
  - [ ] Pages: `https://chermaz.com/wp-json/wp/v2/pages?per_page=100&page=1`
  - [ ] Media: `https://chermaz.com/wp-json/wp/v2/media?per_page=100&page=1`
- [ ] Se WXR: scarica XML (Tools → Export) e tienilo pronto per conversione (step 2)
- [ ] Mappa URL categorie/tag utili per le nuove tassonomie

## 2) Normalizzazione contenuti (Markdown)
- [ ] Crea `scripts/wp-export-to-md.mjs` (conversione HTML → MD con front‑matter)
- [ ] Aggiungi dipendenze: `jsdom`, `node-fetch`
- [ ] Aggiorna `package.json` con:
  - [ ] `"type": "module"`
  - [ ] script `"wp:export": "node scripts/wp-export-to-md.mjs"`
- [ ] Esegui export: `npm run wp:export`
- [ ] Verifica struttura output
  - [ ] `/content/insights/*.md`
  - [ ] `/content/pages/*.md`
  - [ ] `/content/case-studies/*.md`
  - [ ] `/public/images/wp/*`

## 3) Setup progetto Astro + Tailwind
- [ ] Inizializza progetto:
  - [ ] `npm create astro@latest chermaz.com -- --template basics --typescript strict --git false`
  - [ ] `cd chermaz.com`
- [ ] Installa Tailwind e plugin: `npm i -D tailwindcss postcss autoprefixer @tailwindcss/typography`
- [ ] Inizializza config: `npx tailwindcss init -p`
- [ ] Configura `tailwind.config.cjs` (content + plugin typography)
- [ ] Aggiungi `src/styles/globals.css` con regole base e focus outline coerente
- [ ] Imposta `astro.config.mjs` con `site: 'https://www.chermaz.com'`

## 3‑alt) Setup con Accessible Astro Starter (preferito)
- [x] Riferimento starter: [Accessible Astro Starter](https://astro.build/themes/details/accessible-astro-starter/)
- [x] Clona o fork dello starter “Accessible Astro Starter” in `chermaz.com`
- [ ] Getting started
  - [ ] `npm install` (installa dipendenze)
  - [ ] `npm run dev` (sviluppo locale)
  - [ ] `npm run build` (build produzione in `./dist`)
  - [ ] `npm run preview` (anteprima build)
- [ ] Aggiorna `package.json` (name, description, author)
- [ ] Installa dipendenze: `npm i` e avvia: `npm run dev`
- [ ] Verifica e integra Tailwind
  - [ ] Se non presente: `npm i -D tailwindcss postcss autoprefixer @tailwindcss/typography`
  - [ ] `npx tailwindcss init -p` e configura `content`
  - [ ] Importa `src/styles/globals.css` con focus ring coerente
- [ ] Aggiorna `astro.config.mjs` (proprietà `site` e integrazioni)
- [ ] Aggiungi/abilita integrazioni consigliate
  - [ ] `@astrojs/image`, `astro-compress`, `astro-icon`
  - [ ] Font locali via `@fontsource-*` (no CDN)
- [ ] Branding
  - [x] Palette brand: brand‑600 `#164cd6`, brand‑500 `#1f63ff`, neutral‑900/700/500
  - [ ] Token Tailwind (colors, ringColor) e focus ring uniforme
  - [x] Font pairing: titoli Sora/Inter, testo Inter/Source Sans 3 (font locali)
  - [x] Sostituisci eventuale Atkinson Hyperlegible di default con Sora/Inter locali
- [ ] Ripulisci contenuti demo e sezioni non necessarie dello starter
- [ ] Controlli di accessibilità dello starter
  - [ ] Skip‑link, ordine focus, ruoli ARIA
  - [ ] Menu button conforme APG per selettore lingua
  - [ ] Rispetto `prefers-reduced-motion`

## 3‑bis) Grafica & Design system
- [ ] Decidi approccio UI iniziale
  - [ ] A) Minimal Tailwind‑first (veloce e pulito)
  - [ ] B) Islands con componenti React selettivi (per dialog/tabs mirati)
  - [ ] C) Starter Astro curato da ribrandizzare (time‑to‑value)
- [ ] Installa pacchetti UI/immagini/icone/font
  - [ ] `npm i @astrojs/image astro-compress astro-icon`
  - [ ] `npm i @fontsource-inter @fontsource-sora`
  - [ ] (Opzionale) micro‑motion e smooth scroll: `npm i motion lenis`
- [ ] Configura integrazioni in `astro.config.mjs`
  - [ ] Abilita `@astrojs/image` e `astro-compress`
- [ ] Font locali (niente CDN esterni)
  - [ ] Seleziona sans‑serif locale coerente (es. Sora/Inter via @fontsource, oppure system stack)
  - [ ] Importa font in CSS e definisci fallback
- [ ] Palette e token
  - [ ] Definisci colori brand: brand‑600 `#164cd6`, brand‑500 `#1f63ff`, neutral‑900/700/500
  - [ ] Aggiorna `tailwind.config.cjs` con palette e `ringColor` brand
  - [ ] Mantieni focus ring uniforme su tutti gli elementi focusable
- [ ] Layout & spaziatura
  - [ ] Contenitore a `max-w-6xl`, grid 12 colonne
  - [ ] Cards con `rounded-2xl` e `shadow-sm`
- [ ] Componenti chiave
  - [ ] Hero (claim + sub + 2 CTA + trust row)
  - [ ] Sezione Servizi/Pillars in card con mini‑icona e micro‑copy
  - [ ] Case Studies con badge KPI
  - [ ] Testimonial brevi (ruolo/settore)
  - [ ] CTA finale sticky o sezione a contrasto
  - [ ] Contact pulita con privacy micro‑copy
- [ ] Icone
  - [ ] Usa `astro-icon` (Iconify), definisci set coerente
- [ ] Immagini & media
  - [ ] Usa `<Image />` di Astro con srcset, WebP/AVIF
  - [ ] Illustrazioni/foto coerenti con brand
  - [ ] Favicon set completo (16/32/180/512) + OG 1200×630
- [ ] Interazioni
  - [ ] Micro‑animazioni con Motion One per CTA/hero (rispetta `prefers-reduced-motion`)
  - [ ] (Opzionale) Lenis per smooth scrolling (rispetta `prefers-reduced-motion`)
  - [ ] (Se B) React islands per Dialog e Tabs accessibili
 - [x] Outline focus coerente brand (`#1f63ff`) con offset 2px

## 4) Layout, pagine core e routing
- [ ] Crea `src/layouts/Base.astro` (metadati, JSON‑LD, Header/Footer)
- [ ] Pagine principali: `/`, `/about`, `/services/*`, `/case-studies/*`, `/insights`, `/contact`, `/privacy`
- [ ] Content Collections per `insights` e `case-studies` (schema + slug)
- [ ] Listing `src/pages/insights/index.astro` con ordinamento per data desc
 - [ ] Aggiungi selettore lingua come menu button conforme APG (keyboard + ARIA)

## 4‑bis) Internazionalizzazione (IT / EN / SL)
- [ ] Definisci lingue del sito: italiano (predefinita), inglese, sloveno
- [ ] Struttura URL con prefissi di lingua: `/it/*`, `/en/*`, `/sl/*`
- [ ] Routing i18n in Astro
  - [ ] Configura mapping rotte per lingua e redirect da `/` → `/it/`
  - [ ] Gestisci slugs localizzati per pagine e contenuti
- [ ] Traduzioni UI
  - [ ] File di traduzione (es. `src/i18n/{it,en,sl}.ts` o `.json`)
  - [x] Creati `src/i18n/it.json`, `src/i18n/en.json`, `src/i18n/sl.json`
  - [ ] Componenti che leggono le stringhe in base alla lingua corrente
- [ ] Contenuti
  - [ ] Strategy A: directory per lingua (es. `content/insights/it|en|sl`)
  - [ ] Strategy B: front‑matter `lang` e filtraggio per lingua
- [ ] SEO multilingua
  - [x] `<link rel="alternate" hreflang="it|en|sl|x-default">` per ogni pagina
  - [x] Canonical per lingua
  - [ ] Titolo/description localizzati
  - [ ] Sitemap con voci per ogni lingua
- [ ] Language Switcher
  - [x] Menu button conforme APG, navigabile da tastiera
  - [x] Persistenza scelta lingua (localStorage + redirect)
- [ ] Redirect/Detect (opzionale)
  - [x] Redirect iniziale da `/` → `/it/`
  - [ ] (Opzionale) Redirect basato su preferenza browser, con fallback su IT

## 5) Migrazione contenuti
- [ ] Copia i `.md` nelle collection corrette
- [ ] Rivedi front‑matter (title, date, excerpt)
- [ ] Correggi URL interni e riferimenti a media
- [ ] Carica media ottimizzati in `/public/images/wp`

## 6) SEO e redirect
- [x] Aggiungi `netlify.toml` (build/dev)
- [ ] Crea `_redirects` con mapping da WordPress alle nuove sezioni
- [x] Crea `_headers` con security headers e caching adeguato
- [ ] Genera `sitemap.xml` (automatica o file) e `robots.txt` con `Sitemap: https://www.chermaz.com/sitemap.xml`
- [ ] Imposta meta per pagina (title, description, OG) e JSON‑LD (Person/Organization/Service)

## 7) Form contatti (Netlify Forms)
- [ ] Implementa `contact.astro` con `data-netlify="true"` e honeypot
- [ ] Aggiungi pagina di successo: `/contact/success`

## 8) Performance & accessibilità AA
- [ ] Immagini responsive (`srcset`) e lazy‑loading, dimensioni esplicite
- [ ] Contrasto sufficiente, focus visibile uniforme, `aria-label` sui link icona
- [ ] Struttura semantica: heading gerarchici, `main` con `id="contenuto"`
- [ ] Lighthouse ≥ 95 su Performance / SEO / Best Practices / Accessibilità
 - [ ] Rispetta `prefers-reduced-motion` per animazioni e smooth scroll
 - [ ] Focus ring brand (`#1f63ff`) con `outline-offset: 2px` uniforme

## 9) CI/CD Netlify + DNS
- [ ] Installa Netlify CLI e `netlify login`
- [ ] `netlify init` (associa repo e sito)
- [ ] Deploy preview: `netlify deploy --build`
- [ ] Deploy prod: `netlify deploy --prod`
- [ ] Punta DNS (CNAME) a `your-site.netlify.app`
- [ ] Verifica HTTPS automatico (Let’s Encrypt)

## 10) Post‑launch checklist
- [ ] Verifica redirect (campione di 20 URL storici)
- [ ] Search Console: nuova proprietà + invio sitemap
- [ ] Analytics (GA4/Matomo) con consenso; cookie banner se necessario
- [ ] Monitor Core Web Vitals
- [ ] Broken links scan

## Deliverable operativi
- [x] Repo Astro con layout base (`Base.astro`, Header/Footer, Hero)
- [ ] Script `scripts/wp-export-to-md.mjs` funzionante
- [x] File di piattaforma: `netlify.toml`, `_redirects`, `_headers`, `robots.txt`, `sitemap.xml`
- [ ] Collezioni Astro per `insights` e `case-studies`

---

Nota: aggiorna questo file al termine di ogni attività per tracciare l’avanzamento.

