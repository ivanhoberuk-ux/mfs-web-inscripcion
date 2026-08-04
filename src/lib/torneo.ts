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
};

export type TorneoDisciplina = {
  id: string;
  edicion_id: string;
  codigo: string;
  nombre: string;
  emoji: string;
  activa: boolean;
  cantidad_canchas: number;
  duracion_min: number;
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
  delegado_nombre: string | null;
  delegado_telefono: string | null;
  activo: boolean;
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

export type TorneoGoleador = {
  jugador: string;
  equipo_id: string;
  equipo_nombre: string;
  total: number;
};

export type TorneoEvento = {
  id: string;
  partido_id: string;
  equipo_id: string;
  jugador: string;
  tipo: string;
  cantidad: number;
  minuto: number | null;
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
const PARTIDO_SELECT = `
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

// ---------- Eventos (goleadores / MVP) ----------
export async function fetchEventos(partidoId: string): Promise<TorneoEvento[]> {
  const { data, error } = await supabase
    .from('torneo_eventos')
    .select('*')
    .eq('partido_id', partidoId)
    .order('created_at');
  if (error) throw error;
  return (data as any) ?? [];
}

export async function addEvento(e: Omit<TorneoEvento, 'id'>) {
  const { error } = await supabase.from('torneo_eventos').insert(e as any);
  if (error) throw error;
}

export async function deleteEvento(id: string) {
  const { error } = await supabase.from('torneo_eventos').delete().eq('id', id);
  if (error) throw error;
}

// ---------- RPCs ----------
export async function fetchTabla(disciplinaId: string): Promise<TorneoFilaTabla[]> {
  const { data, error } = await supabase.rpc('torneo_tabla' as any, { p_disciplina_id: disciplinaId });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function fetchGoleadores(disciplinaId: string, tipo = 'gol'): Promise<TorneoGoleador[]> {
  const { data, error } = await supabase.rpc('torneo_goleadores' as any, {
    p_disciplina_id: disciplinaId,
    p_tipo: tipo,
  });
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

export async function programarTorneo(edicionId: string, reprogramarTodo = true) {
  const { data, error } = await supabase.rpc('torneo_programar' as any, {
    p_edicion_id: edicionId,
    p_reprogramar_todo: reprogramarTodo,
  });
  if (error) throw error;
  return data as any;
}

export async function resolverAvances(disciplinaId: string) {
  const { data, error } = await supabase.rpc('torneo_resolver_avances' as any, { p_disciplina_id: disciplinaId });
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
  return new Date(iso).toISOString().slice(0, 10);
}
