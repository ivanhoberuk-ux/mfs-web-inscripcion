// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// CORS básico
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

// Schema validation for incoming webhook data
const IncomingDataSchema = z.object({
  external_id: z.string().min(1).max(255),
  nombre: z.string().max(200).optional().nullable(),
  documento: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  pueblo_id: z.string().max(255).optional().nullable(),
});

const IncomingSchema = z.object({
  event: z.enum(["created", "updated", "deleted"]),
  source: z.literal("legacy"),
  ts: z.string(),
  data: IncomingDataSchema,
});

type Incoming = z.infer<typeof IncomingSchema>;

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
      const parsed = JSON.parse(raw);
      payload = IncomingSchema.parse(parsed);
    } catch (e) {
      console.error("Validation error:", e);
      return new Response(JSON.stringify({ error: "Invalid request format", details: e.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event, source, data } = payload;
    const extId = data.external_id;

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

