// @ts-nocheck
// Edge Function: test-email
// Envía un email de prueba usando Resend — solo super_admin

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'

const SENDER_DOMAIN = 'notify.mfspy.org.py'
const FROM_DOMAIN = 'mfspy.org.py'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // --- Authentication: verify JWT ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Se requiere autenticación' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido o sesión expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Authorization: only super_admin ---
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id })
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Se requieren permisos de administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'Servicio de email no configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Enviando email de prueba a:', email, 'por admin:', user.email)

    const result = await sendLovableEmail(
      {
        to: email,
        from: `MFS Inscripciones <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: 'Email de Prueba - MFS',
        html: `
          <h2>¡Email de prueba exitoso!</h2>
          <p>Este es un email de prueba del sistema de inscripciones MFS.</p>
          <p>La configuración de correos está funcionando correctamente.</p>
          <p>Fecha: ${new Date().toLocaleString()}</p>
        `,
        text: `¡Email de prueba exitoso!\n\nEste es un email de prueba del sistema de inscripciones MFS.\nLa configuración de correos está funcionando correctamente.\nFecha: ${new Date().toLocaleString()}`,
        purpose: 'transactional',
        idempotency_key: `test-email-${user.id}-${Date.now()}`,
      },
      { apiKey: lovableApiKey }
    )
    console.log('Email enviado exitosamente:', result)

    return new Response(
      JSON.stringify({
        success: true,
        mensaje: 'Email de prueba enviado exitosamente',
        email,
        result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Error en test-email:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error al enviar email de prueba'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
