// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendLovableEmail } from "npm:@lovable.dev/email-js";
import { escapeHtml, notificarPromocionesPendientes } from "../_shared/promociones.ts";
import { isCronOrSuperAdmin } from "../_shared/cron-auth.ts";

const SENDER_DOMAIN = "notify.mfspy.org.py";
const FROM_DOMAIN = "mfspy.org.py";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!(await isCronOrSuperAdmin(req, supabase))) {
      return json({ error: "No autorizado" }, 401);
    }

    const { data: afectados, error } = await supabase.rpc("vencer_listas_espera");
    if (error) throw error;

    const list = (afectados ?? []) as Array<{
      id: string; email: string; nombres: string; apellidos: string;
      pueblo_id: string; pueblo_nombre: string; año: number;
    }>;

    let enviados = 0;
    let fallos = 0;
    const errores: string[] = [];

    for (const r of list) {
      if (!LOVABLE_API_KEY || !r.email) { fallos++; continue; }
      try {
        const html = `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
  <h2 style="color: #0a7ea4;">⏳ Tu lugar en la lista de espera venció</h2>
  <p>Hola <strong>${escapeHtml(r.nombres)} ${escapeHtml(r.apellidos)}</strong>,</p>
  <p>Te avisamos que se cumplió la fecha límite para mantener tu lugar en la <strong>lista de espera del pueblo ${escapeHtml(r.pueblo_nombre)}</strong> para la misión ${escapeHtml(r.año)}.</p>
  <p>Tu inscripción en lista de espera fue dada de baja automáticamente, pero <strong>ahora podés volver a inscribirte en cualquier otro pueblo que aún tenga cupo disponible</strong>. 🎉</p>
  <p style="margin: 24px 0;">
    <a href="https://mfspy.org.py/pueblos" style="background: #0a7ea4; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">
      🏠 Ver pueblos con cupo
    </a>
  </p>
  <p style="color: #6b7280; font-size: 13px;">Si no querés volver a inscribirte, podés ignorar este mensaje.</p>
  <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">— Movimiento Familias de Schoenstatt Paraguay</p>
</body></html>`;

        await sendLovableEmail(
          {
            to: r.email,
            from: `Misiones MFS <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: `⏳ Tu lugar en lista de espera venció — ${r.pueblo_nombre}`,
            html,
            text: `Hola ${r.nombres} ${r.apellidos}. Venció tu lugar en la lista de espera del pueblo ${r.pueblo_nombre}. Podés inscribirte en otro pueblo con cupo: https://mfspy.org.py/pueblos`,
            purpose: "transactional",
            idempotency_key: `lista-vencida-${r.id}`,
          },
          { apiKey: LOVABLE_API_KEY },
        );
        enviados++;
      } catch (e) {
        fallos++;
        errores.push(`${r.email}: ${(e as Error).message}`);
      }
    }

    const promovidos = await notificarPromocionesPendientes(supabase, LOVABLE_API_KEY);

    return json({
      ok: true,
      cancelados: list.length,
      emails_enviados: enviados,
      emails_fallidos: fallos,
      errores: errores.slice(0, 10),
      promociones_notificadas: promovidos.length,
    });
  } catch (e) {
    console.error("[vencer-lista-espera] error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
