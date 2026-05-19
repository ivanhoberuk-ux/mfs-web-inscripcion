import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'

const SENDER_DOMAIN = 'notify.mfspy.org.py'
const FROM_DOMAIN = 'mfspy.org.py'
const DEFAULT_REDIRECT_TO = 'https://mfspy.org.py/reset-password'
const COOLDOWN_MS = 60 * 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function safeRedirectTo(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_REDIRECT_TO

  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    const isAllowedHost =
      host === 'mfspy.org.py' ||
      host === 'www.mfspy.org.py' ||
      host === 'localhost' ||
      host.endsWith('.lovable.app')

    if (!isAllowedHost) return DEFAULT_REDIRECT_TO
    url.pathname = '/reset-password'
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return DEFAULT_REDIRECT_TO
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  try {
    const { email, redirectTo } = await req.json()
    const cleanEmail = normalizeEmail(email)

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return json({ error: 'Ingresá un email válido.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')

    if (!supabaseUrl || !serviceRoleKey || !lovableApiKey) {
      console.error('Missing password reset environment')
      return json({ error: 'No se pudo enviar el link. Intentá de nuevo más tarde.' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const emailHash = await sha256(cleanEmail)
    const { data: existingLimit } = await admin
      .from('password_reset_rate_limits')
      .select('last_requested_at, request_count')
      .eq('email_hash', emailHash)
      .maybeSingle()

    if (existingLimit?.last_requested_at) {
      const elapsed = Date.now() - new Date(existingLimit.last_requested_at).getTime()
      if (elapsed < COOLDOWN_MS) {
        return json({ success: true, alreadySent: true, waitSeconds: Math.ceil((COOLDOWN_MS - elapsed) / 1000) })
      }
    }

    await admin.from('password_reset_rate_limits').upsert({
      email_hash: emailHash,
      last_requested_at: new Date().toISOString(),
      request_count: (existingLimit?.request_count ?? 0) + 1,
    })

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: { redirectTo: safeRedirectTo(redirectTo) },
    })

    if (error || !data.properties?.action_link) {
      console.warn('Password reset link not generated', { emailHash, error: error?.message })
      return json({ success: true })
    }

    const resetUrl = escapeHtml(data.properties.action_link)

    await sendLovableEmail(
      {
        to: cleanEmail,
        from: `MFS Paraguay <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: 'Recuperá tu contraseña - MFS Paraguay',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#172554;">
            <h1 style="font-size:24px;margin:0 0 16px;color:#1d4ed8;">🔑 Recuperar contraseña</h1>
            <p style="font-size:16px;line-height:1.6;margin:0 0 20px;">Recibimos una solicitud para restablecer tu contraseña en MFS Paraguay.</p>
            <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Tocá el botón para elegir una nueva contraseña:</p>
            <a href="${resetUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px;">Cambiar contraseña</a>
            <p style="font-size:13px;line-height:1.5;margin:28px 0 0;color:#64748b;">Si vos no pediste este cambio, podés ignorar este correo.</p>
          </div>
        `,
        text: `Recibimos una solicitud para restablecer tu contraseña en MFS Paraguay. Abrí este enlace para cambiarla: ${data.properties.action_link}`,
        purpose: 'transactional',
        unsubscribe_token: `password-reset-${emailHash}`,
        idempotency_key: `password-reset-${emailHash}-${Date.now()}`,
      },
      { apiKey: lovableApiKey }
    )

    return json({ success: true })
  } catch (error) {
    console.error('request-password-reset failed', error)
    return json({ error: 'No se pudo enviar el link. Intentá de nuevo más tarde.' }, 500)
  }
})