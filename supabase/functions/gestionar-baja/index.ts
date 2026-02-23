// @ts-nocheck
// Edge Function: gestionar-baja
// Maneja la baja de un usuario y promueve automáticamente al siguiente en lista de espera

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BajaRequest {
  registro_id: string
  motivo?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // --- Authentication: verify JWT from Authorization header ---
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

    const callerEmail = user.email

    const { registro_id, motivo }: BajaRequest = await req.json()

    if (!registro_id) {
      return new Response(
        JSON.stringify({ error: 'registro_id es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Authorization: verify caller owns the registration or is admin ---
    const { data: registro, error: regError } = await supabase
      .from('registros')
      .select('email, pueblo_id')
      .eq('id', registro_id)
      .is('deleted_at', null)
      .single()

    if (regError || !registro) {
      return new Response(
        JSON.stringify({ error: 'Registro no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if caller is admin
    const { data: isAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id })
    const { data: isPuebloAdmin } = await supabase.rpc('is_pueblo_admin', { _user_id: user.id })

    const isOwner = callerEmail?.toLowerCase() === registro.email?.toLowerCase()

    if (!isOwner && !isAdmin && !isPuebloAdmin) {
      return new Response(
        JSON.stringify({ error: 'No tenés permiso para cancelar esta inscripción' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If pueblo_admin, verify they manage this pueblo
    if (isPuebloAdmin && !isAdmin && !isOwner) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('pueblo_id')
        .eq('id', user.id)
        .single()

      if (!profile || profile.pueblo_id !== registro.pueblo_id) {
        return new Response(
          JSON.stringify({ error: 'No tenés permiso para cancelar inscripciones de este pueblo' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('Procesando baja para registro:', registro_id, 'por usuario:', callerEmail)

    // 1. Cancelar la inscripción
    const { data: cancelResult, error: cancelError } = await supabase
      .rpc('cancelar_inscripcion', {
        p_registro_id: registro_id,
        p_motivo: motivo || null
      })

    if (cancelError) {
      console.error('Error al cancelar inscripción:', cancelError)
      throw new Error(`Error al cancelar: ${cancelError.message}`)
    }

    console.log('Cancelación exitosa:', cancelResult)

    const resultado: any = {
      cancelado: true,
      registro_id,
      estado_anterior: cancelResult.estado_anterior,
    }

    // 2. Si era confirmado, promover al siguiente en lista de espera
    if (cancelResult.debe_promover) {
      console.log('Promoviendo siguiente en lista para pueblo:', cancelResult.pueblo_id)

      const { data: promoverResult, error: promoverError } = await supabase
        .rpc('promover_siguiente_en_lista', {
          p_pueblo_id: cancelResult.pueblo_id
        })

      if (promoverError) {
        console.error('Error al promover:', promoverError)
      } else if (promoverResult && promoverResult.promovido) {
        console.log('Usuario promovido:', promoverResult)
        resultado.promovido = promoverResult
        
        // Obtener info del pueblo para el email
        const { data: pueblo } = await supabase
          .from('pueblos')
          .select('nombre')
          .eq('id', cancelResult.pueblo_id)
          .single()
        
        // Enviar email de promoción (requiere RESEND_API_KEY)
        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (resendKey) {
          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'MFS Inscripciones <onboarding@resend.dev>',
                to: [promoverResult.email],
                subject: '¡Has sido promovido de la lista de espera!',
                html: `
                  <h2>¡Buenas noticias!</h2>
                  <p>Hola ${promoverResult.nombres},</p>
                  <p>Te informamos que se ha liberado un lugar en <strong>${pueblo?.nombre || 'tu pueblo'}</strong> y has sido promovido automáticamente de la lista de espera.</p>
                  <p>Tu inscripción está ahora <strong>confirmada</strong>.</p>
                  <p>¡Nos vemos pronto!</p>
                `,
              }),
            })
            
            if (emailResponse.ok) {
              console.log('Email de promoción enviado a:', promoverResult.email)
            } else {
              console.error('Error al enviar email:', await emailResponse.text())
            }
          } catch (emailError) {
            console.error('Error enviando email de promoción:', emailError)
          }
        } else {
          console.log('RESEND_API_KEY no configurado. Email de promoción pendiente para:', promoverResult.email)
        }
      } else {
        console.log('No había nadie en lista de espera')
        resultado.promovido = null
      }
    }

    // 3. Obtener info del pueblo para la respuesta
    const { data: pueblo, error: puebloError } = await supabase
      .from('pueblos')
      .select('nombre')
      .eq('id', cancelResult.pueblo_id)
      .single()

    if (!puebloError && pueblo) {
      resultado.pueblo_nombre = pueblo.nombre
      console.log('Baja procesada para pueblo:', pueblo.nombre)
    }

    return new Response(
      JSON.stringify({
        success: true,
        mensaje: 'Baja procesada exitosamente',
        ...resultado
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Error en gestionar-baja:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error al procesar la baja'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
