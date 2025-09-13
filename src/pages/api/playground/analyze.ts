import type { APIRoute } from 'astro'
export const prerender = false
import OpenAI from 'openai'

// Inizializza OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY
})

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!import.meta.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OpenAI API key non configurata' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    // Parsing robusto del corpo JSON
    let body: any = null
    try {
      const contentType = request.headers.get('content-type') || ''
      if (contentType.includes('application/json')) body = await request.json()
      else { const text = await request.text(); body = text ? JSON.parse(text) : null }
    } catch {}

    if (!body) return new Response(JSON.stringify({ error: 'Body JSON non valido o mancante' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    const { code, language, locale = 'it' } = body
    if (!code || !language) return new Response(JSON.stringify({ error: 'Codice e linguaggio sono richiesti' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    // Prompt multilingua
    const prompts = {
      it: {
        system: `Sei un esperto sviluppatore. Rispondi SEMPRE in italiano.
- Tono: professionale, conciso.
- Formato: Markdown.
- Limita la lunghezza: massimo 6–8 bullet totali e blocchi brevi.`,
        user: `Analizza in modo SINTETICO questo codice ${language}:

\`\`\`${language}
${code}
\`\`\`

Fornisci SOLO:
1) Spiegazione (2–3 frasi).
2) Problemi principali (max 3 bullet).
3) Miglioramenti consigliati (max 3 bullet).
Evita digressioni e ripetizioni.`
      },
      en: {
        system: `You are an expert developer. ALWAYS respond in English.
- Tone: professional, concise.
- Format: Markdown.
- Limit length: maximum 6–8 bullets total and brief blocks.`,
        user: `Analyze this ${language} code SYNTHETICALLY:

\`\`\`${language}
${code}
\`\`\`

Provide ONLY:
1) Explanation (2–3 sentences).
2) Main issues (max 3 bullets).
3) Recommended improvements (max 3 bullets).
Avoid digressions and repetitions.`
      },
      sl: {
        system: `Ste strokovnjak za razvoj. VEDNO odgovorite v slovenščini.
- Ton: profesionalen, jedrnat.
- Format: Markdown.
- Omejite dolžino: največ 6–8 alinej skupaj in kratki bloki.`,
        user: `SINTETIČNO analizirajte to ${language} kodo:

\`\`\`${language}
${code}
\`\`\`

Podajte SAMO:
1) Razlago (2–3 stavki).
2) Glavne težave (največ 3 alineje).
3) Priporočena izboljšanja (največ 3 alineje).
Izogibajte se odvečnim razlagam in ponavljanjem.`
      }
    }

    const currentPrompts = prompts[locale as keyof typeof prompts] || prompts.it
    const systemPrompt = currentPrompts.system
    const userPrompt = currentPrompts.user

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 700,
      temperature: 0.2
    })

    const analysisText = completion.choices[0].message.content
    if (!analysisText) throw new Error('Nessuna risposta ricevuta da OpenAI')

    // Non spezzare più in sezioni: usa direttamente il testo sintetico in explanation
    return new Response(
      JSON.stringify({
        explanation: analysisText.trim(),
        suggestions: '',
        fullAnalysis: analysisText
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Errore nell\'analisi del codice:', error)
    return new Response(JSON.stringify({ error: 'Errore interno del server durante l\'analisi del codice', details: import.meta.env.DEV ? (error as Error).message : undefined }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
