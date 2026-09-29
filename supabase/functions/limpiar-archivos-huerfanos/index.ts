// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isCronOrSuperAdmin } from '../_shared/cron-auth.ts'
import { alertar, errorMsg, registrarTarea } from '../_shared/monitoreo.ts'

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

    // cron → x-cron-secret presente (y válido, ya verificado arriba si fue por esa vía)
    let esCron = false
    const secret = req.headers.get('x-cron-secret')
    if (secret) {
      const { data } = await supabase.rpc('verify_cron_secret', { p_secret: secret })
      esCron = data === true
    }
    let body: any = {}
    try { body = await req.json() } catch { body = {} }
    const dryRun = typeof body?.dryRun === 'boolean' ? body.dryRun : !esCron

    const { data: lista, error } = await supabase.rpc('listar_archivos_huerfanos', { p_limite: 1000 })
    if (error) throw error
    const archivos = (lista ?? []) as Array<{ name: string; size: number }>
    const bytes = archivos.reduce((s, a) => s + Number(a.size || 0), 0)
    const mb = Math.round((bytes / 1024 / 1024) * 100) / 100

    let borrados = 0
    const errores: string[] = []
    if (!dryRun) {
      const nombres = archivos.map((a) => a.name)
      for (let i = 0; i < nombres.length; i += 100) {
        const lote = nombres.slice(i, i + 100)
        const { data, error: rmErr } = await supabase.storage.from('documentos').remove(lote)
        if (rmErr) errores.push(rmErr.message)
        else borrados += data?.length ?? lote.length
      }
    }

    const res = { archivos: archivos.length, mb, borrados, dryRun, errores: errores.slice(0, 5) }
    await registrarTarea(supabase, 'limpiar-archivos-huerfanos', errores.length === 0, res)
    if (errores.length) {
      await alertar(supabase, 'edge:limpiar-archivos-huerfanos', 'Errores borrando archivos huérfanos',
        errores.join('\n'), 'edge:limpiar-archivos-huerfanos')
    }
    return json(res)
  } catch (e) {
    const msg = errorMsg(e)
    console.error('[limpiar-archivos-huerfanos] error:', e)
    await registrarTarea(supabase, 'limpiar-archivos-huerfanos', false, { error: msg })
    await alertar(supabase, 'edge:limpiar-archivos-huerfanos', 'Falló limpiar-archivos-huerfanos', msg, 'edge:limpiar-archivos-huerfanos')
    return json({ ok: false, error: msg }, 500)
  }
})
