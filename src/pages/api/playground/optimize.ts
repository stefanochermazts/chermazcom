import type { APIRoute } from 'astro'
export const prerender = false
import OpenAI from 'openai'

// Inizializza OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY
})

export const POST: APIRoute = async ({ request }) => {
  try {
    // Verifica che la API key sia configurata
    if (!import.meta.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key non configurata' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Parsing robusto del corpo JSON
    let body: any = null
    try {
      const contentType = request.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        body = await request.json()
      } else {
        const text = await request.text()
        body = text ? JSON.parse(text) : null
      }
    } catch (e) {
      // Ignorato, gestito sotto
    }

    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Body JSON non valido o mancante' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { code, language, analysis, locale = 'it' } = body

    if (!code || !language) {
      return new Response(
        JSON.stringify({ error: 'Codice e linguaggio sono richiesti' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Prompt multilingua per l'ottimizzazione
    const prompts = {
      it: {
        system: `Sei un esperto sviluppatore software specializzato nell'ottimizzazione del codice. 

Il tuo compito è:
1. Migliorare il codice fornito mantenendo la stessa funzionalità
2. Applicare best practices e pattern ottimali
3. Ottimizzare per performance, leggibilità e manutenibilità
4. Spiegare le modifiche apportate

Rispondi SEMPRE in italiano.
Fornisci SOLO il codice ottimizzato e la spiegazione delle modifiche, senza ripetere l'analisi precedente.`,
        user: `Ottimizza questo codice ${language} basandoti sui problemi identificati:

\`\`\`${language}
${code}
\`\`\`

Fornisci:
1. Il codice ottimizzato (senza commenti aggiuntivi, solo il codice funzionante)
2. Spiegazione delle modifiche apportate e perché migliorano il codice

Mantieni la stessa funzionalità ma migliora:
- Performance ed efficienza
- Leggibilità e struttura
- Sicurezza e robustezza
- Aderenza alle best practices del linguaggio`
      },
      en: {
        system: `You are an expert software developer specialized in code optimization.

Your task is:
1. Improve the provided code while maintaining the same functionality
2. Apply best practices and optimal patterns
3. Optimize for performance, readability and maintainability
4. Explain the changes made

ALWAYS respond in English.
Provide ONLY the optimized code and explanation of changes, without repeating the previous analysis.`,
        user: `Optimize this ${language} code based on the identified issues:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. The optimized code (no additional comments, just working code)
2. Explanation of changes made and why they improve the code

Maintain the same functionality but improve:
- Performance and efficiency
- Readability and structure
- Security and robustness
- Adherence to language best practices`
      },
      sl: {
        system: `Ste strokovnjak za razvoj programske opreme, specializiran za optimizacijo kode.

Vaša naloga je:
1. Izboljšati podano kodo ob ohranjanju iste funkcionalnosti
2. Uporabiti najboljše prakse in optimalne vzorce
3. Optimizirati za zmogljivost, berljivost in vzdrževanje
4. Razložiti narejene spremembe

VEDNO odgovorite v slovenščini.
Podajte SAMO optimizirano kodo in razlago sprememb, ne ponavljajte prejšnje analize.`,
        user: `Optimizirajte to ${language} kodo na podlagi identificiranih težav:

\`\`\`${language}
${code}
\`\`\`

Podajte:
1. Optimizirano kodo (brez dodatnih komentarjev, samo delujočo kodo)
2. Razlago narejenih sprememb in zakaj izboljšujejo kodo

Ohranite isto funkcionalnost, vendar izboljšajte:
- Zmogljivost in učinkovitost
- Berljivost in strukturo
- Varnost in robustnost
- Skladnost z najboljšimi praksami jezika`
      }
    }

    const currentPrompts = prompts[locale as keyof typeof prompts] || prompts.it
    const previousAnalysis = analysis ? `\n\nAnalisi precedente:\n${analysis.fullAnalysis}` : ''
    const systemPrompt = currentPrompts.system
    const userPrompt = currentPrompts.user + previousAnalysis

    // Chiamata a OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.2
    })

    const optimizationText = completion.choices[0].message.content

    if (!optimizationText) {
      throw new Error('Nessuna risposta ricevuta da OpenAI')
    }

    // Estrai il codice ottimizzato dal blocco di codice
    const codeBlockRegex = new RegExp(`\`\`\`(?:${language})?\n([\\s\\S]*?)\`\`\``, 'i')
    const codeMatch = optimizationText.match(codeBlockRegex)
    
    let optimizedCode = ''
    let explanation = optimizationText

    if (codeMatch && codeMatch[1]) {
      optimizedCode = codeMatch[1].trim()
      // Rimuovi il blocco di codice dalla spiegazione
      explanation = optimizationText.replace(codeBlockRegex, '').trim()
    } else {
      // Se non trova un blocco di codice, prova a estrarre il codice in altro modo
      const lines = optimizationText.split('\n')
      const codeLines = []
      let inCodeBlock = false
      
      for (const line of lines) {
        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock
          continue
        }
        if (inCodeBlock) {
          codeLines.push(line)
        }
      }
      
      if (codeLines.length > 0) {
        optimizedCode = codeLines.join('\n').trim()
        explanation = optimizationText.replace(/```[\s\S]*?```/g, '').trim()
      } else {
        // Fallback: prendi tutto come spiegazione
        optimizedCode = 'Impossibile estrarre il codice ottimizzato'
        explanation = optimizationText
      }
    }

    // Pulisci la spiegazione
    explanation = explanation
      .replace(/^#+\s*/gm, '') // Rimuovi header markdown
      .replace(/^\d+\.\s*/gm, '') // Rimuovi numerazione
      .trim()

    return new Response(
      JSON.stringify({
        optimizedCode: optimizedCode || 'Codice ottimizzato non disponibile',
        explanation: explanation || 'Ottimizzazione completata',
        fullResponse: optimizationText
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Errore nell\'ottimizzazione del codice:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Errore interno del server durante l\'ottimizzazione del codice',
        details: import.meta.env.DEV ? (error as Error).message : undefined
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
