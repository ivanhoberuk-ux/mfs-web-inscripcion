// Web: redimensiona (lado máx 1600px) y comprime con canvas.
export type Compressed = { uri: string; ext: 'jpg' | 'png' };
const MAX = 1600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Devuelve null si falla (se sube el original). keepPng: mantener PNG (firma). */
export async function compressImage(uri: string, opts: { keepPng?: boolean } = {}): Promise<Compressed | null> {
  try {
    const img = await loadImage(uri);
    const w0 = img.naturalWidth, h0 = img.naturalHeight;
    if (!w0 || !h0) return null;
    const scale = Math.min(1, MAX / Math.max(w0, h0));
    if (opts.keepPng && scale === 1) return null;
    const w = Math.round(w0 * scale), h = Math.round(h0 * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (!opts.keepPng) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, 0, 0, w, h);
    const mime = opts.keepPng ? 'image/png' : 'image/jpeg';
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, mime, 0.7));
    if (!blob) return null;
    return { uri: URL.createObjectURL(blob), ext: opts.keepPng ? 'png' : 'jpg' };
  } catch (e) {
    console.warn('compressImage web falló, se sube original', e);
    return null;
  }
}

export function isImageName(name: string) {
  return /\.(jpe?g|png|heic|heif|webp)$/i.test(name) || /^data:image\//.test(name);
}
