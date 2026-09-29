// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2'

function serviceClient(supabase?: any) {
  if (supabase) return supabase
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export function errorMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in (e as any)) return String((e as any).message)
  return String(e)
}

/** Inserta en tareas_log. Nunca lanza. */
export async function registrarTarea(supabase: any, tarea: string, ok: boolean, detalle: unknown) {
  try {
    const c = serviceClient(supabase)
    if (!c) return
    const { error } = await c.from('tareas_log').insert({ tarea, ok, detalle: detalle ?? null })
    if (error) console.error('registrarTarea error:', error)
  } catch (e) {
    console.error('registrarTarea excepción:', e)
  }
}

/** Crea una alerta vía RPC crear_alerta. Nunca lanza. Si supabase es null crea un cliente service role. */
export async function alertar(supabase: any, origen: string, titulo: string, detalle: string, clave?: string) {
  try {
    const c = serviceClient(supabase)
    if (!c) return
    const { error } = await c.rpc('crear_alerta', {
      p_origen: origen,
      p_titulo: titulo,
      p_detalle: String(detalle ?? '').slice(0, 4000),
      p_clave: clave ?? null,
    })
    if (error) console.error('alertar error:', error)
  } catch (e) {
    console.error('alertar excepción:', e)
  }
}

export function fechaAsuncion(iso: string | Date): string {
  return new Date(iso).toLocaleString('es-PY', {
    timeZone: 'America/Asuncion',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}
