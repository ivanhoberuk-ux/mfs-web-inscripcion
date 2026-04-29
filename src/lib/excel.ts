// Helpers para generar archivos Excel (XLSX) con estilo profesional.
// Incluye título, subtítulo (contexto), headers con color, zebra striping,
// auto-ancho de columnas y freeze de la cabecera.
import * as XLSX from 'xlsx-js-style';

export type ExcelOptions = {
  /** Título principal del reporte (ej: "Inscriptos - Tobatí") */
  title?: string;
  /** Subtítulo o contexto (ej: "Año 2026 · Generado el 29/04/2026") */
  subtitle?: string;
  /** Nombre de la hoja dentro del workbook */
  sheetName?: string;
};

const BRAND = {
  // Azul MFS
  primary: '1E40AF',
  primaryLight: '3B82F6',
  accent: '0EA5E9',
  headerBg: '1E40AF',
  headerFg: 'FFFFFF',
  titleFg: '0F172A',
  subtitleFg: '475569',
  zebra: 'F1F5F9',
  border: 'CBD5E1',
};

function autoColWidths(data: any[][], headerRowIndex: number): { wch: number }[] {
  const headers = data[headerRowIndex] || [];
  const widths: number[] = headers.map((h: any) => Math.max(10, String(h ?? '').length + 2));
  for (let r = headerRowIndex + 1; r < data.length; r++) {
    const row = data[r] || [];
    for (let c = 0; c < row.length; c++) {
      const len = String(row[c] ?? '').length;
      if (len + 2 > (widths[c] ?? 0)) widths[c] = Math.min(60, len + 2);
    }
  }
  return widths.map((w) => ({ wch: w }));
}

function buildStyledSheet(data: any[][], opts: ExcelOptions): XLSX.WorkSheet {
  const { title, subtitle } = opts;
  const hasTitle = !!title;
  const hasSubtitle = !!subtitle;

  // Construir array final con filas de título/subtítulo si corresponde
  const finalRows: any[][] = [];
  if (hasTitle) finalRows.push([title]);
  if (hasSubtitle) finalRows.push([subtitle]);
  if (hasTitle || hasSubtitle) finalRows.push([]); // fila vacía separadora
  const headerRowIdx = finalRows.length;
  finalRows.push(...data);

  const ws = XLSX.utils.aoa_to_sheet(finalRows);

  const numCols = Math.max(...finalRows.map((r) => (r ? r.length : 0)), 1);
  const lastColLetter = XLSX.utils.encode_col(numCols - 1);

  // Merges para título y subtítulo
  ws['!merges'] = ws['!merges'] || [];
  if (hasTitle) {
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } });
  }
  if (hasSubtitle) {
    const r = hasTitle ? 1 : 0;
    ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: numCols - 1 } });
  }

  // Estilos: título
  if (hasTitle) {
    const cellRef = `A1`;
    ws[cellRef] = ws[cellRef] || { t: 's', v: title };
    ws[cellRef].s = {
      font: { name: 'Calibri', sz: 18, bold: true, color: { rgb: BRAND.titleFg } },
      alignment: { horizontal: 'left', vertical: 'center' },
      fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
    };
  }
  if (hasSubtitle) {
    const r = hasTitle ? 2 : 1;
    const cellRef = `A${r}`;
    ws[cellRef] = ws[cellRef] || { t: 's', v: subtitle };
    ws[cellRef].s = {
      font: { name: 'Calibri', sz: 11, italic: true, color: { rgb: BRAND.subtitleFg } },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
  }

  // Altura de filas título/subtítulo
  ws['!rows'] = ws['!rows'] || [];
  if (hasTitle) ws['!rows'][0] = { hpt: 28 };
  if (hasSubtitle) ws['!rows'][hasTitle ? 1 : 0] = { hpt: 18 };

  // Estilos: header (primera fila de `data`)
  const headerExcelRow = headerRowIdx + 1; // 1-based
  const headers = data[0] || [];
  for (let c = 0; c < headers.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: headers[c] ?? '' };
    ws[ref].s = {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: BRAND.headerFg } },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND.headerBg } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: BRAND.primary } },
        bottom: { style: 'medium', color: { rgb: BRAND.primary } },
        left: { style: 'thin', color: { rgb: BRAND.primary } },
        right: { style: 'thin', color: { rgb: BRAND.primary } },
      },
    };
  }
  ws['!rows'][headerRowIdx] = { hpt: 24 };

  // Estilos: filas de datos con zebra striping y bordes suaves
  for (let r = 1; r < data.length; r++) {
    const excelR = headerRowIdx + r;
    const isZebra = r % 2 === 0;
    for (let c = 0; c < headers.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: excelR, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: data[r]?.[c] ?? '' };
      ws[ref].s = {
        font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
        fill: isZebra
          ? { patternType: 'solid', fgColor: { rgb: BRAND.zebra } }
          : { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
        alignment: { vertical: 'center', wrapText: false },
        border: {
          top: { style: 'hair', color: { rgb: BRAND.border } },
          bottom: { style: 'hair', color: { rgb: BRAND.border } },
          left: { style: 'hair', color: { rgb: BRAND.border } },
          right: { style: 'hair', color: { rgb: BRAND.border } },
        },
      };
    }
  }

  // Anchos automáticos
  ws['!cols'] = autoColWidths(finalRows, headerRowIdx);

  // Freeze: dejar visibles las filas de título/subtítulo + header
  ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 } as any;
  ws['!views'] = [{ state: 'frozen', ySplit: headerRowIdx + 1, xSplit: 0 }] as any;

  // Auto-filter sobre el rango de la tabla
  if (data.length > 0 && headers.length > 0) {
    const startRef = XLSX.utils.encode_cell({ r: headerRowIdx, c: 0 });
    const endRef = XLSX.utils.encode_cell({
      r: headerRowIdx + data.length - 1,
      c: headers.length - 1,
    });
    ws['!autofilter'] = { ref: `${startRef}:${endRef}` };
  }

  // Asegurar el rango total
  const lastRowIdx = headerRowIdx + Math.max(0, data.length - 1);
  ws['!ref'] = `A1:${lastColLetter}${lastRowIdx + 1}`;

  return ws;
}

