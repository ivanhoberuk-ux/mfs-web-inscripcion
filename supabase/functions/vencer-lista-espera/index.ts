// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendLovableEmail } from "npm:@lovable.dev/email-js";

const SENDER_DOMAIN = "notify.mfspy.org.py";
const FROM_DOMAIN = "mfspy.org.py";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: cron secret OR super_admin JWT
    const cronSecret = Deno.env.get("CRON_SECRET");
    const reqCronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    let authenticated = false;
    if (cronSecret && reqCronSecret && cronSecret === reqCronSecret) {
      authenticated = true;
    }
    if (!authenticated && authHeader) {
      const c = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await c.auth.getUser(token);
      if (user) {
        const { data: isAdmin } = await c.rpc("is_super_admin", { _user_id: user.id });
        if (isAdmin) authenticated = true;
      }
    }
    if (!authenticated) {
      return new Response(JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Cancel all expired waitlist registros
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
      try {
        const html = `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
  <h2 style="color: #0a7ea4;">⏳ Tu lugar en la lista de espera venció</h2>
  <p>Hola <strong>${r.nombres} ${r.apellidos}</strong>,</p>
  <p>Te avisamos que se cumplió la fecha límite para mantener tu lugar en la <strong>lista de espera del pueblo ${r.pueblo_nombre}</strong> para la misión ${r.año}.</p>
  <p>Tu inscripción en lista de espera fue dada de baja automáticamente, pero <strong>ahora podés volver a inscribirte en cualquier otro pueblo que aún tenga cupo disponible</strong>. 🎉</p>
  <p style="margin: 24px 0;">
    <a href="https://mfspy.org.py/pueblos" style="background: #0a7ea4; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">
      🏠 Ver pueblos con cupo
    </a>
  </p>
  <p style="color: #6b7280; font-size: 13px;">Si no querés volver a inscribirte, podés ignorar este mensaje.</p>
  <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">— Movimiento Familias de Schoenstatt Paraguay</p>
</body></html>`;

        await sendLovableEmail({
          apiKey: LOVABLE_API_KEY,
          senderDomain: SENDER_DOMAIN,
          from: `Misiones MFS <noreply@${FROM_DOMAIN}>`,
          to: r.email,
          subject: `⏳ Tu lugar en lista de espera venció — ${r.pueblo_nombre}`,
          html,
        });
        enviados++;
      } catch (e) {
        fallos++;
        errores.push(`${r.email}: ${(e as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        cancelados: list.length,
        emails_enviados: enviados,
        emails_fallidos: fallos,
        errores: errores.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[vencer-lista-espera] error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
