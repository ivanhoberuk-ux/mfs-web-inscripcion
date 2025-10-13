// Helpers para generar archivos Excel (XLS/XLSX)
import * as XLSX from 'xlsx';

/**
 * Convierte un array de arrays (tabla) a un archivo Excel
 * @param data Array de arrays, donde la primera fila son los headers
 * @param filename Nombre del archivo (sin extensión)
 * @returns Base64 string del archivo Excel
 */
export function generateExcelBase64(data: any[][], filename: string = 'export'): string {
  // Crear un nuevo libro de trabajo
  const wb = XLSX.utils.book_new();
  
  // Crear una hoja desde el array de arrays
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Agregar la hoja al libro
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  
  // Generar el archivo Excel en formato binario
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  
  return wbout;
}

/**
 * Convierte un array de arrays a un Blob de Excel
 * @param data Array de arrays (tabla)
 * @param filename Nombre del archivo
 * @returns Blob del archivo Excel
 */
export function generateExcelBlob(data: any[][]): Blob {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  
  // Generar como array buffer
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  
  return new Blob([wbout], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: Date.now()
  } as any);
}

/**
 * Parsea un string CSV a array de arrays
 * @param csvString String CSV
 * @returns Array de arrays
 */
export function parseCsvToArray(csvString: string): any[][] {
  const lines = csvString.split('\n').filter(line => line.trim());
  return lines.map(line => {
    // Parser simple de CSV que maneja comillas
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
