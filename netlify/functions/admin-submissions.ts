export const handler = async (event: any) => {
  try {
    const tokenHeader = event?.headers?.['x-admin-token'] || event?.headers?.['X-Admin-Token']
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN
    if (!ADMIN_TOKEN || tokenHeader !== ADMIN_TOKEN) {
      return { statusCode: 401, body: 'Unauthorized' }
    }

    const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN
    if (!NETLIFY_AUTH_TOKEN) {
      return { statusCode: 500, body: 'Missing NETLIFY_AUTH_TOKEN' }
    }

    const formsResp = await fetch('https://api.netlify.com/api/v1/forms', {
      headers: { Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}` },
    })
    if (!formsResp.ok) return { statusCode: 500, body: 'Failed to fetch forms' }
    const forms = await formsResp.json()
    const contactForm = (forms || []).find((f: any) => f.name === 'contact')
    if (!contactForm) return { statusCode: 404, body: 'Form not found' }

    const subsResp = await fetch(`https://api.netlify.com/api/v1/forms/${contactForm.id}/submissions`, {
      headers: { Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}` },
    })
    if (!subsResp.ok) return { statusCode: 500, body: 'Failed to fetch submissions' }
    const submissions = await subsResp.json()

    const html = [`<html><head><meta charset="utf-8"><title>Submissions</title></head><body>`,
      `<h1>Contact submissions</h1>`,
      `<table border="1" cellpadding="6" cellspacing="0">`,
      `<thead><tr><th>Data/Ora</th><th>Nome</th><th>Email</th><th>Messaggio</th><th>IP</th></tr></thead>`,
      `<tbody>`,
      ...submissions.map((s: any) => {
        const data = s?.data || {}
        const esc = (v: any) => String(v || '').replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c])
        return `<tr><td>${esc(s.created_at)}</td><td>${esc(data.name)}</td><td>${esc(data.email)}</td><td>${esc(data.message)}</td><td>${esc(s.ip)}</td></tr>`
      }),
      `</tbody></table>`,
      `</body></html>`].join('')

    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html }
  } catch (e) {
    return { statusCode: 500, body: 'Error' }
  }
}


