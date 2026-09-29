// FILE: src/lib/torneo.ts
// Capa de datos del Torneo Interpueblos (fútbol, vóley, básquet)
import { supabase } from './supabase';

// ---------- Tipos ----------
export type TorneoEdicion = {
  id: string;
  nombre: string;
  anio: number;
  activo: boolean;
  descripcion: string | null;
  visible_en_inicio?: boolean;
  inscripcion_equipos_desde?: string | null;
  inscripcion_equipos_hasta?: string | null;
  finalizada?: boolean;
};

export async function setEdicionVisibleEnInicio(id: string, visible: boolean) {
  const { error } = await supabase
    .from('torneo_ediciones')
    .update({ visible_en_inicio: visible } as any)
    .eq('id', id);
  if (error) throw error;
}

export type TorneoDisciplina = {
  id: string;
  edicion_id: string;
  codigo: string;
  nombre: string;
  emoji: string;
  activa: boolean;
  canchas_compartidas_con?: string | null;
  cantidad_canchas: number;
  duracion_min: number;
  tiempo_min: number;
  entretiempo_min: number;
  buffer_min: number;

  num_zonas: number;
  clasifican_por_zona: number;
  usa_sets: boolean;
  permite_empate: boolean;
  puntos_victoria: number;
  puntos_empate: number;
  puntos_derrota: number;
  orden: number;
};

export type TorneoCancha = {
  id: string;
  disciplina_id: string;
  nombre: string;
  orden: number;
};

export type TorneoBloque = {
  id: string;
  edicion_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  etiqueta: string | null;
};

export type TorneoEquipo = {
  id: string;
  disciplina_id: string;
  pueblo_id: string;
  nombre: string | null;
  zona: string | null;
  activo: boolean;
  estado_inscripcion: 'pendiente' | 'aprobado' | 'rechazado';
  inscripto_por?: string | null;
  motivo_rechazo?: string | null;
  pueblo?: { nombre: string } | null;
};

export type TorneoPartido = {
  id: string;
  disciplina_id: string;
  fase: string;
  fase_orden: number;
  zona: string | null;
  ronda: number;
  equipo_a_id: string | null;
  equipo_b_id: string | null;
  etiqueta_a: string | null;
  etiqueta_b: string | null;
  cancha_id: string | null;
  inicio: string | null;
  fin: string | null;
  estado: string;
  marcador_a: number | null;
  marcador_b: number | null;
  detalle_sets: string | null;
  mvp_nombre: string | null;
  observaciones: string | null;
  penales_a: number | null;
  penales_b: number | null;
  updated_at?: string;
  equipo_a?: { id: string; nombre: string | null; pueblo?: { nombre: string } | null } | null;
  equipo_b?: { id: string; nombre: string | null; pueblo?: { nombre: string } | null } | null;
  cancha?: { nombre: string } | null;
};

export type TorneoFilaTabla = {
  equipo_id: string;
  equipo_nombre: string;
  pueblo_id: string;
  zona: string | null;
  pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; dif: number; puntos: number; pos: number;
};

export const FASE_LABEL: Record<string, string> = {
  grupos: 'Fase de zonas',
  cuartos: 'Cuartos de final',
  semifinal: 'Semifinal',
  tercer_puesto: '3er puesto',
  final: 'Final',
};

export const ESTADO_LABEL: Record<string, string> = {
  programado: '🕒 Programado',
  en_juego: '🔴 En juego',
  finalizado: '✅ Finalizado',
  suspendido: '⛔ Suspendido',
};

export function nombreEquipo(e?: { nombre: string | null; pueblo?: { nombre: string } | null } | null): string {
  if (!e) return '';
  return e.nombre || e.pueblo?.nombre || 'Equipo';
}

// ---------- Edición / disciplinas ----------
export async function fetchEdicionActiva(): Promise<TorneoEdicion | null> {
  const { data, error } = await supabase
    .from('torneo_ediciones')
    .select('*')
    .eq('activo', true)
    .order('anio', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as any) ?? null;
}

export async function fetchDisciplinas(edicionId: string): Promise<TorneoDisciplina[]> {
  const { data, error } = await supabase
    .from('torneo_disciplinas')
    .select('*')
    .eq('edicion_id', edicionId)
    .order('orden');
  if (error) throw error;
  return (data as any) ?? [];
}

