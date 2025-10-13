// FILE: src/lib/sharing.web.ts
/// <reference lib="dom" />
/**
 * Web: intenta usar la Web Share API (navigator.share) si está disponible.
 * Si no, fuerza la descarga del archivo (Blob o URL) creando un <a download>.
 */
export async function shareOrDownload(
  input: string | Blob,
  filename = 'archivo'
): Promise<void> {
  // Convertir a Blob + URL
  let blob: Blob;
  if (typeof input === 'string') {
    if (input.startsWith('blob:') || input.startsWith('data:')) {
      // Descargamos el blob
      const res = await fetch(input);
      blob = await res.blob();
    } else if (input.startsWith('http')) {
      const res = await fetch(input);
      blob = await res.blob();
    } else {
      // Asumir texto plano
      blob = new Blob([input], { type: guessMime(filename) });
    }
  } else {
    blob = input;
  }

  const url = URL.createObjectURL(blob);

  // Intento de Web Share API con archivos (soporte limitado)
  // Nota: muchos navegadores de escritorio no permiten compartir archivos.
  // Si falla, forzamos descarga.
  const canWebShare = typeof navigator !== 'undefined' && !!(navigator as any).canShare && !!(navigator as any).share;

  if (canWebShare) {
    try {
      const file = new File([blob], filename, { type: blob.type || guessMime(filename) });
      if ((navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: filename, text: filename });
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // cae a descarga
    }
  }

  // Fallback: descarga forzada
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function guessMime(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}
