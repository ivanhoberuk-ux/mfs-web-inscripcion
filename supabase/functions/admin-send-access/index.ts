import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'

const SENDER_DOMAIN = 'notify.mfspy.org.py'
const FROM_DOMAIN = 'mfspy.org.py'
const REDIRECT_TO = 'https://mfspy.org.py/reset-password'

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

function randomPassword() {
  // 24 chars hex
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('') + 'Aa1!'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceRoleKey || !lovableApiKey || !anonKey) {
      console.error('Missing env')
      return json({ error: 'Configuración incompleta.' }, 500)
    }

    // 1) Verificar caller
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'No autorizado.' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return json({ error: 'No autorizado.' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
    const roleList = (roles ?? []).map((r: any) => r.role)
    const isSuper = roleList.includes('admin')
    const isPuebloAdmin = roleList.includes('pueblo_admin')
    if (!isSuper && !isPuebloAdmin) {
      return json({ error: 'Solo administradores pueden enviar accesos.' }, 403)
    }

    // 2) Parse input
    const { registro_id, email: emailRaw, nombres } = await req.json()
    let targetEmail = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : ''
    let displayName = typeof nombres === 'string' ? nombres : ''

    if (registro_id) {
      const { data: reg, error: regErr } = await admin
        .from('registros')
        .select('email, nombres, apellidos, pueblo_id')
        .eq('id', registro_id)
        .maybeSingle()
      if (regErr || !reg) return json({ error: 'Inscripción no encontrada.' }, 404)
      targetEmail = (reg.email || '').toLowerCase()
      displayName = `${reg.nombres} ${reg.apellidos}`.trim()

      // Si es pueblo_admin (no super), verificar que sea su pueblo
      if (!isSuper) {
        const { data: profile } = await admin
          .from('profiles')
          .select('pueblo_id')
          .eq('id', userData.user.id)
          .maybeSingle()
        if (!profile?.pueblo_id || profile.pueblo_id !== reg.pueblo_id) {
          return json({ error: 'No tenés permiso sobre este pueblo.' }, 403)
        }
      }
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      return json({ error: 'Email inválido.' }, 400)
    }

    // 3) Crear cuenta si no existe
    let created = false
    const { data: createRes, error: createErr } = await admin.auth.admin.createUser({
      email: targetEmail,
      password: randomPassword(),
      email_confirm: true,
    })

    if (createErr) {
      const msg = (createErr.message || '').toLowerCase()
      const alreadyExists =
        msg.includes('already') || msg.includes('registered') || msg.includes('exists')
      if (!alreadyExists) {
        console.error('createUser failed', createErr)
        return json({ error: createErr.message || 'No se pudo crear la cuenta.' }, 400)
      }
    } else if (createRes?.user) {
      created = true
    }

    // 4) Generar link de recovery (sirve para establecer contraseña la primera vez)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: targetEmail,
      options: { redirectTo: REDIRECT_TO },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('generateLink failed', linkErr)
      return json({ error: 'No se pudo generar el link de acceso.' }, 500)
    }

    const accessUrl = linkData.properties.action_link
    const safeUrl = escapeHtml(accessUrl)
    const safeName = escapeHtml(displayName || 'Misionero/a')

    await sendLovableEmail(
      {
        to: targetEmail,
        from: `MFS Paraguay <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: created
          ? '¡Bienvenido/a a MFS Paraguay! Configurá tu contraseña'
          : 'Acceso a tu cuenta MFS Paraguay',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#172554;">
            <h1 style="font-size:24px;margin:0 0 16px;color:#1d4ed8;">🎉 ¡Hola ${safeName}!</h1>
            <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
              ${created
                ? 'Un administrador te creó una cuenta en el sistema de inscripciones de las Misiones Familias de Schoenstatt Paraguay.'
                : 'Un administrador habilitó el acceso a tu cuenta en MFS Paraguay.'}
            </p>
            <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
              Tocá el botón para <strong>${created ? 'establecer tu contraseña' : 'restablecer tu contraseña'}</strong> y acceder al sistema:
            </p>
            <a href="${safeUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px;">
              ${created ? 'Configurar mi contraseña' : 'Acceder a mi cuenta'}
            </a>
            <p style="font-size:14px;line-height:1.5;margin:28px 0 8px;color:#475569;">
              Tu email de acceso es: <strong>${escapeHtml(targetEmail)}</strong>
            </p>
            <p style="font-size:13px;line-height:1.5;margin:16px 0 0;color:#64748b;">
              Si vos no esperabas este correo, podés ignorarlo.
            </p>
          </div>
        `,
        text: `Hola ${displayName || ''}. ${created ? 'Te creamos una cuenta en MFS Paraguay.' : 'Acceso a MFS Paraguay habilitado.'} Configurá tu contraseña: ${accessUrl}`,
        purpose: 'transactional',
        unsubscribe_token: `admin-access-${targetEmail}`,
        idempotency_key: `admin-access-${targetEmail}-${Date.now()}`,
      },
      { apiKey: lovableApiKey }
    )

    return json({ success: true, created, email: targetEmail })
  } catch (error) {
    console.error('admin-send-access failed', error)
    return json({ error: 'No se pudo enviar el acceso. Intentá de nuevo.' }, 500)
  }
})
