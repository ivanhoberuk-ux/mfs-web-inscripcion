// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No authorization header' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return json({ error: 'Usuario no autenticado' }, 401)

    const { data: callerRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    if (roleError || !(callerRoles ?? []).map((r: any) => r.role).includes('admin')) {
      return json({ error: 'No tienes permisos de administrador' }, 403)
    }

    const { email } = await req.json()
    if (!email || typeof email !== 'string' || !email.trim()) {
      return json({ error: 'Email es requerido' }, 400)
    }

    const { data: target, error: lookupError } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', email.trim())
      .maybeSingle()

    if (lookupError) {
      console.error('Error buscando perfil:', lookupError)
      return json({ error: 'Error al buscar usuarios' }, 500)
    }
    if (!target) {
      return json(
        { error: 'No se encontró un usuario con ese email. La persona debe crear una cuenta primero en /login.' },
        404,
      )
    }

    const { data: targetRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', target.id)
    if ((targetRoles ?? []).some((r: any) => r.role === 'admin')) {
      return json({ error: 'Este usuario ya es administrador' }, 400)
    }

    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({ user_id: target.id, role: 'admin' })
    if (insertError && insertError.code !== '23505') {
      console.error('Error inserting role:', insertError)
      return json({ error: 'Error al asignar rol de administrador' }, 500)
    }

    console.log('User promoted to admin:', { email: target.email, userId: target.id })
    return json({ success: true, message: 'Usuario promovido a administrador exitosamente' })
  } catch (error: any) {
    console.error('Error in promote-to-admin function:', error)
    return json({ error: 'Error interno del servidor' }, 500)
  }
})
