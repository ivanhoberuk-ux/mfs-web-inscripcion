// MCP server for MFS Paraguay (hand-authored — no Vite plugin because the
// project builds with Expo/Metro, not Vite). Exposes read-only public tools
// so external assistants (ChatGPT/Claude/Cursor/etc.) can query pueblo
// availability and inscription info.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { defineMcp, defineTool } from "npm:@lovable.dev/mcp-js@0.20.0";
import { createSupabaseHandler } from "npm:@lovable.dev/mcp-js@0.20.0/stacks/supabase";
import { z } from "npm:zod@3.23.8";

function sb() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

const listPueblos = defineTool({
  name: "list_pueblos",
  title: "Listar pueblos",
  description:
    "Lista todos los pueblos de MFS Paraguay con su cupo máximo, cantidad de inscriptos confirmados, personas en lista de espera y cupos libres para el año en curso.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const { data, error } = await sb()
      .from("vw_ocupacion")
      .select("id,nombre,cupo_max,activo,usados,en_espera,libres,menores,total_personas")
      .order("nombre");
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { pueblos: data ?? [] },
    };
  },
});

const getPueblo = defineTool({
  name: "get_pueblo",
  title: "Detalle de un pueblo",
  description:
    "Obtiene el detalle de ocupación de un pueblo específico buscando por nombre (coincidencia parcial, insensible a mayúsculas).",
  inputSchema: {
    nombre: z.string().min(1).describe("Nombre o parte del nombre del pueblo"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ nombre }) => {
    const { data, error } = await sb()
      .from("vw_ocupacion")
      .select("id,nombre,cupo_max,activo,usados,en_espera,libres,menores,total_personas")
      .ilike("nombre", `%${nombre}%`);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    if (!data || data.length === 0)
      return { content: [{ type: "text", text: `No se encontró ningún pueblo con "${nombre}".` }] };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { matches: data },
    };
  },
});

const getInscripcionEstado = defineTool({
  name: "get_inscripcion_estado",
  title: "Estado de las inscripciones",
  description:
    "Devuelve el estado global de las inscripciones para el año en curso: total de cupos, confirmados, en lista de espera y libres a través de todos los pueblos activos.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const { data, error } = await sb()
      .from("vw_ocupacion")
      .select("cupo_max,usados,en_espera,libres,activo")
      .eq("activo", true);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    const totals = (data ?? []).reduce(
      (acc, r: any) => ({
        cupo_max: acc.cupo_max + (r.cupo_max ?? 0),
        usados: acc.usados + (r.usados ?? 0),
        en_espera: acc.en_espera + (r.en_espera ?? 0),
        libres: acc.libres + (r.libres ?? 0),
      }),
      { cupo_max: 0, usados: 0, en_espera: 0, libres: 0 },
    );
    return {
      content: [{ type: "text", text: JSON.stringify(totals, null, 2) }],
      structuredContent: totals,
    };
  },
});

const mcp = defineMcp({
  name: "mfs-paraguay-mcp",
  title: "MFS Paraguay",
  version: "0.1.0",
  instructions:
    "Herramientas de solo lectura para consultar disponibilidad de cupos e inscripciones de las Misiones Familiares de Schoenstatt Paraguay. Usá list_pueblos para ver todos los pueblos, get_pueblo para buscar uno y get_inscripcion_estado para totales globales.",
  tools: [listPueblos, getPueblo, getInscripcionEstado],
});

Deno.serve(createSupabaseHandler(mcp, { functionName: "mcp" }));