export async function updateDisciplina(id: string, patch: Partial<TorneoDisciplina>) {
  const { error } = await supabase.from('torneo_disciplinas').update(patch as any).eq('id', id);
  if (error) throw error;
}

// ---------- Canchas ----------
export async function fetchCanchas(disciplinaIds: string[]): Promise<TorneoCancha[]> {
  if (!disciplinaIds.length) return [];
  const { data, error } = await supabase
    .from('torneo_canchas')
    .select('*')
    .in('disciplina_id', disciplinaIds)
    .order('orden');
  if (error) throw error;
  return (data as any) ?? [];
}

export async function addCancha(disciplina_id: string, nombre: string, orden: number) {
  const { error } = await supabase.from('torneo_canchas').insert({ disciplina_id, nombre, orden } as any);
  if (error) throw error;
}

export async function deleteCancha(id: string) {
  const { error } = await supabase.from('torneo_canchas').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Bloques horarios ----------
export async function fetchBloques(edicionId: string): Promise<TorneoBloque[]> {
  const { data, error } = await supabase
    .from('torneo_bloques')
    .select('*')
    .eq('edicion_id', edicionId)
    .order('fecha')
    .order('hora_inicio');
  if (error) throw error;
  return (data as any) ?? [];
}

export async function addBloque(b: Omit<TorneoBloque, 'id'>) {
  const { error } = await supabase.from('torneo_bloques').insert(b as any);
  if (error) throw error;
}

export async function deleteBloque(id: string) {
  const { error } = await supabase.from('torneo_bloques').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Equipos ----------
export async function fetchEquipos(disciplinaIds: string[]): Promise<TorneoEquipo[]> {
  if (!disciplinaIds.length) return [];
  const { data, error } = await supabase
    .from('torneo_equipos')
    .select('*, pueblo:pueblos(nombre)')
    .in('disciplina_id', disciplinaIds)
    .order('zona');
  if (error) throw error;
  return (data as any) ?? [];
}

export async function addEquipo(disciplina_id: string, pueblo_id: string) {
  const { error } = await supabase.from('torneo_equipos').insert({ disciplina_id, pueblo_id } as any);
  if (error) throw error;
}

export async function updateEquipo(id: string, patch: Partial<TorneoEquipo>) {
  const { error } = await supabase.from('torneo_equipos').update(patch as any).eq('id', id);
  if (error) throw error;
}

export async function deleteEquipo(id: string) {
  const { error } = await supabase.from('torneo_equipos').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Partidos ----------
export const PARTIDO_SELECT = `
  *,
  equipo_a:torneo_equipos!torneo_partidos_equipo_a_id_fkey(id,nombre,pueblo:pueblos(nombre)),
  equipo_b:torneo_equipos!torneo_partidos_equipo_b_id_fkey(id,nombre,pueblo:pueblos(nombre)),
  cancha:torneo_canchas(nombre)
`;

export async function fetchPartidos(disciplinaIds: string[]): Promise<TorneoPartido[]> {
  if (!disciplinaIds.length) return [];
  const { data, error } = await supabase
    .from('torneo_partidos')
    .select(PARTIDO_SELECT)
    .in('disciplina_id', disciplinaIds)
    .order('inicio', { ascending: true, nullsFirst: false })
    .order('fase_orden')
    .order('ronda');
  if (error) throw error;
  return (data as any) ?? [];
}

export async function updatePartido(id: string, patch: Partial<TorneoPartido>) {
  const { error } = await supabase.from('torneo_partidos').update(patch as any).eq('id', id);
  if (error) throw error;
}

// ---------- RPCs ----------
export async function fetchTabla(disciplinaId: string): Promise<TorneoFilaTabla[]> {
  const { data, error } = await supabase.rpc('torneo_tabla' as any, { p_disciplina_id: disciplinaId });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function sortearZonas(disciplinaId: string, numZonas: number) {
  const { data, error } = await supabase.rpc('torneo_sortear_zonas' as any, {
    p_disciplina_id: disciplinaId,
    p_num_zonas: numZonas,
  });
  if (error) throw error;
  return data as any;
}

export async function generarFixture(disciplinaId: string) {
  const { data, error } = await supabase.rpc('torneo_generar_fixture' as any, { p_disciplina_id: disciplinaId });
  if (error) throw error;
  return data as any;
}

export async function programarTorneo(
  edicionId: string,
  reprogramarTodo = true,
  maxDiaPueblo = 9999,
  descansoMin = 0,
) {
  const { data, error } = await supabase.rpc('torneo_programar' as any, {
    p_edicion_id: edicionId,
    p_reprogramar_todo: reprogramarTodo,
    p_max_dia_pueblo: maxDiaPueblo,
    p_descanso_min: descansoMin,
  });
  if (error) throw error;
  return data as any;
}

export async function limpiarHorarios(edicionId: string, incluirFinalizados = false) {
  const { data, error } = await supabase.rpc('torneo_limpiar_horarios' as any, {
    p_edicion_id: edicionId,
    p_incluir_finalizados: incluirFinalizados,
  });
  if (error) throw error;
  return data as any;
}


export async function resolverAvances(disciplinaId: string) {
  const { data, error } = await supabase.rpc('torneo_resolver_avances' as any, { p_disciplina_id: disciplinaId });
  if (error) throw error;
  return data as any;
}

export async function correrHorarios(partidoId: string, minutos: number, soloCancha = true) {
  const { data, error } = await supabase.rpc('torneo_correr_horarios' as any, {
    p_partido_id: partidoId,
    p_minutos: minutos,
    p_solo_cancha: soloCancha,
  });
  if (error) throw error;
  return data as any;
}


// ---------- Helpers de formato ----------
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fmtHora(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDia(iso: string | null): string {
  if (!iso) return 'Sin horario';
  const d = new Date(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function claveDia(iso: string | null): string {
  if (!iso) return 'zzz-sin-horario';
  // Fecha LOCAL (no UTC): un partido a las 22:00 en Paraguay pertenece a ese mismo día
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function renameCancha(id: string, nombre: string) {
  const { error } = await supabase.from('torneo_canchas').update({ nombre } as any).eq('id', id);
  if (error) throw error;
}

export async function updateBloque(id: string, patch: Partial<Omit<TorneoBloque, 'id' | 'edicion_id'>>) {
  const { error } = await supabase.from('torneo_bloques').update(patch as any).eq('id', id);
  if (error) throw error;
}

export async function suspenderDesde(edicionId: string, desdeIso: string) {
  const { data, error } = await supabase.rpc('torneo_suspender_desde' as any, {
    p_edicion_id: edicionId,
    p_desde: desdeIso,
  });
  if (error) throw error;
  return data as any;
}

// ---------- Partido individual / marcador en vivo ----------
export async function fetchPartidosPorId(ids: string[]): Promise<TorneoPartido[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('torneo_partidos').select(PARTIDO_SELECT).in('id', ids);
  if (error) throw error;
  return (data as any) ?? [];
}

/** Suma/resta atómica en la base. Si estaba 'programado' pasa a 'en_juego'. */
export async function sumarPartido(partidoId: string, lado: 'a' | 'b', delta: number) {
  const { data, error } = await supabase.rpc('torneo_sumar' as any, { p_partido_id: partidoId, p_lado: lado, p_delta: delta });
  if (error) throw error;
  return data as any;
}

/** Ganador de un partido finalizado (marcador y, si empató, penales). */
export function ganadorPartido(p: TorneoPartido): 'a' | 'b' | null {
  if (p.estado !== 'finalizado' || p.marcador_a == null || p.marcador_b == null) return null;
  if (p.marcador_a !== p.marcador_b) return p.marcador_a > p.marcador_b ? 'a' : 'b';
  if (p.penales_a != null && p.penales_b != null && p.penales_a !== p.penales_b) return p.penales_a > p.penales_b ? 'a' : 'b';
  return null;
}

/** "1 - 1 (4-3 pen.)" */
export function marcadorTexto(p: TorneoPartido): string | null {
  if (p.marcador_a == null || p.marcador_b == null) return null;
  const pen = p.penales_a != null && p.penales_b != null ? ` (${p.penales_a}-${p.penales_b} pen.)` : '';
  return `${p.marcador_a} - ${p.marcador_b}${pen}`;
}

// ---------- Ediciones ----------
export async function fetchEdiciones(): Promise<TorneoEdicion[]> {
  const { data, error } = await supabase.from('torneo_ediciones').select('*').order('anio', { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function updateEdicion(id: string, patch: Partial<TorneoEdicion>) {
  const { error } = await supabase.from('torneo_ediciones').update(patch as any).eq('id', id);
  if (error) throw error;
}

export async function inscripcionEquiposAbierta(edicionId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('torneo_inscripcion_abierta' as any, { p_edicion_id: edicionId });
  if (error) throw error;
  return !!data;
}

export async function crearEdicion(anio: number, nombre: string | null, copiarDe: string | null) {
  const { data, error } = await supabase.rpc('torneo_crear_edicion' as any, {
    p_anio: anio, p_nombre: nombre, p_copiar_de: copiarDe,
  });
  if (error) throw error;
  return data as any;
}

/** Fecha y hora en Asunción (UTC-3), ej. "15/10/2026 18:00". */
export function fmtFechaHoraAsu(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Para inputs: ISO → "AAAA-MM-DD HH:MM" en hora de Asunción. */
export function isoAInputAsu(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

/** "AAAA-MM-DD HH:MM" (hora Asunción) → ISO. Devuelve null si está vacío; lanza error si es inválido. */
export function inputAsuAIso(txt: string): string | null {
  const t = txt.trim();
  if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) throw new Error(`Fecha inválida: "${t}". Usá el formato AAAA-MM-DD HH:MM`);
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00-03:00`);
  if (isNaN(d.getTime())) throw new Error(`Fecha inválida: "${t}"`);
  return d.toISOString();
}

// ---------- Contacto del delegado y jugadores ----------
export type TorneoContacto = { equipo_id: string; delegado_nombre: string | null; delegado_telefono: string | null };
export type TorneoJugador = { id: string; equipo_id: string; registro_id: string | null; nombre: string; created_at: string };

export async function fetchContactos(equipoIds: string[]): Promise<TorneoContacto[]> {
  if (!equipoIds.length) return [];
  const { data, error } = await supabase.from('torneo_equipos_contacto' as any).select('*').in('equipo_id', equipoIds);
  if (error) throw error;
  return (data as any) ?? [];
}

export async function guardarContacto(c: TorneoContacto) {
  const { error } = await supabase.from('torneo_equipos_contacto' as any).upsert(c as any, { onConflict: 'equipo_id' });
  if (error) throw error;
}

export async function fetchJugadores(equipoIds: string[]): Promise<TorneoJugador[]> {
  if (!equipoIds.length) return [];
  const { data, error } = await supabase.from('torneo_jugadores' as any).select('*').in('equipo_id', equipoIds).order('nombre');
  if (error) throw error;
  return (data as any) ?? [];
}

export async function addJugador(equipo_id: string, registro_id: string | null, nombre: string) {
  const { error } = await supabase.from('torneo_jugadores' as any).insert({ equipo_id, registro_id, nombre } as any);
  if (error) throw error;
}

export async function deleteJugador(id: string) {
  const { error } = await supabase.from('torneo_jugadores' as any).delete().eq('id', id);
  if (error) throw error;
}

export type MisioneroMin = { id: string; nombres: string; apellidos: string; ci: string };

/** Misioneros confirmados de un pueblo para el año del torneo. */
export async function fetchMisionerosConfirmados(puebloId: string, anio: number): Promise<MisioneroMin[]> {
  const out: MisioneroMin[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('registros')
      .select('id, nombres, apellidos, ci')
      .eq('pueblo_id', puebloId)
      .eq('estado', 'confirmado')
      .eq('año', anio)
      .is('deleted_at', null)
      .order('apellidos')
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data as any) ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// ---------- Operadores ----------
export type TorneoOperador = { user_id: string; email: string; desde: string };

export async function fetchOperadores(): Promise<TorneoOperador[]> {
  const { data, error } = await supabase.rpc('torneo_operadores_listar' as any);
  if (error) throw error;
  return (data as any) ?? [];
}

export async function agregarOperador(email: string) {
  const { data, error } = await supabase.rpc('torneo_operador_agregar' as any, { p_email: email });
  if (error) throw error;
  return data as any;
}

export async function quitarOperador(userId: string) {
  const { data, error } = await supabase.rpc('torneo_operador_quitar' as any, { p_user_id: userId });
  if (error) throw error;
  return data as any;
}
