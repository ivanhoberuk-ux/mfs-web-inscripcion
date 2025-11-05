export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      asistencias: {
        Row: {
          created_at: string
          id_misionero: string
          id_reunion: string
        }
        Insert: {
          created_at?: string
          id_misionero: string
          id_reunion: string
        }
        Update: {
          created_at?: string
          id_misionero?: string
          id_reunion?: string
        }
        Relationships: [
          {
            foreignKeyName: "asistencias_id_reunion_fkey"
            columns: ["id_reunion"]
            isOneToOne: false
            referencedRelation: "reuniones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_id_reunion_fkey"
            columns: ["id_reunion"]
            isOneToOne: false
            referencedRelation: "v_historial_reuniones"
            referencedColumns: ["reunion_id"]
          },
          {
            foreignKeyName: "asistencias_id_reunion_fkey"
            columns: ["id_reunion"]
            isOneToOne: false
            referencedRelation: "v_reporte_misionero"
            referencedColumns: ["reunion_id"]
          },
          {
            foreignKeyName: "asistencias_id_reunion_fkey"
            columns: ["id_reunion"]
            isOneToOne: false
            referencedRelation: "v_reuniones"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_puntajes: {
        Row: {
          pueblo_id: string
          puntaje: number
          tipo_reunion: Database["public"]["Enums"]["tipo_reunion"]
        }
        Insert: {
          pueblo_id: string
          puntaje: number
          tipo_reunion: Database["public"]["Enums"]["tipo_reunion"]
        }
        Update: {
          pueblo_id?: string
          puntaje?: number
          tipo_reunion?: Database["public"]["Enums"]["tipo_reunion"]
        }
        Relationships: []
      }
      misioneros_extra: {
        Row: {
          created_at: string
          documento: string | null
          email: string | null
          id: string
          nombre: string
          pueblo_id: string | null
          telefono: string | null
        }
        Insert: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nombre: string
          pueblo_id?: string | null
          telefono?: string | null
        }
        Update: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nombre?: string
          pueblo_id?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          pueblo_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          pueblo_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          pueblo_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "pueblos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "vw_ocupacion"
            referencedColumns: ["id"]
          },
        ]
      }
      pueblos: {
        Row: {
          activo: boolean
          cupo_max: number
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          cupo_max?: number
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          cupo_max?: number
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      registros: {
        Row: {
          acepta_terminos: boolean
          acepta_terminos_at: string | null
          alimentacion_detalle: string | null
          alimentacion_especial: boolean
          año: number
          apellidos: string
          autorizacion_url: string | null
          cedula_dorso_url: string | null
          cedula_frente_url: string | null
          ci: string
          ciudad: string | null
          created_at: string
          deleted_at: string | null
          direccion: string | null
          email: string
          emergencia_nombre: string | null
          emergencia_telefono: string | null
          es_jefe: boolean
          external_id: string | null
          ficha_medica_url: string | null
          firma_url: string | null
          id: string
          madre_nombre: string | null
          madre_telefono: string | null
          nacimiento: string
          nombres: string
          padre_nombre: string | null
          padre_telefono: string | null
          pueblo_id: string
          rol: string
          source: string | null
          telefono: string
          tratamiento_detalle: string | null
          tratamiento_especial: boolean
        }
        Insert: {
          acepta_terminos?: boolean
          acepta_terminos_at?: string | null
          alimentacion_detalle?: string | null
          alimentacion_especial?: boolean
          año?: number
          apellidos: string
          autorizacion_url?: string | null
          cedula_dorso_url?: string | null
          cedula_frente_url?: string | null
          ci: string
          ciudad?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          email: string
          emergencia_nombre?: string | null
          emergencia_telefono?: string | null
          es_jefe?: boolean
          external_id?: string | null
          ficha_medica_url?: string | null
          firma_url?: string | null
          id?: string
          madre_nombre?: string | null
          madre_telefono?: string | null
          nacimiento: string
          nombres: string
          padre_nombre?: string | null
          padre_telefono?: string | null
          pueblo_id: string
          rol: string
          source?: string | null
          telefono: string
          tratamiento_detalle?: string | null
          tratamiento_especial?: boolean
        }
        Update: {
          acepta_terminos?: boolean
          acepta_terminos_at?: string | null
          alimentacion_detalle?: string | null
          alimentacion_especial?: boolean
          año?: number
          apellidos?: string
          autorizacion_url?: string | null
          cedula_dorso_url?: string | null
          cedula_frente_url?: string | null
          ci?: string
          ciudad?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          email?: string
          emergencia_nombre?: string | null
          emergencia_telefono?: string | null
          es_jefe?: boolean
          external_id?: string | null
          ficha_medica_url?: string | null
          firma_url?: string | null
          id?: string
          madre_nombre?: string | null
          madre_telefono?: string | null
          nacimiento?: string
          nombres?: string
          padre_nombre?: string | null
          padre_telefono?: string | null
          pueblo_id?: string
          rol?: string
          source?: string | null
          telefono?: string
          tratamiento_detalle?: string | null
          tratamiento_especial?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "registros_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "pueblos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "vw_ocupacion"
            referencedColumns: ["id"]
          },
        ]
      }
      reuniones: {
        Row: {
          cerrada: boolean | null
          fecha: string
          id: string
          pueblo_id: string
          puntaje_override: number | null
          tipo_reunion: Database["public"]["Enums"]["tipo_reunion"]
        }
        Insert: {
          cerrada?: boolean | null
          fecha: string
          id?: string
          pueblo_id: string
          puntaje_override?: number | null
          tipo_reunion: Database["public"]["Enums"]["tipo_reunion"]
        }
        Update: {
          cerrada?: boolean | null
          fecha?: string
          id?: string
          pueblo_id?: string
          puntaje_override?: number | null
          tipo_reunion?: Database["public"]["Enums"]["tipo_reunion"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      asistencias_std: {
        Row: {
          created_at: string | null
          misionero_id: string | null
          reunion_id: string | null
        }
        Insert: {
          created_at?: string | null
          misionero_id?: string | null
          reunion_id?: string | null
        }
        Update: {
          created_at?: string | null
          misionero_id?: string | null
          reunion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asistencias_id_reunion_fkey"
            columns: ["reunion_id"]
            isOneToOne: false
            referencedRelation: "reuniones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_id_reunion_fkey"
            columns: ["reunion_id"]
            isOneToOne: false
            referencedRelation: "v_historial_reuniones"
            referencedColumns: ["reunion_id"]
          },
          {
            foreignKeyName: "asistencias_id_reunion_fkey"
            columns: ["reunion_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_misionero"
            referencedColumns: ["reunion_id"]
          },
          {
            foreignKeyName: "asistencias_id_reunion_fkey"
            columns: ["reunion_id"]
            isOneToOne: false
            referencedRelation: "v_reuniones"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_app: {
        Row: {
          acepta_terminos: boolean | null
          acepta_terminos_at: string | null
          alimentacion_detalle: string | null
          alimentacion_especial: boolean | null
          apellidos: string | null
          autorizacion_url: string | null
          cedula_dorso_url: string | null
          cedula_frente_url: string | null
          ci: string | null
          created_at: string | null
          deleted_at: string | null
          direccion: string | null
          email: string | null
          emergencia_nombre: string | null
          emergencia_telefono: string | null
          es_jefe: boolean | null
          external_id: string | null
          ficha_medica_url: string | null
          firma_url: string | null
          id: string | null
          madre_nombre: string | null
          madre_telefono: string | null
          nacimiento: string | null
          nombres: string | null
          padre_nombre: string | null
          padre_telefono: string | null
          pueblo_id: string | null
          rol: string | null
          source: string | null
          telefono: string | null
          tratamiento_detalle: string | null
          tratamiento_especial: boolean | null
        }
        Insert: {
          acepta_terminos?: boolean | null
          acepta_terminos_at?: string | null
          alimentacion_detalle?: string | null
          alimentacion_especial?: boolean | null
          apellidos?: string | null
          autorizacion_url?: string | null
          cedula_dorso_url?: string | null
          cedula_frente_url?: string | null
          ci?: string | null
          created_at?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          emergencia_nombre?: string | null
          emergencia_telefono?: string | null
          es_jefe?: boolean | null
          external_id?: string | null
          ficha_medica_url?: string | null
          firma_url?: string | null
          id?: string | null
          madre_nombre?: string | null
          madre_telefono?: string | null
          nacimiento?: string | null
          nombres?: string | null
          padre_nombre?: string | null
          padre_telefono?: string | null
          pueblo_id?: string | null
          rol?: string | null
          source?: string | null
          telefono?: string | null
          tratamiento_detalle?: string | null
          tratamiento_especial?: boolean | null
        }
        Update: {
          acepta_terminos?: boolean | null
          acepta_terminos_at?: string | null
          alimentacion_detalle?: string | null
          alimentacion_especial?: boolean | null
          apellidos?: string | null
          autorizacion_url?: string | null
          cedula_dorso_url?: string | null
          cedula_frente_url?: string | null
          ci?: string | null
          created_at?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          emergencia_nombre?: string | null
          emergencia_telefono?: string | null
          es_jefe?: boolean | null
          external_id?: string | null
          ficha_medica_url?: string | null
          firma_url?: string | null
          id?: string | null
          madre_nombre?: string | null
          madre_telefono?: string | null
          nacimiento?: string | null
          nombres?: string | null
          padre_nombre?: string | null
          padre_telefono?: string | null
          pueblo_id?: string | null
          rol?: string | null
          source?: string | null
          telefono?: string | null
          tratamiento_detalle?: string | null
          tratamiento_especial?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "pueblos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "vw_ocupacion"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_legacy: {
        Row: {
          acepta_terminos: boolean | null
          acepta_terminos_at: string | null
          alimentacion_detalle: string | null
          alimentacion_especial: boolean | null
          apellidos: string | null
          autorizacion_url: string | null
          cedula_dorso_url: string | null
          cedula_frente_url: string | null
          ci: string | null
          created_at: string | null
          deleted_at: string | null
          direccion: string | null
          email: string | null
          emergencia_nombre: string | null
          emergencia_telefono: string | null
          es_jefe: boolean | null
          external_id: string | null
          ficha_medica_url: string | null
          firma_url: string | null
          id: string | null
          madre_nombre: string | null
          madre_telefono: string | null
          nacimiento: string | null
          nombres: string | null
          padre_nombre: string | null
          padre_telefono: string | null
          pueblo_id: string | null
          rol: string | null
          source: string | null
          telefono: string | null
          tratamiento_detalle: string | null
          tratamiento_especial: boolean | null
        }
        Insert: {
          acepta_terminos?: boolean | null
          acepta_terminos_at?: string | null
          alimentacion_detalle?: string | null
          alimentacion_especial?: boolean | null
          apellidos?: string | null
          autorizacion_url?: string | null
          cedula_dorso_url?: string | null
          cedula_frente_url?: string | null
          ci?: string | null
          created_at?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          emergencia_nombre?: string | null
          emergencia_telefono?: string | null
          es_jefe?: boolean | null
          external_id?: string | null
          ficha_medica_url?: string | null
          firma_url?: string | null
          id?: string | null
          madre_nombre?: string | null
          madre_telefono?: string | null
          nacimiento?: string | null
          nombres?: string | null
          padre_nombre?: string | null
          padre_telefono?: string | null
          pueblo_id?: string | null
          rol?: string | null
          source?: string | null
          telefono?: string | null
          tratamiento_detalle?: string | null
          tratamiento_especial?: boolean | null
        }
        Update: {
          acepta_terminos?: boolean | null
          acepta_terminos_at?: string | null
          alimentacion_detalle?: string | null
          alimentacion_especial?: boolean | null
          apellidos?: string | null
          autorizacion_url?: string | null
          cedula_dorso_url?: string | null
          cedula_frente_url?: string | null
          ci?: string | null
          created_at?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          emergencia_nombre?: string | null
          emergencia_telefono?: string | null
          es_jefe?: boolean | null
          external_id?: string | null
          ficha_medica_url?: string | null
          firma_url?: string | null
          id?: string | null
          madre_nombre?: string | null
          madre_telefono?: string | null
          nacimiento?: string | null
          nombres?: string | null
          padre_nombre?: string | null
          padre_telefono?: string | null
          pueblo_id?: string | null
          rol?: string | null
          source?: string | null
          telefono?: string | null
          tratamiento_detalle?: string | null
          tratamiento_especial?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "pueblos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "vw_ocupacion"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_publicos: {
        Row: {
          apellidos: string | null
          ci: string | null
          created_at: string | null
          id: string | null
          nombres: string | null
          pueblo_id: string | null
        }
        Insert: {
          apellidos?: string | null
          ci?: string | null
          created_at?: string | null
          id?: string | null
          nombres?: string | null
          pueblo_id?: string | null
        }
        Update: {
          apellidos?: string | null
          ci?: string | null
          created_at?: string | null
          id?: string | null
          nombres?: string | null
          pueblo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "pueblos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "vw_ocupacion"
            referencedColumns: ["id"]
          },
        ]
      }
      v_historial_reuniones: {
        Row: {
          asistentes: number | null
          estado: string | null
          fecha: string | null
          pueblo_id: string | null
          pueblo_nombre: string | null
          reunion_id: string | null
          tipo: Database["public"]["Enums"]["tipo_reunion"] | null
        }
        Relationships: []
      }
      v_misioneros_busqueda: {
        Row: {
          id: string | null
          nombre: string | null
          pueblo_id: string | null
        }
        Relationships: []
      }
      v_misioneros_total: {
        Row: {
          created_at: string | null
          documento: string | null
          email: string | null
          id: string | null
          nombre: string | null
          pueblo_id: string | null
          telefono: string | null
        }
        Relationships: []
      }
      v_puntaje_asistencias: {
        Row: {
          id_misionero: string | null
          pueblo_id: string | null
          reuniones_asistidas: number | null
          total_puntos: number | null
          ultima_asistencia: string | null
        }
        Relationships: []
      }
      v_ranking_pueblo: {
        Row: {
          id_misionero: string | null
          misionero_nombre: string | null
          pos: number | null
          pueblo_id: string | null
          pueblo_nombre: string | null
          reuniones_asistidas: number | null
          total_puntos: number | null
          ultima_asistencia: string | null
        }
        Relationships: []
      }
      v_registros_unificados: {
        Row: {
          documento: string | null
          email: string | null
          nombre: string | null
          pueblo_id: string | null
          pueblo_nombre: string | null
          registro_id: string | null
          telefono: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "pueblos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "vw_ocupacion"
            referencedColumns: ["id"]
          },
        ]
      }
      v_reporte_misionero: {
        Row: {
          asistencia: number | null
          fecha: string | null
          marcada_el: string | null
          misionero_id: string | null
          misionero_nombre: string | null
          pueblo_id: string | null
          pueblo_nombre: string | null
          reunion_id: string | null
          tipo: Database["public"]["Enums"]["tipo_reunion"] | null
        }
        Relationships: []
      }
      v_reuniones: {
        Row: {
          fecha: string | null
          id: string | null
          pueblo_id: string | null
          pueblo_nombre: string | null
          puntaje_config: number | null
          puntaje_efectivo: number | null
          puntaje_override: number | null
          tipo_reunion: Database["public"]["Enums"]["tipo_reunion"] | null
        }
        Relationships: []
      }
      vw_ocupacion: {
        Row: {
          activo: boolean | null
          cupo_max: number | null
          id: string | null
          libres: number | null
          nombre: string | null
          usados: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _cp_tipo_column: { Args: never; Returns: string }
      _puntaje_reunion: {
        Args: { r: Database["public"]["Tables"]["reuniones"]["Row"] }
        Returns: number
      }
      assign_pueblo_admin: {
        Args: { p_pueblo_id: string; p_user_id: string }
        Returns: undefined
      }
      can_access_documento: { Args: { path: string }; Returns: boolean }
      can_manage_pueblo: { Args: { _pueblo_id: string }; Returns: boolean }
      count_reuniones: {
        Args: {
          p_desde?: string
          p_hasta?: string
          p_pueblo_id: string
          p_tipo?: Database["public"]["Enums"]["tipo_reunion"]
        }
        Returns: number
      }
      crear_reunion: {
        Args: {
          p_fecha: string
          p_pueblo_id: string
          p_puntaje_override: number
          p_tipo: Database["public"]["Enums"]["tipo_reunion"]
        }
        Returns: {
          id: string
          msg: string
        }[]
      }
      desmarcar_asistencia: {
        Args: { p_misionero_id: string; p_reunion_id: string }
        Returns: boolean
      }
      editar_reunion: {
        Args: {
          p_fecha: string
          p_id: string
          p_pueblo_id: string
          p_puntaje_override: number
          p_tipo: Database["public"]["Enums"]["tipo_reunion"]
        }
        Returns: {
          id: string
          msg: string
        }[]
      }
      fn_check_misionero_exists: { Args: { m_id: string }; Returns: boolean }
      fn_check_pueblo_exists: { Args: { p_id: string }; Returns: boolean }
      get_asistentes: {
        Args: { p_reunion_id: string }
        Returns: {
          id_misionero: string
          nombre: string
        }[]
      }
      get_dashboard_por_pueblo: {
        Args: { p_desde?: string; p_hasta?: string; p_pueblo_id?: string }
        Returns: {
          asistencias: number
          pueblo_id: string
          pueblo_nombre: string
          puntos: number
          reuniones: number
        }[]
      }
      get_dashboard_por_tipo: {
        Args: { p_desde?: string; p_hasta?: string; p_pueblo_id?: string }
        Returns: {
          asistencias: number
          puntos: number
          reuniones: number
          tipo: string
        }[]
      }
      get_dashboard_tendencia_semanal: {
        Args: {
          p_desde?: string
          p_hasta?: string
          p_pueblo_id?: string
          p_weeks?: number
        }
        Returns: {
          asistencias: number
          puntos: number
          reuniones: number
          semana: string
        }[]
      }
      get_dashboard_top_asistencia: {
        Args: {
          p_desde?: string
          p_hasta?: string
          p_limit?: number
          p_pueblo_id?: string
        }
        Returns: {
          id_misionero: string
          nombre: string
          puntos: number
          total_asistencias: number
        }[]
      }
      get_dashboard_totales: {
        Args: { p_desde?: string; p_hasta?: string; p_pueblo_id?: string }
        Returns: {
          total_asistencias: number
          total_misioneros: number
          total_pueblos: number
          total_puntos: number
          total_reuniones: number
        }[]
      }
      get_registro_id_from_path: { Args: { path: string }; Returns: string }
      get_reporte_misionero: {
        Args: { p_desde?: string; p_hasta?: string; p_misionero_id: string }
        Returns: {
          documento: string
          fecha: string
          misionero_id: string
          misionero_nombre: string
          pueblo_id: string
          pueblo_nombre: string
          puntaje: number
          reunion_id: string
          tipo: string
        }[]
      }
      get_reporte_misionero_totales_v1: {
        Args: { p_desde?: string; p_hasta?: string; p_misionero_id: string }
        Returns: {
          asistencias: number
          puntos: number
        }[]
      }
      get_reporte_misionero_v2: {
        Args: { p_desde?: string; p_hasta?: string; p_misionero_id: string }
        Returns: {
          fecha: string
          pueblo_id: string
          pueblo_nombre: string
          puntaje: number
          reunion_id: string
          tipo: string
        }[]
      }
      get_user_pueblo_id: { Args: never; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      importar_registro_a_misioneros: {
        Args: { p_pueblo_id: string; p_registro_id: string }
        Returns: {
          misionero_id: string
          origen: string
        }[]
      }
      importar_registros_masivo: {
        Args: { p_pueblo_id: string }
        Returns: {
          misionero_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_pueblo_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      kpi_asistencias: {
        Args: {
          p_desde?: string
          p_hasta?: string
          p_pueblo_id?: string
          p_tipo?: string
        }
        Returns: {
          asistencias: number
          pueblo_id: string
          pueblo_nombre: string
          reuniones: number
          tipo: string
        }[]
      }
      marcar_asistencia: {
        Args: { p_misionero_id: string; p_reunion_id: string }
        Returns: boolean
      }
      only_digits: { Args: { txt: string }; Returns: string }
      preview_ranking_por_puntajes: {
        Args: {
          p_comision: number
          p_general: number
          p_pueblo_id: string
          p_varias: number
        }
        Returns: {
          id_misionero: string
          misionero_nombre: string
          pos: number
          pueblo_id: string
          pueblo_nombre: string
          reuniones_asistidas: number
          total_puntos: number
          ultima_asistencia: string
        }[]
      }
      register_if_capacity:
        | {
            Args: {
              p_apellidos: string
              p_ci: string
              p_direccion: string
              p_email: string
              p_emergencia_nombre: string
              p_emergencia_telefono: string
              p_es_jefe: boolean
              p_nacimiento: string
              p_nombres: string
              p_pueblo_id: string
              p_rol: string
              p_telefono: string
            }
            Returns: string
          }
        | {
            Args: {
              p_acepta_terminos?: boolean
              p_alimentacion_detalle?: string
              p_alimentacion_especial?: boolean
              p_apellidos: string
              p_ci: string
              p_direccion: string
              p_email: string
              p_emergencia_nombre: string
              p_emergencia_telefono: string
              p_es_jefe: boolean
              p_madre_nombre?: string
              p_madre_telefono?: string
              p_nacimiento: string
              p_nombres: string
              p_padre_nombre?: string
              p_padre_telefono?: string
              p_pueblo_id: string
              p_rol: string
              p_telefono: string
              p_tratamiento_detalle?: string
              p_tratamiento_especial?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              p_alimentacion_detalle?: string
              p_alimentacion_especial?: boolean
              p_apellidos: string
              p_ci: string
              p_direccion: string
              p_email: string
              p_emergencia_nombre: string
              p_emergencia_telefono: string
              p_es_jefe: boolean
              p_madre_nombre?: string
              p_madre_telefono?: string
              p_nacimiento: string
              p_nombres: string
              p_padre_nombre?: string
              p_padre_telefono?: string
              p_pueblo_id: string
              p_rol: string
              p_telefono: string
              p_tratamiento_detalle?: string
              p_tratamiento_especial?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              p_acepta_terminos?: boolean
              p_alimentacion_detalle?: string
              p_alimentacion_especial?: boolean
              p_apellidos: string
              p_ci: string
              p_ciudad?: string
              p_direccion: string
              p_email: string
              p_emergencia_nombre: string
              p_emergencia_telefono: string
              p_es_jefe: boolean
              p_madre_nombre?: string
              p_madre_telefono?: string
              p_nacimiento: string
              p_nombres: string
              p_padre_nombre?: string
              p_padre_telefono?: string
              p_pueblo_id: string
              p_rol: string
              p_telefono: string
              p_tratamiento_detalle?: string
              p_tratamiento_especial?: boolean
            }
            Returns: string
          }
      remove_pueblo_admin: { Args: { p_user_id: string }; Returns: undefined }
      search_misioneros: {
        Args: { p_limit?: number; p_q?: string }
        Returns: {
          documento: string
          id: string
          nombre: string
          pueblo_id: string
          pueblo_nombre: string
        }[]
      }
      search_misioneros_por_pueblo: {
        Args: { p_limit?: number; p_pueblo_id: string; p_q?: string }
        Returns: {
          documento: string
          id: string
          nombre: string
          pueblo_id: string
          pueblo_nombre: string
        }[]
      }
      set_puntajes_por_pueblo: {
        Args: {
          p_comision: number
          p_general: number
          p_pueblo_id: string
          p_varias: number
        }
        Returns: {
          msg: string
        }[]
      }
      toggle_asistencia: {
        Args: { p_misionero_id: string; p_reunion_id: string }
        Returns: {
          accion: string
        }[]
      }
      upsert_reunion: {
        Args: {
          p_fecha: string
          p_id: string
          p_pueblo_id: string
          p_puntaje_override: number
          p_tipo: string
        }
        Returns: string
      }
    }
    Enums: {
      tipo_reunion: "general" | "comision" | "varias"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      tipo_reunion: ["general", "comision", "varias"],
    },
  },
} as const
