// FILE: src/lib/pdf.web.ts
/// <reference lib="dom" />
// WEB: genera PDF con pdf-lib (bundle UMD) y devuelve un ObjectURL (blob:) listo para abrir/descargar

export type Datos = {
  nombres: string;
  apellidos: string;
  ci: string;
  nacimiento: string;
  email: string;
  telefono: string;
  direccion?: string;
  puebloNombre: string;
  rol: string;
  esJefe?: boolean;
  adultoResponsable?: string;
};

export async function generarAutorizacionPDF(d: Datos, firmaDataUrl?: string): Promise<string> {
  // 👇 Import dinámico DENTRO de la función (evita top-level await)
  // @ts-ignore - No hay tipos para pdf-lib/dist/pdf-lib.js
  const PDFLib: any = await import('pdf-lib/dist/pdf-lib.js');
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 810;
  const margin = 40;

  // Título
  page.drawText('Autorización de Participación – Misiones Familiares Schoenstatt', {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 26;

  // Utilidad para párrafos con salto de línea automático
  const drawParagraph = (text: string, size = 12, leading = 16) => {
    const maxWidth = width - margin * 2;
    const lines = wrapText(text, fontRegular, size, maxWidth);
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      y -= leading;
    }
    y -= 6;
  };

  const titular = d.adultoResponsable || `${d.nombres} ${d.apellidos}`;
  drawParagraph(`Yo, ${titular}, con CI ${d.ci}, autorizo la participación en Misiones Familiares en el pueblo ${d.puebloNombre}.`);
  drawParagraph('Declaro conocer y aceptar el reglamento, normas de seguridad y la política de uso de imágenes con fines pastorales y de difusión.');

  const extra = `Datos: Rol ${d.rol}${d.esJefe ? ' (Jefe)' : ''}. Email ${d.email}. Tel ${d.telefono}. Domicilio ${d.direccion || ''}.`;
  page.drawText(extra, { x: margin, y, size: 11, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  y -= 26;

  // Firma (opcional)
  if (firmaDataUrl) {
    try {
      const pngBytes = await dataUrlToBytes(firmaDataUrl);
      const pngImage = await pdfDoc.embedPng(pngBytes);
      const imgW = 260;
      const scale = imgW / pngImage.width;
      const imgH = pngImage.height * scale;

      page.drawImage(pngImage, { x: margin, y: y - imgH - 4, width: imgW, height: imgH });
      y -= imgH + 12;
    } catch {
      // Si falla la imagen, seguimos sin firma
    }
  }

  // Línea y leyenda de firma
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 260, y }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });
  y -= 14;
  page.drawText('Firma del responsable / participante', { x: margin, y, size: 11, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  y -= 22;

  // Fecha
  page.drawText(`Fecha: ${new Date().toLocaleDateString()}`, { x: margin, y, size: 11, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

  // Guardar y devolver URL de blob
  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

// === Helpers ===
async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) current = test;
    else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}
