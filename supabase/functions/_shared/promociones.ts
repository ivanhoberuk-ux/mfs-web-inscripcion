// @ts-nocheck
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'
import { fechaAsuncion } from './monitoreo.ts'

const SENDER_DOMAIN = 'notify.mfspy.org.py'
const FROM = 'MFS Inscripciones <noreply@mfspy.org.py>'

export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export interface Promovido {
  registro_id: string
  email: string
  nombres: string
  apellidos: string
  pueblo_id: string
}

/**
 * Envía el email de promoción a los registros promovidos desde lista de espera
 * (por el trigger) que todavía no fueron notificados, y los marca como notificados.
 */
export async function notificarPromocionesPendientes(
  supabase: any,
  lovableApiKey: string | undefined | null,
  puebloId?: string,
): Promise<Promovido[]> {
  let q = supabase
    .from('registros')
    .select('id, email, nombres, apellidos, pueblo_id, promocion_vence_at, pueblos(nombre)')
    .not('promovido_at', 'is', null)
    .is('promocion_notificada_at', null)
    .is('deleted_at', null)
    .eq('estado', 'confirmado')
  if (puebloId) q = q.eq('pueblo_id', puebloId)

  const { data, error } = await q
  if (error) {
    console.error('notificarPromocionesPendientes: query error', error)
    return []
  }

  const promovidos: Promovido[] = []
  for (const r of data ?? []) {
    promovidos.push({
      registro_id: r.id,
      email: r.email,
      nombres: r.nombres,
      apellidos: r.apellidos,
      pueblo_id: r.pueblo_id,
    })

    if (!lovableApiKey || !r.email) {
      console.warn('Promoción sin notificar (sin API key o email):', r.id)
      continue
    }

    const puebloNombre = r.pueblos?.nombre || 'tu pueblo'
    const vence = r.promocion_vence_at ? fechaAsuncion(r.promocion_vence_at) : null
    const html = vence
      ? `
            <h2>¡Buenas noticias!</h2>
            <p>Hola ${escapeHtml(r.nombres)},</p>
            <p>Se ha liberado un lugar en <strong>${escapeHtml(puebloNombre)}</strong> y fuiste promovido de la lista de espera.</p>
            <p>Tenés hasta el <strong>${escapeHtml(vence)}</strong> para <strong>CONFIRMAR</strong> tu lugar. Entrá a https://mfspy.org.py con tu cuenta y tocá 'Confirmar mi lugar'. Si no confirmás a tiempo, el lugar pasa a la siguiente persona.</p>
            <p style="margin:24px 0"><a href="https://mfspy.org.py/" style="background:#0a7ea4;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">✅ Confirmar mi lugar</a></p>
          `
      : `
            <h2>¡Buenas noticias!</h2>
            <p>Hola ${escapeHtml(r.nombres)},</p>
            <p>Te informamos que se ha liberado un lugar en <strong>${escapeHtml(puebloNombre)}</strong> y has sido promovido automáticamente de la lista de espera.</p>
            <p>Tu inscripción está ahora <strong>confirmada</strong>.</p>
            <p>¡Nos vemos pronto!</p>
          `
    const text = vence
      ? `Hola ${r.nombres}. Se liberó un lugar en ${puebloNombre}. Tenés hasta el ${vence} para CONFIRMAR tu lugar. Entrá a https://mfspy.org.py con tu cuenta y tocá 'Confirmar mi lugar'. Si no confirmás a tiempo, el lugar pasa a la siguiente persona.`
      : `Hola ${r.nombres}. Se liberó un lugar en ${puebloNombre} y tu inscripción está ahora confirmada.`
    try {
      await sendLovableEmail(
        {
          from: FROM,
          sender_domain: SENDER_DOMAIN,
          to: r.email,
          subject: '¡Has sido promovido de la lista de espera!',
          html,
          text,
          purpose: 'transactional',
          idempotency_key: `promocion-${r.id}`,
        },
        { apiKey: lovableApiKey },
      )
      const { error: updErr } = await supabase
        .from('registros')
        .update({ promocion_notificada_at: new Date().toISOString() })
        .eq('id', r.id)
      if (updErr) console.error('No se pudo marcar promoción notificada:', r.id, updErr)
    } catch (e) {
      console.error('Error enviando email de promoción a', r.email, e)
    }
  }
  return promovidos
}
