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
          apellidos: string
          autorizacion_url: string | null
          cedula_dorso_url: string | null
          cedula_frente_url: string | null
          ci: string
          created_at: string
          direccion: string | null
          email: string
          emergencia_nombre: string | null
          emergencia_telefono: string | null
          es_jefe: boolean
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
          telefono: string
          tratamiento_detalle: string | null
          tratamiento_especial: boolean
        }
        Insert: {
          acepta_terminos?: boolean
          acepta_terminos_at?: string | null
          alimentacion_detalle?: string | null
          alimentacion_especial?: boolean
          apellidos: string
          autorizacion_url?: string | null
          cedula_dorso_url?: string | null
          cedula_frente_url?: string | null
          ci: string
          created_at?: string
          direccion?: string | null
          email: string
          emergencia_nombre?: string | null
          emergencia_telefono?: string | null
          es_jefe?: boolean
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
          telefono: string
          tratamiento_detalle?: string | null
          tratamiento_especial?: boolean
        }
        Update: {
          acepta_terminos?: boolean
          acepta_terminos_at?: string | null
          alimentacion_detalle?: string | null
          alimentacion_especial?: boolean
          apellidos?: string
          autorizacion_url?: string | null
          cedula_dorso_url?: string | null
          cedula_frente_url?: string | null
          ci?: string
          created_at?: string
          direccion?: string | null
          email?: string
          emergencia_nombre?: string | null
          emergencia_telefono?: string | null
          es_jefe?: boolean
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
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      register_if_capacity: {
        Args:
          | {
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
          | {
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
          | {
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
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
