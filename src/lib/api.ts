// FILE: src/lib/api.ts
// Funciones de acceso a datos (Supabase) y helpers de Storage para la app MFS

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Constantes de Supabase (para URL públicas y Storage)
const SUPABASE_URL = 'https://npekpdkywsneylddzzuu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZWtwZGt5d3NuZXlsZGR6enV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDYxNDEsImV4cCI6MjA3MTk4MjE0MX0.RNuHThLkvwMzq6WMUna7P6WFUovG2CwT18LNJwtwNoI';

// --------- Tipos ----------
export type Pueblo = {
  id: string;
  nombre: string;
  cupo_max: number;
  activo: boolean;
};

export type Ocupacion = {
  id: string;
  nombre: string;
  cupo_max: number;
  usados: number;        // misioneros que ocupan cupo
  menores: number;       // hijos menores de 12 (no ocupan cupo)
  total_personas: number; // total confirmados (usados + menores)
  libres: number;
  en_espera: number;     // inscriptos en lista de espera
  activo: boolean;
};


export type Registro = {
  id: string;
  created_at: string;
  pueblo_id: string;
  nombres: string;
  apellidos: string;
  ci: string;
  nacimiento: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  emergencia_nombre: string | null;
  emergencia_telefono: string | null;
  rol: 'Tio' | 'Misionero' | 'Hijo';
  es_jefe: boolean;

  tratamiento_especial: boolean;
  tratamiento_detalle: string | null;
  alimentacion_especial: boolean;
  alimentacion_detalle: string | null;
  padre_nombre: string | null;
  padre_telefono: string | null;
  madre_nombre: string | null;
  madre_telefono: string | null;

  acepta_terminos: boolean;
  acepta_terminos_at: string | null;

  autorizacion_url: string | null;
  ficha_medica_url: string | null;
  firma_url: string | null;

  // NUEVO: fotos de la cédula
  cedula_frente_url: string | null;
  cedula_dorso_url: string | null;

  talle_remera: string | null;

  // Gestión año tras año
  año: number;
};

// --------- Configuración de Inscripción (fechas/año activo) ----------
export type EstadoInscripcion =
  | 'cerrado_antes'
  | 'fase_anticipada'
  | 'fase_general'
  | 'cerrado_despues'
  | 'sin_config';

export type ConfiguracionInscripcion = {
  año: number;
  apertura_anticipada: string; // ISO
  apertura_general: string;    // ISO
  cierre: string;              // ISO
  activo: boolean;
  lista_espera_vence_at?: string | null; // ISO o null
};

/** Obtiene la configuración del año activo + el estado actual evaluado por la BD. */
export async function fetchEstadoInscripcionActivo(): Promise<{
  config: ConfiguracionInscripcion | null;
  estado: EstadoInscripcion;
}> {
  const { data: cfg, error: e1 } = await supabase
    .from('configuracion_inscripcion' as any)
    .select('año, apertura_anticipada, apertura_general, cierre, activo, lista_espera_vence_at')
    .eq('activo', true)
    .maybeSingle();
  if (e1) throw e1;
  if (!cfg) return { config: null, estado: 'sin_config' };

  const { data: estado, error: e2 } = await supabase.rpc('estado_inscripcion' as any, {
    p_año: (cfg as any).año,
  });
  if (e2) throw e2;
  return { config: cfg as any, estado: (estado as EstadoInscripcion) ?? 'sin_config' };
}

