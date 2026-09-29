// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2'
import { enviarEmail } from '../_shared/email.ts'
import { escapeHtml } from '../_shared/promociones.ts'
import { isCronAdminOrCoordinador } from '../_shared/cron-auth.ts'
import { alertar, errorMsg, registrarTarea } from '../_shared/monitoreo.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const MAX = 300

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  let supabase: any = null
  try {
    supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })
    let body: any = {}
    try { body = await req.json() } catch {}
    const puebloId: string | null = typeof body?.pueblo_id === 'string' && body.pueblo_id ? body.pueblo_id : null

    const auth = await isCronAdminOrCoordinador(req, supabase, puebloId)
    if (!auth.ok) return json({ ok: false, error: 'No autorizado' }, 401)

    const { data: año, error: eA } = await supabase.rpc('anio_activo')
    if (eA) throw eA

    let pq = supabase.from('seleccion_publicaciones').select('pueblo_id').eq('año', año)
    if (puebloId) pq = pq.eq('pueblo_id', puebloId)
    const { data: pubs, error: eP } = await pq
    if (eP) throw eP
    const pueblosPub = (pubs ?? []).map((p: any) => p.pueblo_id)
    if (!pueblosPub.length) {
      return json({ ok: true, enviados: 0, personas: 0, errores: 0 })
    }

    const { data: regs, error: eR } = await supabase
      .from('registros')
      .select('id, nombres, apellidos, email, seleccion, orden_suplente, pueblo_id, pueblos(nombre)')
      .in('pueblo_id', pueblosPub)
      .eq('año', año)
      .eq('estado', 'confirmado')
      .is('deleted_at', null)
      .is('seleccion_notificada_at', null)
      .not('seleccion', 'is', null)
      .order('created_at', { ascending: true })
      .limit(MAX)
    if (eR) throw eR

    const grupos = new Map<string, any[]>()
    for (const r of regs ?? []) {
      const em = String(r.email || '').trim().toLowerCase()
      if (!em) continue
      if (!grupos.has(em)) grupos.set(em, [])
      grupos.get(em)!.push(r)
    }

    let enviados = 0, personas = 0, errores = 0
    const detalleErrores: string[] = []

    for (const [email, lista] of grupos) {
      const haySel = lista.some((r) => r.seleccion === 'seleccionado')
      const subject = haySel
        ? `🎉 Misiones ${año}: ¡quedaste seleccionado/a!`
        : `Misiones ${año}: resultado de la selección`
      const bloques = lista.map((r) => {
        const nombre = escapeHtml(`${r.nombres} ${r.apellidos}`)
        const pueblo = escapeHtml(r.pueblos?.nombre ?? '')
        if (r.seleccion === 'seleccionado') {
          return `<div style="padding:12px;border-radius:8px;background:#dcfce7;margin:10px 0">
            <p style="margin:0"><strong>${nombre}</strong>: ¡Fuiste seleccionado/a para misionar en <strong>${pueblo}</strong> ${año}! 🙏</p>
            <p style="margin:6px 0 0">Recordá completar todos tus documentos en <a href="https://mfspy.org.py">mfspy.org.py</a>.</p>
          </div>`
        }
        return `<div style="padding:12px;border-radius:8px;background:#fef3c7;margin:10px 0">
          <p style="margin:0"><strong>${nombre}</strong>: Quedaste como suplente N° ${escapeHtml(r.orden_suplente ?? '—')} en <strong>${pueblo}</strong>. Si se libera un lugar te vamos a avisar por email.</p>
        </div>`
      }).join('')
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#0a7ea4">Misiones ${año} · Selección de misioneros</h2>
        <p>Hola 👋, te compartimos el resultado de la selección:</p>
        ${bloques}
        ${haySel ? `<p><a href="https://mfspy.org.py" style="display:inline-block;background:#0a7ea4;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Entrar a mfspy.org.py</a></p>` : ''}
        <p style="color:#666;font-size:12px">MFS Paraguay</p>
      </div>`
      const text = lista.map((r) => r.seleccion === 'seleccionado'
        ? `${r.nombres} ${r.apellidos}: ¡Fuiste seleccionado/a para misionar en ${r.pueblos?.nombre} ${año}! Completá tus documentos en https://mfspy.org.py`
        : `${r.nombres} ${r.apellidos}: Quedaste como suplente N° ${r.orden_suplente ?? '—'} en ${r.pueblos?.nombre}. Si se libera un lugar te vamos a avisar por email.`
      ).join('\n')

      try {
        await enviarEmail({
          to: email, subject, html, text,
          idempotencyKey: `seleccion-${año}-${lista.map((r) => r.id).sort().join('').slice(0, 60)}`,
        })
        const ids = lista.map((r) => r.id)
        const { error: eU } = await supabase.from('registros')
          .update({ seleccion_notificada_at: new Date().toISOString() }).in('id', ids)
        if (eU) throw eU
        enviados++
        personas += lista.length
      } catch (e) {
        errores++
        detalleErrores.push(`${email}: ${errorMsg(e)}`)
        console.error('notificar-seleccion envío', email, e)
      }
    }

    const resumen = { enviados, personas, errores, pueblo_id: puebloId, año, por: auth.tipo }
    await registrarTarea(supabase, 'notificar-seleccion', errores === 0, { ...resumen, detalle_errores: detalleErrores.slice(0, 20) })
    if (errores > 0) {
      await alertar(supabase, 'edge:notificar-seleccion', 'Errores enviando avisos de selección',
        detalleErrores.slice(0, 20).join('\n'), 'edge:notificar-seleccion')
    }
    return json({ ok: true, enviados, personas, errores })
  } catch (e) {
    const msg = errorMsg(e)
    console.error('notificar-seleccion error:', e)
    await registrarTarea(supabase, 'notificar-seleccion', false, { error: msg })
    await alertar(supabase, 'edge:notificar-seleccion', 'Falló notificar-seleccion', msg, 'edge:notificar-seleccion')
    return json({ ok: false, error: msg }, 500)
  }
})
