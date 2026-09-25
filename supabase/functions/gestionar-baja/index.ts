// @ts-nocheck
// Edge Function: gestionar-baja
// Cancela una inscripción (queda como 'cancelado' con deleted_at). La promoción
// desde lista de espera la hace el trigger registros_promover_al_liberar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'
import { escapeHtml, notificarPromocionesPendientes } from '../_shared/promociones.ts'

const SENDER_DOMAIN = 'notify.mfspy.org.py'
const FROM_DOMAIN = 'mfspy.org.py'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // --- Autenticación ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Se requiere autenticación' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return json({ error: 'Token inválido o sesión expirada' }, 401)

    const callerEmail = user.email
    const { registro_id, motivo } = await req.json()
    if (!registro_id || typeof registro_id !== 'string') {
      return json({ error: 'registro_id es requerido' }, 400)
    }

    // --- Autorización ---
    const { data: registro, error: regError } = await supabase
      .from('registros')
      .select('email, pueblo_id')
      .eq('id', registro_id)
      .is('deleted_at', null)
      .single()
    if (regError || !registro) return json({ error: 'Registro no encontrado' }, 404)

    const { data: isAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id })
    const { data: isPuebloAdmin } = await supabase.rpc('is_pueblo_admin', { _user_id: user.id })

    const isOwner =
      !!user.email_confirmed_at &&
      !!callerEmail &&
      callerEmail.toLowerCase() === registro.email?.toLowerCase()

    if (!isOwner && !isAdmin && !isPuebloAdmin) {
      return json({ error: 'No tenés permiso para cancelar esta inscripción' }, 403)
    }

    if (isPuebloAdmin && !isAdmin && !isOwner) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('pueblo_id')
        .eq('id', user.id)
        .single()
      if (!profile || profile.pueblo_id !== registro.pueblo_id) {
        return json({ error: 'No tenés permiso para cancelar inscripciones de este pueblo' }, 403)
      }
    }

    console.log('Procesando baja para registro:', registro_id, 'por usuario:', callerEmail)

    // 1. Cancelar (el trigger promueve al siguiente si corresponde)
    const { data: cancelResult, error: cancelError } = await supabase.rpc('cancelar_inscripcion', {
      p_registro_id: registro_id,
      p_motivo: motivo || null,
    })
    if (cancelError) {
      console.error('Error al cancelar inscripción:', cancelError)
      throw new Error(`Error al cancelar: ${cancelError.message}`)
    }

    const resultado: any = {
      cancelado: true,
      registro_id,
      estado_anterior: cancelResult.estado_anterior,
    }

    // 2. Notificar promociones generadas por el trigger
    const promovidos = await notificarPromocionesPendientes(
      supabase,
      LOVABLE_API_KEY,
      cancelResult.pueblo_id,
    )
    const p = promovidos[0]
    resultado.promovido = p
      ? { nombres: p.nombres, apellidos: p.apellidos, email: p.email, registro_id: p.registro_id }
      : null

    // 3. Datos para notificación a admins
    const { data: pueblo } = await supabase
      .from('pueblos')
      .select('nombre')
      .eq('id', cancelResult.pueblo_id)
      .single()

    const { data: registroCompleto } = await supabase
      .from('registros')
      .select('nombres, apellidos, ci, rol, email, telefono')
      .eq('id', registro_id)
      .maybeSingle()

    if (pueblo) resultado.pueblo_nombre = pueblo.nombre

    // 4. Notificar a admins del pueblo
    if (LOVABLE_API_KEY && pueblo && registroCompleto) {
      try {
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('email, id, user_roles!inner(role)')
          .eq('pueblo_id', cancelResult.pueblo_id)
          .in('user_roles.role', ['pueblo_admin', 'co_admin_pueblo'])

        const adminEmails = [
          ...new Set((adminProfiles || []).map((a: any) => a.email).filter(Boolean)),
        ]

        if (adminEmails.length > 0) {
          const estadoTxt =
            cancelResult.estado_anterior === 'confirmado'
              ? 'confirmada'
              : cancelResult.estado_anterior === 'lista_espera'
                ? 'en lista de espera'
                : cancelResult.estado_anterior

          const promovidoHtml = resultado.promovido
            ? `<p style="margin-top:16px;padding:12px;background:#dcfce7;border-radius:8px;color:#065f46;">
                ✅ Se promovió automáticamente a <strong>${escapeHtml(resultado.promovido.nombres)} ${escapeHtml(resultado.promovido.apellidos)}</strong> de la lista de espera.
              </p>`
            : ''

          const rc = registroCompleto
          for (const adminEmail of adminEmails) {
            await sendLovableEmail(
              {
                from: `MFS Inscripciones <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                to: adminEmail,
                subject: `📤 Baja en ${pueblo.nombre}: ${rc.nombres} ${rc.apellidos}`,
                html: `
                  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                    <h2 style="color:#0369a1;">📤 Aviso de baja</h2>
                    <p>Hola, te informamos que la siguiente persona se dio de baja del pueblo <strong>${escapeHtml(pueblo.nombre)}</strong>:</p>
                    <div style="padding:16px;background:#f1f5f9;border-radius:8px;border-left:4px solid #ef4444;">
                      <p style="margin:4px 0;"><strong>Nombre:</strong> ${escapeHtml(rc.nombres)} ${escapeHtml(rc.apellidos)}</p>
                      <p style="margin:4px 0;"><strong>CI:</strong> ${escapeHtml(rc.ci)}</p>
                      <p style="margin:4px 0;"><strong>Rol:</strong> ${escapeHtml(rc.rol)}</p>
                      <p style="margin:4px 0;"><strong>Email:</strong> ${escapeHtml(rc.email)}</p>
                      <p style="margin:4px 0;"><strong>Teléfono:</strong> ${escapeHtml(rc.telefono)}</p>
                      <p style="margin:4px 0;"><strong>Estado anterior:</strong> ${escapeHtml(estadoTxt)}</p>
                    </div>
                    ${promovidoHtml}
                    <p style="margin-top:16px;color:#64748b;font-size:13px;">
                      Esta persona podrá inscribirse a otro pueblo si hay cupo disponible.
                    </p>
                  </div>
                `,
                text: `Aviso de baja en ${pueblo.nombre}: ${rc.nombres} ${rc.apellidos}. Estado anterior: ${estadoTxt}.`,
                purpose: 'transactional',
                unsubscribe_token: `baja-admin-${adminEmail.toLowerCase()}`,
                idempotency_key: `baja-admin-${registro_id}-${adminEmail.toLowerCase()}`,
              },
              { apiKey: LOVABLE_API_KEY },
            )
          }
        }
      } catch (notifyError) {
        console.error('Error notificando admins de baja:', notifyError)
      }
    }

    return json({ success: true, mensaje: 'Baja procesada exitosamente', ...resultado })
  } catch (error: any) {
    console.error('Error en gestionar-baja:', error)
    return json({ error: 'Error al procesar la baja' }, 500)
  }
})
