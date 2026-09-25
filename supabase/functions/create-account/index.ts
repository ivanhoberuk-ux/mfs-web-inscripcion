import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'

const SENDER_DOMAIN = 'notify.mfspy.org.py'
const FROM_DOMAIN = 'mfspy.org.py'
const REDIRECT_TO = 'https://mfspy.org.py/login'
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function enviarConfirmacion(apiKey: string, email: string, link: string) {
  const safeUrl = escapeHtml(link)
  await sendLovableEmail(
    {
      to: email,
      from: `MFS Paraguay <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: 'Confirmá tu cuenta de MFS Paraguay',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#172554;">
          <h1 style="font-size:24px;margin:0 0 16px;color:#1d4ed8;">🎉 ¡Bienvenido/a!</h1>
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
            Recibimos una solicitud para crear una cuenta en el sistema de inscripciones de las Misiones Familias de Schoenstatt Paraguay.
          </p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
            Tocá el botón para <strong>confirmar tu email</strong> y activar tu cuenta:
          </p>
          <a href="${safeUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px;">
            Confirmar mi email
          </a>
          <p style="font-size:14px;line-height:1.5;margin:28px 0 8px;color:#475569;">
            Tu email de acceso es: <strong>${escapeHtml(email)}</strong>
          </p>
          <p style="font-size:13px;line-height:1.5;margin:16px 0 0;color:#64748b;">
            Si vos no creaste esta cuenta, podés ignorar este correo.
          </p>
        </div>
      `,
      text: `Confirmá tu cuenta de MFS Paraguay: ${link}`,
      purpose: 'transactional',
      idempotency_key: `signup-confirm-${email}-${Date.now()}`,
    },
    { apiKey },
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  try {
    const { email, password } = await req.json()
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!cleanEmail || !cleanEmail.includes('@') || typeof password !== 'string') {
      return json({ error: 'Ingresá tu email y contraseña.' }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!supabaseUrl || !serviceRoleKey || !lovableApiKey) {
      console.error('Missing environment')
      return json({ error: 'No se pudo crear la cuenta. Intentá de nuevo.' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Rate limit
    const emailHash = await sha256('signup:' + cleanEmail)
    const { data: existingLimit } = await admin
      .from('password_reset_rate_limits')
      .select('last_requested_at, request_count')
      .eq('email_hash', emailHash)
      .maybeSingle()
    if (existingLimit?.last_requested_at) {
      const elapsed = Date.now() - new Date(existingLimit.last_requested_at).getTime()
      if (elapsed < COOLDOWN_MS) {
        const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
        return json({ error: `Esperá ${wait} segundos antes de intentar de nuevo.`, waitSeconds: wait }, 429)
      }
    }
    await admin.from('password_reset_rate_limits').upsert({
      email_hash: emailHash,
      last_requested_at: new Date().toISOString(),
      request_count: (existingLimit?.request_count ?? 0) + 1,
    })

    // Crear usuario SIN confirmar
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: cleanEmail,
      password,
      options: { redirectTo: REDIRECT_TO },
    })

    if (error) {
      const msg = error.message?.toLowerCase() ?? ''
      const alreadyRegistered =
        msg.includes('already') || msg.includes('registered') || msg.includes('exists')
      if (!alreadyRegistered) {
        console.error('generateLink signup failed', error)
        return json({ error: 'No se pudo crear la cuenta. Intentá de nuevo.' }, 400)
      }

      const { data: ml, error: mlErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: { redirectTo: REDIRECT_TO },
      })
      if (mlErr || !ml?.user) {
        console.error('generateLink magiclink failed', mlErr)
        return json({ error: 'No se pudo crear la cuenta. Intentá de nuevo.' }, 400)
      }
      if (ml.user.email_confirmed_at) {
        return json(
          { error: "Ese email ya tiene una cuenta. Iniciá sesión o usá '¿Olvidaste tu contraseña?'" },
          409,
        )
      }
      if (!ml.properties?.action_link) {
        return json({ error: 'No se pudo reenviar la confirmación.' }, 500)
      }
      await enviarConfirmacion(lovableApiKey, cleanEmail, ml.properties.action_link)
      return json({ needsConfirmation: true, resent: true })
    }

    if (!data?.properties?.action_link) {
      console.error('Signup link missing')
      return json({ error: 'No se pudo crear la cuenta. Intentá de nuevo.' }, 500)
    }

    await enviarConfirmacion(lovableApiKey, cleanEmail, data.properties.action_link)
    return json({ needsConfirmation: true })
  } catch (error) {
    console.error('create-account failed', error)
    return json({ error: 'No se pudo crear la cuenta. Intentá de nuevo.' }, 500)
  }
})
