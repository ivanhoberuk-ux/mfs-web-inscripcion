// @ts-nocheck
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'

export const SENDER_DOMAIN = 'notify.mfspy.org.py'
export const FROM_DEFAULT = 'MFS Paraguay <noreply@mfspy.org.py>'

async function sha256(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Token de baja estable por destinatario (requerido por emails transaccionales). */
export async function unsubscribeToken(email: string) {
  return `mfs-${(await sha256(String(email).trim().toLowerCase())).slice(0, 40)}`
}

/**
 * Envía un email transaccional agregando unsubscribe_token por destinatario.
 * La idempotencyKey recibe un sufijo por intento (timestamp) salvo que stableKey=true,
 * para que un fallo previo no bloquee los reintentos (409).
 * Si `to` es un array, envía un email por destinatario.
 */
export async function enviarEmail(opts: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  idempotencyKey: string
  from?: string
  apiKey?: string | null
  stableKey?: boolean
}) {
  const apiKey = opts.apiKey ?? Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) throw new Error('Falta LOVABLE_API_KEY')
  const destinos = Array.isArray(opts.to) ? opts.to : [opts.to]
  const intento = Date.now()
  const results = []
  for (const to of destinos) {
    const token = await unsubscribeToken(to)
    const base = destinos.length > 1 ? `${opts.idempotencyKey}-${token.slice(4, 16)}` : opts.idempotencyKey
    results.push(await sendLovableEmail(
      {
        to,
        from: opts.from ?? FROM_DEFAULT,
        sender_domain: SENDER_DOMAIN,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        purpose: 'transactional',
        unsubscribe_token: token,
        idempotency_key: opts.stableKey ? base : `${base}-${intento}`,
      },
      { apiKey },
    ))
  }
  return results.length === 1 ? results[0] : results
}
