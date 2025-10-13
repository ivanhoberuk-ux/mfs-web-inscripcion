// Archivo multiplataforma para PDF
import { Platform } from 'react-native';

// Tipo de datos compartido
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

let generarAutorizacionPDF: any;
let generarFichaMedicaPDF: any;

if (Platform.OS === 'web') {
  const pdfWeb = require('./pdf.web');
  generarAutorizacionPDF = pdfWeb.generarAutorizacionPDF;
  generarFichaMedicaPDF = pdfWeb.generarFichaMedicaPDF;
} else {
  const pdfNative = require('./pdf.native');
  generarAutorizacionPDF = pdfNative.generarAutorizacionPDF;
  generarFichaMedicaPDF = pdfNative.generarFichaMedicaPDF;
}

export { generarAutorizacionPDF, generarFichaMedicaPDF };
