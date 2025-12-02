// @ts-nocheck
// Edge Function: test-email
// Envía un email de prueba usando Resend

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY no configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Enviando email de prueba a:', email)

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MFS Inscripciones <onboarding@resend.dev>',
        to: [email],
        subject: 'Email de Prueba - MFS',
        html: `
          <h2>¡Email de prueba exitoso!</h2>
          <p>Este es un email de prueba del sistema de inscripciones MFS.</p>
          <p>La configuración de Resend está funcionando correctamente.</p>
          <p>Fecha: ${new Date().toLocaleString()}</p>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Error al enviar email:', errorText)
      throw new Error(errorText)
    }

    const result = await emailResponse.json()
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
        error: error.message || 'Error al enviar email de prueba',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
