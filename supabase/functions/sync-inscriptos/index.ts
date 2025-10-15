// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// CORS básico
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

type Incoming = {
  event: "created" | "updated" | "deleted";
  source: "legacy";
  ts: string; // ISO8601
  data: {
    external_id: string;
    nombre?: string | null;
    documento?: string | null;
    email?: string | null;
    telefono?: string | null;
    pueblo_id?: string | null; // id final o legacy (si usás map)
    // ...otros campos si hacen falta
  };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET")!; // secreto compartido

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// HMAC-SHA256 base64 del body
async function verifySignature(req: Request, rawBody: string) {
  const sig = req.headers.get("x-signature") ?? "";
  if (!sig) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  // La otra web debe enviar base64 del HMAC del body tal cual
  const provided = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify({ name: "HMAC" }, key, provided, enc.encode(rawBody));
  return ok;
}

async function resolvePuebloId(input: string | null | undefined) {
  if (!input) return null;

  // Caso 1: ya te mandan el UUID final
  if (/^[0-9a-f-]{36}$/i.test(input)) return input;

  // Caso 2: es un legacy_id → buscá el mapeo
  const { data, error } = await supabase
    .from("map_pueblos_legacy")
    .select("pueblo_id")
    .eq("legacy_id", input)
    .maybeSingle();

  if (error) throw error;
  return data?.pueblo_id ?? null; // si no hay mapeo, guardamos null y luego revisás pendientes
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.text();
    if (!(await verifySignature(req, raw))) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: Incoming;
    try {
      payload = JSON.parse(raw);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event, source, data } = payload;
    const extId = data.external_id;
    if (!extId) {
      return new Response(JSON.stringify({ error: "external_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "deleted") {
      const { error } = await supabase
        .from("registros")
        .update({ deleted_at: new Date().toISOString() })
        .eq("source", source)
        .eq("external_id", extId);
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // created | updated
    const pueblo_id = await resolvePuebloId(data.pueblo_id);

    const upsertPayload: any = {
      external_id: extId,
      source,
      nombre: data.nombre ?? null,
      documento: data.documento ?? null,
      email: data.email ?? null,
      telefono: data.telefono ?? null,
      pueblo_id,
      deleted_at: null, // revive si estaba borrado
      // ...otros campos mapeados
    };

    const { error } = await supabase
      .from("registros")
      .upsert(upsertPayload, { onConflict: "source,external_id" });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

