import { Resend } from 'resend'

function safe(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export const handler = async (event: any) => {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const CONTACT_TO = process.env.CONTACT_TO
    const FROM_EMAIL = process.env.FROM_EMAIL

    if (!RESEND_API_KEY || !CONTACT_TO || !FROM_EMAIL) {
      return { statusCode: 500, body: 'Missing email environment configuration' }
    }

    const resend = new Resend(RESEND_API_KEY)

    const body = event?.body
    const parsed = typeof body === 'string' ? JSON.parse(body) : body
    const payload = parsed?.payload || parsed || {}
    const data = payload?.data || {}

    const formName = payload?.form_name || payload?.formName || 'contact'
    if (formName !== 'contact') {
      return { statusCode: 200, body: 'Ignored: not contact form' }
    }

    const name = safe(data.name)
    const email = safe(data.email)
    const message = safe(data.message)
    const createdAt = payload?.created_at || new Date().toISOString()
    const ip = payload?.remote_ip || payload?.ip || ''

    // Owner email
    const ownerSubject = `Nuova submission contatti: ${name || 'senza nome'}`
    const ownerText = [
      `Nome: ${name}`,
      `Email: ${email}`,
      `Messaggio:`,
      message,
      '',
      `Data/Ora: ${createdAt}`,
      ip ? `IP: ${ip}` : ''
    ].filter(Boolean).join('\n')

    await resend.emails.send({
      from: FROM_EMAIL,
      to: CONTACT_TO,
      subject: ownerSubject,
      text: ownerText,
      replyTo: email || undefined,
    })

    // User confirmation email (optional if email present)
    if (email) {
      const userSubject = 'Abbiamo ricevuto il tuo messaggio'
      const userText = [
        'Grazie per averci contattato. Ti risponderemo al più presto.',
        '',
        'Copia del tuo messaggio:',
        message
      ].join('\n')
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: userSubject,
        text: userText,
      })
    }

    return { statusCode: 200, body: 'OK' }
  } catch (err) {
    // Non loggare dati sensibili
    return { statusCode: 200, body: 'Processed' }
  }
}


