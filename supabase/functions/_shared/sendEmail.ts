/** Send one email through Resend. Logs the status only (never the address). */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('READY_EMAIL_FROM') ?? 'Haggis-gotchi mother <hello@haggisgotchi.com>'
  if (!key) {
    console.error('sendEmail: missing server configuration: RESEND_API_KEY')
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!res.ok) console.error(`sendEmail: resend ${res.status}`)
  return res.ok
}
