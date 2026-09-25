// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendLovableEmail } from "npm:@lovable.dev/email-js";
import { escapeHtml } from "../_shared/promociones.ts";
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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!(await isCronOrSuperAdmin(req, supabase))) {
      return json({ error: "No autorizado" }, 401);
    }

    // Configuración activa
    const { data: config } = await supabase
      .from("configuracion_inscripcion")
      .select("año, modo")
      .eq("activo", true)
      .maybeSingle();
    if (!config || config.modo !== "mision") {
      return json({ ok: true, skipped: "modo institucional" });
    }

    const today = new Date().toISOString().split("T")[0];

    // 1. Registros confirmados del año (paginado)
    const registros: any[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("registros")
        .select("id, nombres, apellidos, email, pueblo_id, documentos_faltantes")
        .is("deleted_at", null)
        .eq("estado", "confirmado")
        .eq("año", config.año)
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      registros.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }

    const pendientes = registros
      .filter((r) => Array.isArray(r.documentos_faltantes) && r.documentos_faltantes.length > 0)
      .map((r) => ({ ...r, pendientes: r.documentos_faltantes as string[] }));

    // 2. Logs ya enviados hoy
    const { data: sentLogs } = await supabase
      .from("email_reminder_logs")
      .select("registro_id, pueblo_id, tipo")
      .eq("fecha_envio", today);
    const sentIndividual = new Set(
      (sentLogs || []).filter((l) => l.tipo === "individual").map((l) => l.registro_id),
    );
    const sentSummary = new Set(
      (sentLogs || []).filter((l) => l.tipo === "summary").map((l) => l.pueblo_id),
    );

    // 3. Agrupar por email (un solo email por dirección)
    const byEmail = new Map<string, any[]>();
    for (const r of pendientes) {
      if (!r.email || sentIndividual.has(r.id)) continue;
      const key = r.email.trim().toLowerCase();
      if (!byEmail.has(key)) byEmail.set(key, []);
      byEmail.get(key)!.push(r);
    }

    let emailsSent = 0;
    const logInserts: any[] = [];

    for (const [email, personas] of byEmail) {
      const varios = personas.length > 1;
      const bloques = personas
        .map(
          (p) => `
          <p style="margin:12px 0 4px"><strong>${escapeHtml(p.nombres)} ${escapeHtml(p.apellidos)}</strong></p>
          <ul style="margin:0">${p.pendientes.map((d: string) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`,
        )
        .join("");
      const saludo = varios ? "¡Hola!" : `¡Hola ${escapeHtml(personas[0].nombres)}!`;
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <p>${saludo} 😊</p>
          <p>Te recordamos (con cariño 😄) que aún nos faltan algunos documentos para completar ${varios ? "estas inscripciones" : "tu inscripción"}.</p>
          <p><strong>Pendientes:</strong></p>
          ${bloques}
          <p>Es súper importante que los envíes cuanto antes para asegurar tu lugar y ayudarnos a organizar todo.</p>
          <p>Si ya los enviaste hoy, podés ignorar este mensaje 🙌</p>
          <p>Cualquier duda, respondé este correo y te ayudamos.</p>
          <p>¡Gracias y qué alegría tenerte con nosotros! 💚</p>
        </div>`;
      const text = personas
        .map((p) => `${p.nombres} ${p.apellidos}: ${p.pendientes.join(", ")}`)
        .join("\n");

      try {
        await sendLovableEmail(
          {
            from: `Misiones Familiares <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            to: email,
            subject: "Misiones Familiares: te faltan documentos por completar ✅",
            html,
            text: `Te recordamos que faltan estos documentos:\n${text}`,
            purpose: "transactional",
            unsubscribe_token: `doc-reminder-${email}`,
            idempotency_key: `doc-reminder-${email}-${today}`,
          },
          { apiKey: LOVABLE_API_KEY },
        );
        emailsSent++;
        for (const p of personas) {
          logInserts.push({
            registro_id: p.id,
            email_destino: email,
            tipo: "individual",
            pueblo_id: p.pueblo_id,
            fecha_envio: today,
          });
        }
      } catch (e) {
        console.error(`Failed to send email to ${email}:`, e);
      }
      await delay(600);
    }

    // 4. Resúmenes por pueblo
    const byPueblo: Record<string, any[]> = {};
    for (const r of pendientes) (byPueblo[r.pueblo_id] ||= []).push(r);
    const puebloIds = Object.keys(byPueblo);
    let summariesSent = 0;

    if (puebloIds.length > 0) {
      const { data: pueblos } = await supabase
        .from("pueblos").select("id, nombre").in("id", puebloIds);
      const puebloNameMap: Record<string, string> = {};
      for (const p of pueblos || []) puebloNameMap[p.id] = p.nombre;

      // Admins de pueblo
      const { data: puebloAdmins } = await supabase
        .from("profiles")
        .select("id, email, pueblo_id, user_roles!inner(role)")
        .in("pueblo_id", puebloIds)
        .in("user_roles.role", ["pueblo_admin", "co_admin_pueblo"]);

      // Super admins (independiente del pueblo del perfil)
      const { data: superRoles } = await supabase
        .from("user_roles").select("user_id").eq("role", "admin");
      const superIds = [...new Set((superRoles || []).map((r) => r.user_id))];
      let superAdminEmails: string[] = [];
      if (superIds.length > 0) {
        const { data: superProfiles } = await supabase
          .from("profiles").select("email").in("id", superIds);
        superAdminEmails = (superProfiles || []).map((p) => p.email).filter(Boolean);
      }

      for (const puebloId of puebloIds) {
        if (sentSummary.has(puebloId)) continue;
        const puebloNombre = puebloNameMap[puebloId] || "Pueblo";
        const items = byPueblo[puebloId];

        const td = 'style="padding:4px 8px;border:1px solid #ddd"';
        const tableRows = items
          .map(
            (r) =>
              `<tr><td ${td}>${escapeHtml(r.nombres)} ${escapeHtml(r.apellidos)}</td><td ${td}>${escapeHtml(r.email || "-")}</td><td ${td}>${escapeHtml(r.pendientes.join(", "))}</td></tr>`,
          )
          .join("");

        const summaryHtml = `
          <div style="font-family:sans-serif;max-width:700px;margin:0 auto">
            <p>Hola 😊</p>
            <p>Resumen de inscriptos de <strong>${escapeHtml(puebloNombre)}</strong> con documentos pendientes:</p>
            <table style="border-collapse:collapse;width:100%">
              <thead><tr style="background:#f3f4f6">
                <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Nombre</th>
                <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Email</th>
                <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Pendientes</th>
              </tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
            <p><strong>Total pendientes: ${items.length}</strong></p>
            <p>Gracias por el apoyo para cerrar estas inscripciones a tiempo 💚</p>
          </div>`;

        const recipients = [
          ...new Set(
            [
              ...(puebloAdmins || []).filter((a) => a.pueblo_id === puebloId).map((a) => a.email),
              ...superAdminEmails,
            ]
              .filter(Boolean)
              .map((e: string) => e.toLowerCase()),
          ),
        ];

        let sentForPueblo = 0;
        for (const to of recipients) {
          try {
            await sendLovableEmail(
              {
                from: `Misiones Familiares <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                to,
                subject: `Resumen diario: documentos pendientes – ${puebloNombre}`,
                html: summaryHtml,
                text: `Resumen diario de documentos pendientes en ${puebloNombre}. Total pendientes: ${items.length}.`,
                purpose: "transactional",
                unsubscribe_token: `doc-summary-${to}`,
                idempotency_key: `doc-summary-${puebloId}-${to}-${today}`,
              },
              { apiKey: LOVABLE_API_KEY },
            );
            summariesSent++;
            sentForPueblo++;
          } catch (e) {
            console.error(`Failed to send summary for ${puebloNombre} to ${to}:`, e);
          }
          await delay(600);
        }
        if (sentForPueblo > 0) {
          logInserts.push({
            registro_id: items[0].id,
            email_destino: recipients.join(", "),
            tipo: "summary",
            pueblo_id: puebloId,
            fecha_envio: today,
          });
        }
      }
    }

    if (logInserts.length > 0) {
      const { error: logErr } = await supabase.from("email_reminder_logs").insert(logInserts);
      if (logErr) console.error("Error inserting logs:", logErr);
    }

    return json({
      ok: true,
      año: config.año,
      pendientes: pendientes.length,
      emailsSent,
      summariesSent,
      logsInserted: logInserts.length,
    });
  } catch (error: any) {
    console.error("daily-doc-reminders error:", error);
    return json({ ok: false, error: error.message }, 500);
  }
});
