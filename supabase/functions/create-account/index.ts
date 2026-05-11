import { createClient } from 'npm:@supabase/supabase-js@2'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  try {
    const { email, password } = await req.json()
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!cleanEmail || typeof password !== 'string') {
      return json({ error: 'Ingresá tu email y contraseña.' }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase admin environment')
      return json({ error: 'No se pudo crear la cuenta. Intentá de nuevo.' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
    })

    if (error) {
      const message = error.message?.toLowerCase() ?? ''
      const alreadyRegistered = message.includes('already') || message.includes('registered') || message.includes('exists')
      return json(
        { error: alreadyRegistered ? 'Ese email ya tiene una cuenta. Iniciá sesión con tu contraseña.' : error.message },
        alreadyRegistered ? 409 : 400,
      )
    }

    return json({ userId: data.user?.id ?? null })
  } catch (error) {
    console.error('create-account failed', error)
    return json({ error: 'No se pudo crear la cuenta. Intentá de nuevo.' }, 500)
  }
})