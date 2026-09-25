// @ts-nocheck
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'

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
    .select('id, email, nombres, apellidos, pueblo_id, pueblos(nombre)')
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
    try {
      await sendLovableEmail(
        {
          from: FROM,
          sender_domain: SENDER_DOMAIN,
          to: r.email,
          subject: '¡Has sido promovido de la lista de espera!',
          html: `
            <h2>¡Buenas noticias!</h2>
            <p>Hola ${escapeHtml(r.nombres)},</p>
            <p>Te informamos que se ha liberado un lugar en <strong>${escapeHtml(puebloNombre)}</strong> y has sido promovido automáticamente de la lista de espera.</p>
            <p>Tu inscripción está ahora <strong>confirmada</strong>.</p>
            <p>¡Nos vemos pronto!</p>
          `,
          text: `Hola ${r.nombres}. Se liberó un lugar en ${puebloNombre} y tu inscripción está ahora confirmada.`,
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
