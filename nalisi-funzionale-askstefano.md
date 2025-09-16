# Ask Stefano – Architettura Chatbot Specializzato

## Obiettivo

Creare un chatbot “Ask Stefano” che risponde solo usando contenuti del sito (articoli, case study, servizi), con risposte autorevoli, citazioni sempre incluse, tono consulenziale.

## Architettura

* **Frontend (Astro + Tailwind)**

  * Widget chat fluttuante + pagina dedicata “/ask”
  * Box messaggi con citazioni in badge (Fonte: …)
  * Pulsanti rapidi (riepiloga, checklist 30/60/90, invia via email)
  * Toggle lingua IT/EN

* **Backend (Netlify Functions o simile)**

  * `/api/ask`: orchestrazione query → retrieval → LLM → risposta con citazioni
  * `/api/feedback`: gestione feedback 👍/👎
  * `/api/log`: logging anonimo di query/confidenza/fonti

* **Knowledge base**

  * Sorgenti: articoli markdown/MDX, case study, servizi
  * Pipeline ingestione: estrazione testo, chunking (400–800 token), embedding
  * Vector store: pgvector (Postgres) o Pinecone

* **Retrieval ibrido**

  * BM25 (full-text) + similarità vettoriale
  * Re-ranking con LLM
  * Top 6–8 passaggi, sintetizzati a 3–4 citazioni

* **Generazione**

  * Prompt con grounding rigido: rispondi solo con estratti forniti
  * Output: 3–6 bullet, citazioni \[n], sezione finale “Passi successivi”
  * Se confidenza bassa: fallback con link ad articoli pertinenti

## Prompt design

* **System**: “Sei ‘Ask Stefano’, rispondi solo usando estratti forniti. Se non trovi risposta certa, dillo chiaramente.”
* **Context**: lista estratti + metadati
* **User**: domanda originale
* **Output**: bullet points + citazioni + passi successivi

## UI/UX

* Hero micro con esempi di query
* Citazioni cliccabili
* Pulsanti rapidi (riepilogo, checklist, email)
* Barra confidenza (verde/gialla/rossa)

## Privacy & GDPR

* Consenso utente all’uso della chat
* Nessun PII nei prompt
* Log anonimizzati, retention breve (30–60 gg)
* Data Processing Addendum con provider AI

## Metriche

* Answerable rate (% domande con fonti sufficienti)
* Numero medio di citazioni/risposta
* Feedback score (👍/👎)
* Top query (per nuovi articoli)

## Roadmap

* **MVP**: ingestion markdown, retrieval ibrido, citazioni, widget chat
* **V1**: feedback loop per ranking, cache risposte frequenti, modale email transcript
* **V2**: router agent per intent, domini multipli (repo/PDF), analytics dashboard
