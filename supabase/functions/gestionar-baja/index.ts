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

    const { registro_id, motivo }: BajaRequest = await req.json()

    if (!registro_id) {
      return new Response(
        JSON.stringify({ error: 'registro_id es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Procesando baja para registro:', registro_id)

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
        
        // TODO: Aquí se podría enviar email al usuario promovido
        // Requiere integración con Resend u otro servicio de email
        console.log('Email de promoción pendiente para:', promoverResult.email)
      } else {
        console.log('No había nadie en lista de espera')
        resultado.promovido = null
      }
    }

    // 3. Obtener info del pueblo para notificar al admin
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
        error: error.message || 'Error al procesar la baja',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
