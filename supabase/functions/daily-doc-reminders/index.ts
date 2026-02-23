// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // --- Authentication: verify cron secret OR valid admin JWT ---
    const cronSecret = Deno.env.get("CRON_SECRET");
    const reqCronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");

    let authenticated = false;

    // Option 1: Cron secret header (for pg_cron calls)
    if (cronSecret && reqCronSecret && cronSecret === reqCronSecret) {
      authenticated = true;
    }

    // Option 2: Valid admin JWT (for manual invocation)
    if (!authenticated && authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const authClient = createClient(supabaseUrl, supabaseKey);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await authClient.auth.getUser(token);
      if (user) {
        const { data: isAdmin } = await authClient.rpc("is_super_admin", { _user_id: user.id });
        if (isAdmin) authenticated = true;
      }
    }

    if (!authenticated) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date().toISOString().split("T")[0];

    // 1. Fetch active registrations with pending documents
    const { data: registros, error: regErr } = await supabase
      .from("registros")
      .select("id, nombres, apellidos, email, nacimiento, pueblo_id, autorizacion_url, ficha_medica_url, firma_url")
      .is("deleted_at", null)
      .eq("estado", "confirmado");

    if (regErr) throw regErr;

    // 2. Get already-sent logs for today
    const { data: sentLogs } = await supabase
      .from("email_reminder_logs")
      .select("registro_id, tipo")
      .eq("fecha_envio", today);

    const sentSet = new Set((sentLogs || []).map((l) => `${l.registro_id}:${l.tipo}`));

    // Helper: calculate age
    function getAge(nacimiento: string | null): number | null {
      if (!nacimiento) return null;
      const d = new Date(nacimiento);
      if (isNaN(d.getTime())) return null;
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
      return age;
    }

    // Helper: get pending documents
    function getPendientes(r: any): string[] {
      const age = getAge(r.nacimiento);
      const isAdult = age === null || age >= 18;
      const pendientes: string[] = [];
      if (!r.firma_url) pendientes.push("Firma");
      if (isAdult) {
        if (!r.autorizacion_url) pendientes.push("Aceptación de Protocolo");
      } else {
        if (!r.ficha_medica_url) pendientes.push("Permiso del Menor (Ficha Médica)");
      }
      return pendientes;
    }

    // 3. Filter registrations with pending docs
    const pendientes: any[] = [];
    for (const r of registros || []) {
      const docs = getPendientes(r);
      if (docs.length > 0) {
        pendientes.push({ ...r, pendientes: docs });
      }
    }

    // Helper: delay to respect Resend rate limits (2 req/sec)
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // 4. Send individual emails
    let emailsSent = 0;
    const logInserts: any[] = [];

    for (const r of pendientes) {
      if (!r.email) continue;
      const key = `${r.id}:individual`;
      if (sentSet.has(key)) continue;

      const listaHtml = r.pendientes.map((p: string) => `<li>${p}</li>`).join("");
      const body = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <p>¡Hola ${r.nombres}! 😊</p>
          <p>Te recordamos (con cariño 😄) que aún nos faltan algunos documentos para completar tu inscripción.</p>
          <p><strong>Pendientes:</strong></p>
          <ul>${listaHtml}</ul>
          <p>Es súper importante que los envíes cuanto antes para asegurar tu lugar y ayudarnos a organizar todo.</p>
          <p>Si ya los enviaste hoy, podés ignorar este mensaje 🙌</p>
          <p>Cualquier duda, respondé este correo y te ayudamos.</p>
          <p>¡Gracias y qué alegría tenerte con nosotros! 💚</p>
        </div>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Misiones Familiares <onboarding@resend.dev>",
          to: [r.email],
          subject: "Misiones Familiares: te faltan documentos por completar ✅",
          html: body,
        }),
      });

      if (res.ok) {
        emailsSent++;
        logInserts.push({
          registro_id: r.id,
          email_destino: r.email,
          tipo: "individual",
          pueblo_id: r.pueblo_id,
          fecha_envio: today,
        });
      } else {
        console.error(`Failed to send email to ${r.email}:`, await res.text());
      }
      // Rate limit: wait 600ms between emails
      await delay(600);
    }

    // 5. Group by pueblo for admin summary
    const byPueblo: Record<string, any[]> = {};
    for (const r of pendientes) {
      if (!byPueblo[r.pueblo_id]) byPueblo[r.pueblo_id] = [];
      byPueblo[r.pueblo_id].push(r);
    }

    // 6. Get pueblo names and admin emails
    const puebloIds = Object.keys(byPueblo);
    let summariesSent = 0;

    if (puebloIds.length > 0) {
      const { data: pueblos } = await supabase
        .from("pueblos")
        .select("id, nombre")
        .in("id", puebloIds);

      const puebloNameMap: Record<string, string> = {};
      for (const p of pueblos || []) puebloNameMap[p.id] = p.nombre;

      // Find admin emails for each pueblo
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("id, email, pueblo_id")
        .in("pueblo_id", puebloIds);

      // Check which are pueblo_admin or co_admin
      const adminUserIds = (adminProfiles || []).map((p) => p.id);
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", adminUserIds)
        .in("role", ["pueblo_admin", "co_admin_pueblo", "admin"]);

      const adminRoleSet = new Set((adminRoles || []).map((r) => r.user_id));

      for (const puebloId of puebloIds) {
        // Check if summary already sent for this pueblo today
        const alreadySent = sentSet.has(`${puebloId}:summary`);
        if (alreadySent) continue;

        const puebloNombre = puebloNameMap[puebloId] || "Pueblo";
        const items = byPueblo[puebloId];

        // Build table
        const tableRows = items
          .map(
            (r: any) =>
              `<tr><td style="padding:4px 8px;border:1px solid #ddd">${r.nombres} ${r.apellidos}</td><td style="padding:4px 8px;border:1px solid #ddd">${r.email || "-"}</td><td style="padding:4px 8px;border:1px solid #ddd">${r.pendientes.join(", ")}</td></tr>`
          )
          .join("");

        const summaryHtml = `
          <div style="font-family:sans-serif;max-width:700px;margin:0 auto">
            <p>Hola 😊</p>
            <p>Resumen de inscriptos de <strong>${puebloNombre}</strong> con documentos pendientes:</p>
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
          </div>
        `;

        // Find admins for this pueblo
        const adminsForPueblo = (adminProfiles || []).filter(
          (p) => p.pueblo_id === puebloId && adminRoleSet.has(p.id)
        );

        // Also send to super admins (admins with role 'admin')
        const superAdminEmails: string[] = [];
        for (const ar of adminRoles || []) {
          if (ar.role === "admin") {
            const profile = (adminProfiles || []).find((p) => p.id === ar.user_id);
            if (profile?.email) superAdminEmails.push(profile.email);
          }
        }

        const recipientEmails = [
          ...new Set([
            ...adminsForPueblo.map((a) => a.email),
            ...superAdminEmails,
          ]),
        ].filter(Boolean);

        if (recipientEmails.length > 0) {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Misiones Familiares <onboarding@resend.dev>",
              to: recipientEmails,
              subject: `Resumen diario: documentos pendientes – ${puebloNombre}`,
              html: summaryHtml,
            }),
          });

          if (res.ok) {
            summariesSent++;
            // Log one entry per pueblo summary
            logInserts.push({
              registro_id: items[0].id, // reference first registro
              email_destino: recipientEmails.join(", "),
              tipo: "summary",
              pueblo_id: puebloId,
              fecha_envio: today,
            });
          } else {
            console.error(`Failed to send summary for ${puebloNombre}:`, await res.text());
          }
          await delay(600);
        }
      }
    }

    // 7. Insert logs
    if (logInserts.length > 0) {
      const { error: logErr } = await supabase
        .from("email_reminder_logs")
        .insert(logInserts);
      if (logErr) console.error("Error inserting logs:", logErr);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        pendientes: pendientes.length,
        emailsSent,
        summariesSent,
        logsInserted: logInserts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("daily-doc-reminders error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