/** Lista todas las configuraciones (para admin). */
export async function fetchConfiguracionesInscripcion(): Promise<ConfiguracionInscripcion[]> {
  const { data, error } = await supabase
    .from('configuracion_inscripcion' as any)
    .select('año, apertura_anticipada, apertura_general, cierre, activo, lista_espera_vence_at')
    .order('año', { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

/** Crea o actualiza una configuración de año. Solo super_admin (RLS). */
export async function upsertConfiguracionInscripcion(cfg: ConfiguracionInscripcion) {
  const { error } = await supabase
    .from('configuracion_inscripcion' as any)
    .upsert(cfg, { onConflict: 'año' });
  if (error) throw error;
}

/** Marca un año como activo (el trigger desactiva los demás). */
export async function activarAñoInscripcion(año: number) {
  const { error } = await supabase
    .from('configuracion_inscripcion' as any)
    .update({ activo: true })
    .eq('año', año);
  if (error) throw error;
}

// --------- Plantillas / Documentos comunes (super admin) ----------
export type PlantillaDocumento = {
  key: string;
  titulo: string;
  descripcion: string | null;
  emoji: string | null;
  bucket: string;
  path: string;
  orden: number;
  activo: boolean;
  updated_at: string;
};

export async function fetchPlantillas(): Promise<PlantillaDocumento[]> {
  const { data, error } = await supabase
    .from('plantillas_documentos' as any)
    .select('key, titulo, descripcion, emoji, bucket, path, orden, activo, updated_at')
    .order('orden', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any;
}

/** Devuelve un mapa key -> URL firmada (con cache-buster por updated_at). */
export async function fetchPlantillasUrlMap(): Promise<Record<string, { titulo: string; emoji: string | null; url: string; path: string; updated_at: string }>> {
  const list = await fetchPlantillas();
  const out: Record<string, any> = {};
  await Promise.all(
    list.filter((p) => p.activo).map(async (p) => {
      try {
        const u = await publicUrl(p.bucket, p.path);
        const sep = u.includes('?') ? '&' : '?';
        out[p.key] = {
          titulo: p.titulo,
          emoji: p.emoji,
          path: p.path,
          updated_at: p.updated_at,
          url: `${u}${sep}v=${encodeURIComponent(p.updated_at)}`,
        };
      } catch (e) {
        console.warn('No se pudo generar URL para plantilla', p.key, e);
      }
    })
  );
  return out;
}

export async function upsertPlantilla(input: Partial<PlantillaDocumento> & { key: string; titulo: string; path: string; bucket?: string }) {
  const { error } = await supabase
    .from('plantillas_documentos' as any)
    .upsert({
      key: input.key,
      titulo: input.titulo,
      descripcion: input.descripcion ?? null,
      emoji: input.emoji ?? '📄',
      bucket: input.bucket ?? 'plantillas',
      path: input.path,
      orden: input.orden ?? 0,
      activo: input.activo ?? true,
    }, { onConflict: 'key' });
  if (error) throw error;
}

export async function deletePlantilla(key: string) {
  const { error } = await supabase.from('plantillas_documentos' as any).delete().eq('key', key);
  if (error) throw error;
}

export async function deleteStorageObject(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path.replace(/^\/+/, '')]);
  if (error) throw error;
}

// --------- Pueblos / Ocupación ----------
export async function fetchPueblos(): Promise<Pueblo[]> {
  const { data, error } = await supabase
    .from('pueblos')
    .select('id, nombre, cupo_max, activo')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchOcupacion(): Promise<Ocupacion[]> {
  // Requiere la vista vw_ocupacion creada en SQL
  const { data, error } = await supabase
    .from('vw_ocupacion')
    .select('id, nombre, cupo_max, usados, menores, total_personas, libres, en_espera, activo')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function updatePueblo(
  id: string,
  fields: Partial<Pick<Pueblo, 'cupo_max' | 'activo' | 'nombre'>>
) {
  const { error } = await supabase.from('pueblos').update(fields).eq('id', id);
  if (error) throw error;
}

// --------- Inscripción (RPC) ----------
// Asegurate de tener en la BD la versión del RPC con p_acepta_terminos.
export async function registerIfCapacity(input: {
  pueblo_id: string;
  nombres: string;
  apellidos: string;
  ci: string;
  nacimiento: string; // 'YYYY-MM-DD'
  email: string;
  telefono: string;
  direccion: string;
  ciudad?: string | null;
  emergencia_nombre: string;
  emergencia_telefono: string;
  rol: 'Tio' | 'Misionero' | 'Hijo' | 'Asesor';
  es_jefe: boolean;

  // campos médicos / alimentación / tutores
  tratamiento_especial: boolean;
  tratamiento_detalle?: string | null;
  alimentacion_especial: boolean;
  alimentacion_detalle?: string | null;
  padre_nombre?: string | null;
  padre_telefono?: string | null;
  madre_nombre?: string | null;
  madre_telefono?: string | null;

  // aceptación de términos
  acepta_terminos: boolean;
  // talle de remera
  talle_remera?: string | null;

  // Pertenencia al Movimiento de Schoenstatt
  pertenece_schoenstatt?: boolean;
  rama_schoenstatt?: string | null;

  // Misionó antes en MFS
  misiono_antes?: boolean;

  // Asesor
  tipo_asesor?: 'padre_schoenstatt' | 'diocesano' | 'hermana_maria' | null;
  pueblos_acompana?: string[] | null;
}): Promise<{ id: string; estado: string; mensaje: string }> {
  const payload = {
    p_pueblo_id: input.pueblo_id,
    p_nombres: input.nombres,
    p_apellidos: input.apellidos,
    p_ci: input.ci,
    p_nacimiento: input.nacimiento,
    p_email: input.email,
    p_telefono: input.telefono,
    p_direccion: input.direccion,
    p_ciudad: input.ciudad ?? null,
    p_emergencia_nombre: input.emergencia_nombre,
    p_emergencia_telefono: input.emergencia_telefono,
    p_rol: input.rol,
    p_es_jefe: input.es_jefe,

    p_tratamiento_especial: !!input.tratamiento_especial,
    p_tratamiento_detalle: input.tratamiento_detalle ?? null,
    p_alimentacion_especial: !!input.alimentacion_especial,
    p_alimentacion_detalle: input.alimentacion_detalle ?? null,
    p_padre_nombre: input.padre_nombre ?? null,
    p_padre_telefono: input.padre_telefono ?? null,
    p_madre_nombre: input.madre_nombre ?? null,
    p_madre_telefono: input.madre_telefono ?? null,

    p_acepta_terminos: !!input.acepta_terminos,
    p_talle_remera: input.talle_remera ?? null,
    p_pertenece_schoenstatt: !!input.pertenece_schoenstatt,
    p_rama_schoenstatt: input.pertenece_schoenstatt ? (input.rama_schoenstatt ?? null) : null,
    p_misiono_antes: !!input.misiono_antes,
    p_tipo_asesor: input.rol === 'Asesor' ? (input.tipo_asesor ?? null) : null,
    p_pueblos_acompana: input.rol === 'Asesor' ? (input.pueblos_acompana ?? null) : null,
  };

  const { data, error } = await supabase.rpc('register_if_capacity' as any, payload);
  if (error) throw error;
  return data as { id: string; estado: string; mensaje: string };
}

// --------- Asesores ---------
export type AsesorRow = {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  ci: string;
  tipo_asesor: 'padre_schoenstatt' | 'diocesano' | 'hermana_maria' | null;
  pueblos_acompana: string[] | null;
  pueblo_id: string;
  estado: string;
  created_at: string;
  año: number;
};

export async function fetchAsesoresPendientes(): Promise<AsesorRow[]> {
  const { data, error } = await supabase
    .from('registros')
    .select('id, nombres, apellidos, email, telefono, ci, tipo_asesor, pueblos_acompana, pueblo_id, estado, created_at, año')
    .eq('rol', 'Asesor')
    .eq('estado', 'pendiente_validacion' as any)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function fetchAsesoresConfirmados(año?: number): Promise<AsesorRow[]> {
  let q = supabase
    .from('registros')
    .select('id, nombres, apellidos, email, telefono, ci, tipo_asesor, pueblos_acompana, pueblo_id, estado, created_at, año')
    .eq('rol', 'Asesor')
    .eq('estado', 'confirmado')
    .is('deleted_at', null);
  if (año) q = q.eq('año', año);
  const { data, error } = await q.order('apellidos', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function validarAsesor(registroId: string): Promise<void> {
  const { error } = await supabase.rpc('validar_asesor' as any, { p_registro_id: registroId });
  if (error) throw error;
}

/** Inscripción del usuario actual (por email) para el año activo. */
export async function fetchMiInscripcion(email: string): Promise<Array<{
  id: string; nombres: string; apellidos: string; rol: string;
  estado: string; pueblo_id: string; pueblo_nombre: string; año: number;
  tipo_asesor: string | null;
  lista_espera_pos: number | null;
}>> {
  const { data, error } = await supabase
    .from('registros')
    .select('id, nombres, apellidos, rol, estado, pueblo_id, año, tipo_asesor, pueblos(nombre)')
    .eq('email', email)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []).map((r: any) => ({
    id: r.id, nombres: r.nombres, apellidos: r.apellidos, rol: r.rol,
    estado: r.estado, pueblo_id: r.pueblo_id, año: r.año, tipo_asesor: r.tipo_asesor,
    pueblo_nombre: r.pueblos?.nombre ?? '—',
    lista_espera_pos: null as number | null,
  }));
  await Promise.all(rows.map(async (row) => {
    if (row.estado !== 'lista_espera') return;
    const { data: pos } = await supabase.rpc('get_lista_espera_position' as any, { p_registro_id: row.id });
    if (typeof pos === 'number') row.lista_espera_pos = pos;
  }));
  return rows;
}

// --------- Documentos de inscriptos ----------
export async function updateDocumento(
  id: string,
  fields: Partial<{
    autorizacion_url: string | null;
    ficha_medica_url: string | null;
    firma_url: string | null;
    // NUEVO:
    cedula_frente_url: string | null;
    cedula_dorso_url: string | null;
  }>
) {
  const cleanFields = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  );

  const { error } = await supabase.rpc('update_registro_documentos_json' as any, {
    p_registro_id: id,
    p_fields: cleanFields,
  });
  if (error) throw error;
}

// --------- Admin: Registros completos para CSV ----------
export async function fetchRegistrosAdmin(): Promise<Registro[]> {
  const { data, error } = await supabase
    .from('registros')
    .select(
      `id, created_at, pueblo_id,
       nombres, apellidos, ci, nacimiento, email, telefono, direccion,
       emergencia_nombre, emergencia_telefono, rol, es_jefe,
       tratamiento_especial, tratamiento_detalle,
       alimentacion_especial, alimentacion_detalle,
       padre_nombre, padre_telefono, madre_nombre, madre_telefono,
       acepta_terminos, acepta_terminos_at,
       autorizacion_url, ficha_medica_url, firma_url,
       cedula_frente_url, cedula_dorso_url,
       talle_remera`
    )
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Registro[];
}

// --------- Storage helpers ----------

/** 
 * Genera una URL firmada (signed URL) para acceso seguro a documentos privados.
 * Para el bucket 'plantillas' (público), usa URL pública directa.
 * Para otros buckets (como 'documentos'), genera signed URL con expiración de 1 hora.
 */
export async function publicUrl(bucket: string, path: string): Promise<string> {
  const clean = path.replace(/^\/+/, '');
  
  // Bucket 'plantillas' es público - usar URL directa
  if (bucket === 'plantillas') {
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${clean}`;
  }
  
  // Para otros buckets (documentos), generar signed URL
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(clean, 3600); // 1 hora de validez
  
  if (error || !data?.signedUrl) {
    console.error('Error generando signed URL:', error);
    throw new Error(error?.message || 'No se pudo generar acceso al documento');
  }
  
  return data.signedUrl;
}

/**
 * Sube un archivo a Supabase Storage.
 * - Acepta:
 *   - `file://...` (binario)
 *   - `data:<mime>;base64,XXXX` (firma)
 *   - ruta local sin esquema (la convierte a file://)
 * Devuelve la ruta estable del objeto en Storage. Para abrirlo, generar una signed URL con publicUrl().
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  fileUriOrBase64: string,
  onProgress?: (pct: number) => void
): Promise<string | null> {
  const objectPath = path.replace(/^\/+/, '');

  // Content-Type
  let contentType = guessContentType(fileUriOrBase64, objectPath);

  // ---------- WEB: XHR PUT al endpoint REST de Storage para reportar progreso ----------
  if (Platform.OS === 'web') {
    try {
      const resp = await fetch(fileUriOrBase64);
      if (!resp.ok && !fileUriOrBase64.startsWith('data:')) {
        console.warn('uploadToStorage web fetch failed', resp.status);
        return null;
      }
      const blob = await resp.blob();
      if (blob.type) contentType = blob.type;

      const { data: sess } = await supabase.auth.getSession();
      const bearer = sess?.session?.access_token ?? SUPABASE_ANON_KEY;
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath}`;

      try { onProgress?.(0); } catch {}

      const ok = await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Authorization', `Bearer ${bearer}`);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.setRequestHeader('x-upsert', 'true');
        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              try { onProgress(Math.min(99, pct)); } catch {}
            }
          };
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { onProgress?.(100); } catch {}
            resolve(true);
          } else {
            console.warn('uploadToStorage web xhr error', xhr.status, xhr.responseText);
            resolve(false);
          }
        };
        xhr.onerror = () => {
          console.warn('uploadToStorage web xhr network error');
          resolve(false);
        };
        xhr.send(blob);
      });

      return ok ? objectPath : null;
    } catch (e: any) {
      console.warn('uploadToStorage web error', e?.message ?? String(e));
      return null;
    }
  }

  // ---------- NATIVO: usar expo-file-system uploadAsync / createUploadTask ----------
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath}`;

  // Resolver a file:// local
  let localUri = fileUriOrBase64;

  if (fileUriOrBase64.startsWith('data:')) {
    const { mime, base64 } = parseDataUrl(fileUriOrBase64);
    if (mime) contentType = mime;
    const tmpBase = FileSystem.cacheDirectory + `up_${Date.now()}`;
    const ext = objectPath.split('.').pop();
    const tmpFile = ext ? `${tmpBase}.${ext}` : tmpBase;
    await FileSystem.writeAsStringAsync(tmpFile, base64, { encoding: FileSystem.EncodingType.Base64 });
    localUri = tmpFile;
  } else if (!fileUriOrBase64.startsWith('file://')) {
    localUri = 'file://' + fileUriOrBase64;
  }

  const { data: sess } = await supabase.auth.getSession();
  const bearer = sess?.session?.access_token ?? SUPABASE_ANON_KEY;

  const options = {
    httpMethod: 'PUT' as const,
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${bearer}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
  };

  try { onProgress?.(0); } catch {}

  let res;
  if (onProgress && (FileSystem as any).createUploadTask) {
    res = await new Promise<any>((resolve, reject) => {
      try {
        const task = (FileSystem as any).createUploadTask(
          uploadUrl,
          localUri,
          options,
          (p: { totalBytesSent: number; totalBytesExpectedToSend: number }) => {
            if (p.totalBytesExpectedToSend > 0) {
              const pct = Math.round((p.totalBytesSent / p.totalBytesExpectedToSend) * 100);
              try { onProgress(Math.min(99, pct)); } catch {}
            }
          }
        );
        task.uploadAsync().then(resolve).catch(reject);
      } catch (e) { reject(e); }
    });
  } else {
    res = await FileSystem.uploadAsync(uploadUrl, localUri, options);
  }

  if (res.status < 200 || res.status >= 300) {
    console.warn('uploadToStorage error', res.status, res.body);
    return null;
  }

  try { onProgress?.(100); } catch {}
  return objectPath;
}

// --------- Utils internos ----------

function guessContentType(src: string, fallbackPath?: string): string {
  if (src.startsWith('data:')) {
    const idx = src.indexOf(';');
    if (idx > 5) {
      const mime = src.slice(5, idx);
      if (mime) return mime;
    }
  }
  const name = (fallbackPath || '').toLowerCase();
  const ext = name.split('.').pop() || '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain; charset=utf-8';
  }
  if (src.startsWith('file://')) {
    if (src.toLowerCase().endsWith('.pdf')) return 'application/pdf';
    if (/\.(jpe?g)$/i.test(src)) return 'image/jpeg';
    if (/\.(png)$/i.test(src)) return 'image/png';
    if (/\.(webp)$/i.test(src)) return 'image/webp';
    if (/\.(heic)$/i.test(src)) return 'image/heic';
  }
  return 'application/octet-stream';
}

function parseDataUrl(dataUrl: string): { mime: string | null; base64: string } {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) {
    const idx = dataUrl.indexOf(',');
    return { mime: null, base64: dataUrl.slice(idx + 1) };
  }
  return { mime: m[1], base64: m[2] };
}
