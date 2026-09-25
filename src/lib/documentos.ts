/**
 * Regla ÚNICA de documentos requeridos (misma que la función de BD `documentos_faltantes`).
 * - Siempre: Cédula frente, Cédula dorso, Firma.
 * - Menor de 18 y rol != 'Hijo' → "Permiso del Menor" (ficha_medica_url).
 * - Mayor de 18 (o sin fecha) → "Aceptación del Protocolo" (autorizacion_url).
 * - Hijo menor de 18: sin permiso.
 */
export type RegistroDocs = {
  rol?: string | null
  nacimiento?: string | null
  cedula_frente_url?: string | null
  cedula_dorso_url?: string | null
  firma_url?: string | null
  ficha_medica_url?: string | null
  autorizacion_url?: string | null
}

export const DOC_LABEL = {
  cedulaFrente: 'Cédula frente',
  cedulaDorso: 'Cédula dorso',
  firma: 'Firma',
  permisoMenor: 'Permiso del Menor',
  aceptacion: 'Aceptación del Protocolo',
} as const

function parseNacimiento(n?: string | null): Date | null {
  if (!n) return null
  let Y: number, M: number, D: number
  if (/^\d{4}-\d{2}-\d{2}/.test(n)) {
    ;[Y, M, D] = n.slice(0, 10).split('-').map((x) => parseInt(x, 10))
  } else if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(n)) {
    ;[D, M, Y] = n.split(/[-/]/).map((x) => parseInt(x, 10))
  } else return null
  const d = new Date(Date.UTC(Y, M - 1, D))
  return isNaN(d.getTime()) ? null : d
}

export function edadDe(nacimiento?: string | null): number | null {
  const d = parseNacimiento(nacimiento)
  if (!d) return null
  const t = new Date()
  let a = t.getUTCFullYear() - d.getUTCFullYear()
  const m = t.getUTCMonth() - d.getUTCMonth()
  if (m < 0 || (m === 0 && t.getUTCDate() < d.getUTCDate())) a--
  return a
}

/** Qué documento extra requiere: 'permiso' | 'aceptacion' | null */
export function documentoExtra(r: RegistroDocs): 'permiso' | 'aceptacion' | null {
  const edad = edadDe(r.nacimiento)
  if (edad !== null && edad < 18) return r.rol === 'Hijo' ? null : 'permiso'
  return 'aceptacion'
}

export function estadoDocumentos(r: RegistroDocs) {
  const extra = documentoExtra(r)
  const okCedulaFrente = !!r.cedula_frente_url
  const okCedulaDorso = !!r.cedula_dorso_url
  const okFirma = !!r.firma_url
  const okPermiso = !!r.ficha_medica_url
  const okAceptacion = !!r.autorizacion_url
  const faltantes = documentosFaltantes(r)
  return {
    okCedulaFrente, okCedulaDorso, okFirma, okPermiso, okAceptacion,
    necesitaPermiso: extra === 'permiso',
    necesitaAceptacion: extra === 'aceptacion',
    okRequeridos: faltantes.length === 0,
    faltantes,
  }
}

export function documentosFaltantes(r: RegistroDocs): string[] {
  const f: string[] = []
  if (!r.cedula_frente_url) f.push(DOC_LABEL.cedulaFrente)
  if (!r.cedula_dorso_url) f.push(DOC_LABEL.cedulaDorso)
  if (!r.firma_url) f.push(DOC_LABEL.firma)
  const extra = documentoExtra(r)
  if (extra === 'permiso' && !r.ficha_medica_url) f.push(DOC_LABEL.permisoMenor)
  if (extra === 'aceptacion' && !r.autorizacion_url) f.push(DOC_LABEL.aceptacion)
  return f
}

export function documentosCompletos(r: RegistroDocs): boolean {
  return documentosFaltantes(r).length === 0
}
