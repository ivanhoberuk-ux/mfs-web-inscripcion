// NATIVO: usa expo-print para generar PDF y lo guarda en el sandbox; devuelve file://

export type Datos = {
  nombres: string; apellidos: string; ci: string; nacimiento: string; email: string; telefono: string;
  direccion?: string; puebloNombre: string; rol: string; esJefe?: boolean; adultoResponsable?: string;
};

export async function generarAutorizacionPDF(d: Datos, firmaDataUrl?: string): Promise<string> {
  const Print = await import('expo-print');
  const FileSystem = await import('expo-file-system');

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 18px; margin-bottom: 12px; }
        p { line-height: 1.35; font-size: 13px; }
        .firma { margin-top: 24px; display: flex; flex-direction: column; gap: 8px; }
        .firmabox { border-top: 1px solid #666; padding-top: 6px; width: 260px; }
        .sigimg { max-height: 100px; object-fit: contain; }
        .muted { color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>Autorización de Participación – Misiones Familiares Schoenstatt</h1>
      <p>Yo, <strong>${d.adultoResponsable || (d.nombres + ' ' + d.apellidos)}</strong>, con CI <strong>${d.ci}</strong>,
      autorizo la participación en Misiones Familiares en el pueblo <strong>${d.puebloNombre}</strong>.</p>
      <p>Declaro conocer y aceptar el reglamento, normas de seguridad y la política de uso de imágenes con fines pastorales y de difusión.</p>
      <p class="muted">Datos: Rol ${d.rol}${d.esJefe ? ' (Jefe)' : ''}. Email ${d.email}. Tel ${d.telefono}. Domicilio ${d.direccion || ''}.</p>
      <div class="firma">
        ${firmaDataUrl ? `<img class="sigimg" src="${firmaDataUrl}" />` : ''}
        <div class="firmabox">Firma del responsable / participante</div>
      </div>
      <p class="muted">Fecha: ${new Date().toLocaleDateString()}</p>
    </body>
  </html>`;

  const { uri } = await Print.printToFileAsync({ html });
  // Mover a ruta estable
  const dest = (FileSystem as any).default.documentDirectory + `autorizacion-${Date.now()}.pdf`;
  await (FileSystem as any).default.moveAsync({ from: uri, to: dest });
  return dest;
}
