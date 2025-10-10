// FILE: src/lib/api.ts
// Funciones de acceso a datos (Supabase) y helpers de Storage para la app MFS

import * as FileSystem from 'expo-file-system';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.native';

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
  usados: number;
  libres: number;
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
  emergencia_nombre: string | null;
  emergencia_telefono: string | null;
  rol: 'Tio' | 'Misionero';
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
};

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
    .select('id, nombre, cupo_max, usados, libres, activo')
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
  emergencia_nombre: string;
  emergencia_telefono: string;
  rol: 'Tio' | 'Misionero';
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
}): Promise<string> {
  const payload = {
    p_pueblo_id: input.pueblo_id,
    p_nombres: input.nombres,
    p_apellidos: input.apellidos,
    p_ci: input.ci,
    p_nacimiento: input.nacimiento,
    p_email: input.email,
    p_telefono: input.telefono,
    p_direccion: input.direccion,
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
  };

  const { data, error } = await supabase.rpc('register_if_capacity', payload);
  if (error) throw error;
  return data as string; // id (uuid)
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
  const { error } = await supabase.from('registros').update(fields).eq('id', id);
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
       cedula_frente_url, cedula_dorso_url`
    )
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Registro[];
}

// --------- Storage helpers ----------

/** URL pública a un objeto (bucket con 'public' habilitado). */
export function publicUrl(bucket: string, path: string) {
  const clean = path.replace(/^\/+/, '');
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${clean}`;
}

/**
 * Sube un archivo a Supabase Storage.
 * - Acepta:
 *   - `file://...` (binario)
 *   - `data:<mime>;base64,XXXX` (firma)
 *   - ruta local sin esquema (la convierte a file://)
 * Devuelve la URL pública si el bucket es público (conveniente para abrir/compartir).
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  fileUriOrBase64: string
): Promise<string | null> {
  const objectPath = path.replace(/^\/+/, '');
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath}`;

  // Content-Type
  let contentType = guessContentType(fileUriOrBase64, objectPath);

  // Resolver a file:// local
  let localUri = fileUriOrBase64;

  if (fileUriOrBase64.startsWith('data:')) {
    // data URL -> escribir a archivo temporal
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

  // Bearer: token de sesión si existe; si no, ANON (útil en dev/buckets públicos)
  const { data: sess } = await supabase.auth.getSession();
  const bearer = sess?.session?.access_token ?? SUPABASE_ANON_KEY;

  const res = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${bearer}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
  });

  if (res.status < 200 || res.status >= 300) {
    console.warn('uploadToStorage error', res.status, res.body);
    return null;
  }

  // Devolvemos la pública por conveniencia (si el bucket no es público, esta URL no cargará sin signed URL)
  return publicUrl(bucket, objectPath);
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
