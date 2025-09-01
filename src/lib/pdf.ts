import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

type Datos = {
  nombres: string; apellidos: string; ci: string; nacimiento: string; email: string; telefono: string;
  direccion?: string; puebloNombre: string; rol: string; esJefe?: boolean;
  adultoResponsable?: string; // opcional
};

export async function generarAutorizacionPDF(d: Datos, firmaDataUrl?: string): Promise<string> {
  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 20px; }
        p { line-height: 1.4; font-size: 14px; }
        .firma { margin-top: 24px; display:flex; align-items:center; gap:16px; }
        .firmabox { border-top: 1px solid #333; width: 260px; text-align: center; padding-top: 6px; font-size: 12px;}
        .sigimg { max-height: 120px; }
        .muted { color:#444; font-size:12px; }
      </style>
    </head>
    <body>
      <h1>Autorización de Participación – Misiones Familiares Schoenstatt</h1>
      <p>Yo, <strong>${d.adultoResponsable || (d.nombres + ' ' + d.apellidos)}</strong>, con CI <strong>${d.ci}</strong>, autorizo la participación de <strong>${d.nombres} ${d.apellidos}</strong> en las Misiones Familiares en el pueblo <strong>${d.puebloNombre}</strong>.</p>
      <p>Declaro conocer y aceptar el reglamento, normas de seguridad y cuidado del menor/participante, así como la política de uso de imágenes con fines pastorales y de difusión.</p>
      <p class="muted">Datos: Rol ${d.rol}${d.esJefe ? ' (Jefe)' : ''}. Nacimiento ${d.nacimiento}. Email ${d.email}. Tel ${d.telefono}. Domicilio ${d.direccion || ''}.</p>
      <div class="firma">
        ${firmaDataUrl ? `<img class="sigimg" src="${firmaDataUrl}" />` : ''}
        <div class="firmabox">Firma del responsable / participante</div>
      </div>
      <p class="muted">Fecha: ${new Date().toLocaleDateString()}</p>
    </body>
  </html>`;

  const { uri } = await Print.printToFileAsync({ html });
  const dest = FileSystem.documentDirectory + `autorizacion-${Date.now()}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  return dest;
}