function buildWorkbook(data: any[][], opts: ExcelOptions = {}): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const ws = buildStyledSheet(data, opts);
  const sheetName = (opts.sheetName || 'Datos').slice(0, 31); // Excel limit
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Metadatos del archivo
  wb.Props = {
    Title: opts.title || 'Reporte MFS',
    Subject: opts.subtitle || '',
    Author: 'MFS Paraguay',
    CreatedDate: new Date(),
  };
  return wb;
}

/**
 * Genera un Excel en base64 (útil para FileSystem en mobile).
 * Mantiene la firma original; el segundo argumento puede ser:
 *  - string: se interpreta como `title` (compat: antes era el nombre de archivo)
 *  - ExcelOptions: opciones completas
 */
export function generateExcelBase64(
  data: any[][],
  optsOrTitle: string | ExcelOptions = {}
): string {
  const opts: ExcelOptions =
    typeof optsOrTitle === 'string' ? { title: optsOrTitle } : optsOrTitle;
  const wb = buildWorkbook(data, opts);
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

/** Genera un Blob de Excel (útil para download en web). */
export function generateExcelBlob(data: any[][], opts: ExcelOptions = {}): Blob {
  const wb = buildWorkbook(data, opts);
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: Date.now(),
  } as any);
}

/** Devuelve un timestamp legible para nombre de archivo: 2026-04-29_18-30 */
export function fileStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

/** Devuelve fecha humana: 29 de abril de 2026 - 18:30 */
export function humanDate(): string {
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())} hs`;
}

/** Sanitiza un texto para usarlo como nombre de archivo. */
export function safeFileName(s: string): string {
  return (s || 'archivo')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\-_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Parsea un string CSV a array de arrays
 */
export function parseCsvToArray(csvString: string): any[][] {
  const lines = csvString.split('\n').filter((line) => line.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  });
}
