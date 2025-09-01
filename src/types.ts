export type Rol = 'Tio' | 'Misionero';
export type DocumentoRefs = { autorizacion_url?: string; ficha_medica_url?: string; firma_url?: string; };
export type Pueblo = { id: string; nombre: string; cupo_max: number; activo: boolean; };
export type Registro = {
  id: string;
  nombres: string; apellidos: string; ci: string; nacimiento: string;
  email: string; telefono: string; direccion?: string;
  emergencia_nombre?: string; emergencia_telefono?: string;
  rol: Rol; es_jefe?: boolean;
  pueblo_id: string;
  documentos?: DocumentoRefs;
  created_at: string;
};
