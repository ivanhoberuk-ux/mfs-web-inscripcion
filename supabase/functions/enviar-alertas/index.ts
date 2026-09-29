// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'
import { escapeHtml } from '../_shared/promociones.ts'
import { isCronOrSuperAdmin } from '../_shared/cron-auth.ts'
import { errorMsg, fechaAsuncion, registrarTarea } from '../_shared/monitoreo.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  try {
    if (!(await isCronOrSuperAdmin(req, supabase))) return json({ error: 'No autorizado' }, 401)

    const { data: alertas, error } = await supabase
      .from('alertas')
      .select('id, origen, titulo, detalle, created_at')
      .is('enviada_at', null)
      .order('created_at', { ascending: true })
      .limit(50)
    if (error) throw error
    if (!alertas || alertas.length === 0) return json({ ok: true, enviadas: 0 })

    const { data: ajuste } = await supabase
      .from('ajustes').select('valor').eq('clave', 'alertas_destinatarios').maybeSingle()
    const destinatarios = [...new Set(
      String(ajuste?.valor ?? '').split(',').map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@')),
    )]
    if (destinatarios.length === 0) throw new Error('Sin destinatarios en ajustes.alertas_destinatarios')

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('Falta LOVABLE_API_KEY')

    const td = 'style="padding:6px 8px;border:1px solid #ddd;vertical-align:top"'
    const filas = alertas.map((a) => `<tr>
      <td ${td}>${escapeHtml(fechaAsuncion(a.created_at))}</td>
      <td ${td}>${escapeHtml(a.origen)}</td>
      <td ${td}>${escapeHtml(a.titulo)}</td>
      <td ${td}><pre style="white-space:pre-wrap;margin:0;font-family:inherit">${escapeHtml(a.detalle ?? '')}</pre></td>
    </tr>`).join('')
    const n = alertas.length
    const html = `<div style="font-family:sans-serif;max-width:800px;margin:0 auto">
      <h2>⚠️ ${n} alerta(s) técnica(s)</h2>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead><tr style="background:#f3f4f6">
          <th ${td}>Fecha (Asunción)</th><th ${td}>Origen</th><th ${td}>Título</th><th ${td}>Detalle</th>
        </tr></thead><tbody>${filas}</tbody></table></div>`
    const text = alertas.map((a) => `[${fechaAsuncion(a.created_at)}] ${a.origen} - ${a.titulo}: ${a.detalle ?? ''}`).join('\n')
    const ids = alertas.map((a) => a.id)

    await sendLovableEmail({
      from: 'Alertas MFS <noreply@mfspy.org.py>',
      sender_domain: 'notify.mfspy.org.py',
      to: destinatarios.length === 1 ? destinatarios[0] : destinatarios,
      subject: `⚠️ MFS: ${n} alerta(s) técnica(s)`,
      html, text,
      purpose: 'transactional',
      idempotency_key: `alertas-${ids[0]}-${ids[ids.length - 1]}`,
    }, { apiKey: LOVABLE_API_KEY })

    const { error: updErr } = await supabase
      .from('alertas').update({ enviada_at: new Date().toISOString() }).in('id', ids)
    if (updErr) console.error('No se pudo marcar alertas enviadas:', updErr)

    const res = { ok: true, enviadas: n, destinatarios: destinatarios.length }
    await registrarTarea(supabase, 'enviar-alertas', true, res)
    return json(res)
  } catch (e) {
    console.error('[enviar-alertas] error:', e)
    await registrarTarea(supabase, 'enviar-alertas', false, { error: errorMsg(e) })
    return json({ ok: false, error: errorMsg(e) }, 500)
  }
})
