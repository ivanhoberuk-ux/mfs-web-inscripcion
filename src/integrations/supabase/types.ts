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
    PostgrestVersion: "14.17"
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
      configuracion_inscripcion: {
        Row: {
          activo: boolean
          año: number
          apertura_anticipada: string
          apertura_general: string
          cierre: string
          created_at: string
          lista_espera_vence_at: string | null
          modo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          año: number
          apertura_anticipada: string
          apertura_general: string
          cierre: string
          created_at?: string
          lista_espera_vence_at?: string | null
          modo?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          año?: number
          apertura_anticipada?: string
          apertura_general?: string
          cierre?: string
          created_at?: string
          lista_espera_vence_at?: string | null
          modo?: string
          updated_at?: string
        }
        Relationships: []
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
      document_metadata: {
        Row: {
          created_at: string | null
          id: string
          schema: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          schema?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          schema?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      document_rows: {
        Row: {
          dataset_id: string | null
          id: number
          row_data: Json | null
        }
        Insert: {
          dataset_id?: string | null
          id?: number
          row_data?: Json | null
        }
        Update: {
          dataset_id?: string | null
          id?: number
          row_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_rows_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      email_reminder_logs: {
        Row: {
          created_at: string
          email_destino: string
          fecha_envio: string
          id: string
          pueblo_id: string
          registro_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          email_destino: string
          fecha_envio?: string
          id?: string
          pueblo_id: string
          registro_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          email_destino?: string
          fecha_envio?: string
          id?: string
          pueblo_id?: string
          registro_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reminder_logs_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "pueblos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_reminder_logs_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "vw_ocupacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_reminder_logs_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_reminder_logs_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "v_registros_unificados"
            referencedColumns: ["registro_id"]
          },
        ]
      }
      indexed_files: {
        Row: {
          file_id: string
          file_name: string | null
          file_type: string | null
          indexed_at: string | null
          last_modified: string | null
          status: string | null
        }
        Insert: {
          file_id: string
          file_name?: string | null
          file_type?: string | null
          indexed_at?: string | null
          last_modified?: string | null
          status?: string | null
        }
        Update: {
          file_id?: string
          file_name?: string | null
          file_type?: string | null
          indexed_at?: string | null
          last_modified?: string | null
          status?: string | null
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
      password_reset_rate_limits: {
        Row: {
          email_hash: string
          last_requested_at: string
          request_count: number
        }
        Insert: {
          email_hash: string
          last_requested_at?: string
          request_count?: number
        }
        Update: {
          email_hash?: string
          last_requested_at?: string
          request_count?: number
        }
        Relationships: []
      }
      plantillas_documentos: {
        Row: {
          activo: boolean
          bucket: string
          descripcion: string | null
          emoji: string | null
          key: string
          orden: number
          path: string
          titulo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          bucket?: string
          descripcion?: string | null
          emoji?: string | null
          key: string
          orden?: number
          path: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          bucket?: string
          descripcion?: string | null
          emoji?: string | null
          key?: string
          orden?: number
          path?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
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
          estado: Database["public"]["Enums"]["estado_registro"]
          external_id: string | null
          ficha_medica_url: string | null
          firma_url: string | null
          id: string
          madre_nombre: string | null
          madre_telefono: string | null
          misiono_antes: boolean
          nacimiento: string
          no_clasificado_at: string | null
          no_clasificado_motivo: string | null
          no_clasificado_por: string | null
          no_clasifico: boolean
          nombres: string
          padre_nombre: string | null
          padre_telefono: string | null
          pertenece_schoenstatt: boolean
          pueblo_id: string
          pueblos_acompana: string[] | null
          rama_schoenstatt: string | null
          rol: string
          source: string | null
          talle_remera: string | null
          telefono: string
          tipo_asesor: string | null
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
          estado?: Database["public"]["Enums"]["estado_registro"]
          external_id?: string | null
          ficha_medica_url?: string | null
          firma_url?: string | null
          id?: string
          madre_nombre?: string | null
          madre_telefono?: string | null
          misiono_antes?: boolean
          nacimiento: string
          no_clasificado_at?: string | null
          no_clasificado_motivo?: string | null
          no_clasificado_por?: string | null
          no_clasifico?: boolean
          nombres: string
          padre_nombre?: string | null
          padre_telefono?: string | null
          pertenece_schoenstatt?: boolean
          pueblo_id: string
          pueblos_acompana?: string[] | null
          rama_schoenstatt?: string | null
          rol: string
          source?: string | null
          talle_remera?: string | null
          telefono: string
          tipo_asesor?: string | null
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
          estado?: Database["public"]["Enums"]["estado_registro"]
          external_id?: string | null
          ficha_medica_url?: string | null
          firma_url?: string | null
          id?: string
          madre_nombre?: string | null
          madre_telefono?: string | null
          misiono_antes?: boolean
          nacimiento?: string
          no_clasificado_at?: string | null
          no_clasificado_motivo?: string | null
          no_clasificado_por?: string | null
          no_clasifico?: boolean
          nombres?: string
          padre_nombre?: string | null
          padre_telefono?: string | null
          pertenece_schoenstatt?: boolean
          pueblo_id?: string
          pueblos_acompana?: string[] | null
          rama_schoenstatt?: string | null
          rol?: string
          source?: string | null
          talle_remera?: string | null
          telefono?: string
          tipo_asesor?: string | null
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
      torneo_bloques: {
        Row: {
          created_at: string
          edicion_id: string
          etiqueta: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
        }
        Insert: {
          created_at?: string
          edicion_id: string
          etiqueta?: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
        }
        Update: {
          created_at?: string
          edicion_id?: string
          etiqueta?: string | null
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "torneo_bloques_edicion_id_fkey"
            columns: ["edicion_id"]
            isOneToOne: false
            referencedRelation: "torneo_ediciones"
            referencedColumns: ["id"]
          },
        ]
      }
      torneo_canchas: {
        Row: {
          created_at: string
          disciplina_id: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          created_at?: string
          disciplina_id: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          created_at?: string
          disciplina_id?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "torneo_canchas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "torneo_disciplinas"
            referencedColumns: ["id"]
          },
        ]
      }
      torneo_disciplinas: {
        Row: {
          activa: boolean
          buffer_min: number
          canchas_compartidas_con: string | null
          cantidad_canchas: number
          clasifican_por_zona: number
          codigo: string
          created_at: string
          duracion_min: number
          edicion_id: string
          emoji: string
          entretiempo_min: number
          id: string
          nombre: string
          num_zonas: number
          orden: number
          permite_empate: boolean
          puntos_derrota: number
          puntos_empate: number
          puntos_victoria: number
          tiempo_min: number
          updated_at: string
          usa_sets: boolean
        }
        Insert: {
          activa?: boolean
          buffer_min?: number
          canchas_compartidas_con?: string | null
          cantidad_canchas?: number
          clasifican_por_zona?: number
          codigo: string
          created_at?: string
          duracion_min?: number
          edicion_id: string
          emoji?: string
          entretiempo_min?: number
          id?: string
          nombre: string
          num_zonas?: number
          orden?: number
          permite_empate?: boolean
          puntos_derrota?: number
          puntos_empate?: number
          puntos_victoria?: number
          tiempo_min?: number
          updated_at?: string
          usa_sets?: boolean
        }
        Update: {
          activa?: boolean
          buffer_min?: number
          canchas_compartidas_con?: string | null
          cantidad_canchas?: number
          clasifican_por_zona?: number
          codigo?: string
          created_at?: string
          duracion_min?: number
          edicion_id?: string
          emoji?: string
          entretiempo_min?: number
          id?: string
          nombre?: string
          num_zonas?: number
          orden?: number
          permite_empate?: boolean
          puntos_derrota?: number
          puntos_empate?: number
          puntos_victoria?: number
          tiempo_min?: number
          updated_at?: string
          usa_sets?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "torneo_disciplinas_canchas_compartidas_con_fkey"
            columns: ["canchas_compartidas_con"]
            isOneToOne: false
            referencedRelation: "torneo_disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_disciplinas_edicion_id_fkey"
            columns: ["edicion_id"]
            isOneToOne: false
            referencedRelation: "torneo_ediciones"
            referencedColumns: ["id"]
          },
        ]
      }
      torneo_ediciones: {
        Row: {
          activo: boolean
          anio: number
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
          visible_en_inicio: boolean
        }
        Insert: {
          activo?: boolean
          anio?: number
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
          visible_en_inicio?: boolean
        }
        Update: {
          activo?: boolean
          anio?: number
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
          visible_en_inicio?: boolean
        }
        Relationships: []
      }
      torneo_equipos: {
        Row: {
          activo: boolean
          created_at: string
          delegado_nombre: string | null
          delegado_telefono: string | null
          disciplina_id: string
          id: string
          nombre: string | null
          pueblo_id: string
          updated_at: string
          zona: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          delegado_nombre?: string | null
          delegado_telefono?: string | null
          disciplina_id: string
          id?: string
          nombre?: string | null
          pueblo_id: string
          updated_at?: string
          zona?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          delegado_nombre?: string | null
          delegado_telefono?: string | null
          disciplina_id?: string
          id?: string
          nombre?: string | null
          pueblo_id?: string
          updated_at?: string
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "torneo_equipos_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "torneo_disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_equipos_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "pueblos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_equipos_pueblo_id_fkey"
            columns: ["pueblo_id"]
            isOneToOne: false
            referencedRelation: "vw_ocupacion"
            referencedColumns: ["id"]
          },
        ]
      }
      torneo_eventos: {
        Row: {
          cantidad: number
          created_at: string
          equipo_id: string
          id: string
          jugador: string
          minuto: number | null
          partido_id: string
          tipo: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          equipo_id: string
          id?: string
          jugador: string
          minuto?: number | null
          partido_id: string
          tipo?: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          equipo_id?: string
          id?: string
          jugador?: string
          minuto?: number | null
          partido_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "torneo_eventos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "torneo_equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_eventos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "torneo_partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      torneo_partidos: {
        Row: {
          avanza_ganador_partido_id: string | null
          avanza_ganador_slot: string | null
          avanza_perdedor_partido_id: string | null
          avanza_perdedor_slot: string | null
          cancha_id: string | null
          created_at: string
          detalle_sets: string | null
          disciplina_id: string
          equipo_a_id: string | null
          equipo_b_id: string | null
          estado: string
          etiqueta_a: string | null
          etiqueta_b: string | null
          fase: string
          fase_orden: number
          fin: string | null
          id: string
          inicio: string | null
          marcador_a: number | null
          marcador_b: number | null
          mvp_equipo_id: string | null
          mvp_nombre: string | null
          observaciones: string | null
          ronda: number
          updated_at: string
          zona: string | null
        }
        Insert: {
          avanza_ganador_partido_id?: string | null
          avanza_ganador_slot?: string | null
          avanza_perdedor_partido_id?: string | null
          avanza_perdedor_slot?: string | null
          cancha_id?: string | null
          created_at?: string
          detalle_sets?: string | null
          disciplina_id: string
          equipo_a_id?: string | null
          equipo_b_id?: string | null
          estado?: string
          etiqueta_a?: string | null
          etiqueta_b?: string | null
          fase?: string
          fase_orden?: number
          fin?: string | null
          id?: string
          inicio?: string | null
          marcador_a?: number | null
          marcador_b?: number | null
          mvp_equipo_id?: string | null
          mvp_nombre?: string | null
          observaciones?: string | null
          ronda?: number
          updated_at?: string
          zona?: string | null
        }
        Update: {
          avanza_ganador_partido_id?: string | null
          avanza_ganador_slot?: string | null
          avanza_perdedor_partido_id?: string | null
          avanza_perdedor_slot?: string | null
          cancha_id?: string | null
          created_at?: string
          detalle_sets?: string | null
          disciplina_id?: string
          equipo_a_id?: string | null
          equipo_b_id?: string | null
          estado?: string
          etiqueta_a?: string | null
          etiqueta_b?: string | null
          fase?: string
          fase_orden?: number
          fin?: string | null
          id?: string
          inicio?: string | null
          marcador_a?: number | null
          marcador_b?: number | null
          mvp_equipo_id?: string | null
          mvp_nombre?: string | null
          observaciones?: string | null
          ronda?: number
          updated_at?: string
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "torneo_partidos_avanza_ganador_partido_id_fkey"
            columns: ["avanza_ganador_partido_id"]
            isOneToOne: false
            referencedRelation: "torneo_partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_partidos_avanza_perdedor_partido_id_fkey"
            columns: ["avanza_perdedor_partido_id"]
            isOneToOne: false
            referencedRelation: "torneo_partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_partidos_cancha_id_fkey"
            columns: ["cancha_id"]
            isOneToOne: false
            referencedRelation: "torneo_canchas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_partidos_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "torneo_disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_partidos_equipo_a_id_fkey"
            columns: ["equipo_a_id"]
            isOneToOne: false
            referencedRelation: "torneo_equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_partidos_equipo_b_id_fkey"
            columns: ["equipo_b_id"]
            isOneToOne: false
            referencedRelation: "torneo_equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_partidos_mvp_equipo_id_fkey"
            columns: ["mvp_equipo_id"]
            isOneToOne: false
            referencedRelation: "torneo_equipos"
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
      asistencias_std: {
        Row: {}
        Relationships: []
      }
      registros_app: {
        Row: {}
        Relationships: []
      }
      registros_legacy: {
        Row: {}
        Relationships: []
      }
      registros_publicos: {
        Row: {}
        Relationships: []
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
          en_espera: number | null
          id: string | null
          libres: number | null
          menores: number | null
          nombre: string | null
          total_personas: number | null
          usados: number | null
        }
        Relationships: []
      }
      vw_ocupacion_completa: {
        Row: {}
        Relationships: []
      }
    }
    Functions: {
      _cp_tipo_column: { Args: never; Returns: string }
      _puntaje_reunion: {
        Args: { r: Database["public"]["Tables"]["reuniones"]["Row"] }
        Returns: number
      }
      abrir_anio: {
        Args: {
          p_año: number
          p_apertura_anticipada: string
          p_apertura_general: string
          p_cierre: string
          p_lista_espera_vence_at?: string
        }
        Returns: undefined
      }
      anio_activo: { Args: never; Returns: number }
      assign_co_admin_pueblo: {
        Args: { p_pueblo_id: string; p_user_id: string }
        Returns: undefined
      }
      assign_pueblo_admin: {
        Args: { p_pueblo_id: string; p_user_id: string }
        Returns: undefined
      }
      can_access_documento: { Args: { path: string }; Returns: boolean }
      can_manage_pueblo: { Args: { _pueblo_id: string }; Returns: boolean }
      cancelar_inscripcion: {
        Args: { p_motivo?: string; p_registro_id: string }
        Returns: Json
      }
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
      current_user_email_confirmed: { Args: never; Returns: boolean }
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
      estado_inscripcion: { Args: { p_año: number }; Returns: string }
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
      get_lista_espera_position: {
        Args: { p_registro_id: string }
        Returns: number
      }
      get_pueblo_contacts: {
        Args: { p_pueblo_id: string }
        Returns: {
          apellidos: string
          email: string
          nombres: string
          rol: string
          telefono: string
        }[]
      }
      get_pueblos_with_cupos: {
        Args: never
        Returns: {
          cupo_max: number
          id: string
          inscritos_2025: number
          lugares_disponibles: number
          nombre: string
          porcentaje_ocupacion: number
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
      is_operador: { Args: never; Returns: boolean }
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
      marcar_no_clasificado: {
        Args: { p_motivo?: string; p_registro_id: string }
        Returns: Json
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      ocupa_cupo: {
        Args: { p_año: number; p_nacimiento: string; p_rol: string }
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
      promover_siguiente_en_lista: {
        Args: { p_pueblo_id: string }
        Returns: Json
      }
      puede_inscribirse: {
        Args: { p_año: number; p_es_jefe: boolean; p_rol: string }
        Returns: Json
      }
      register_if_capacity: {
        Args: {
          p_acepta_terminos: boolean
          p_alimentacion_detalle: string
          p_alimentacion_especial: boolean
          p_apellidos: string
          p_ci: string
          p_ciudad: string
          p_direccion: string
          p_email: string
          p_emergencia_nombre: string
          p_emergencia_telefono: string
          p_es_jefe: boolean
          p_madre_nombre: string
          p_madre_telefono: string
          p_misiono_antes?: boolean
          p_nacimiento: string
          p_nombres: string
          p_padre_nombre: string
          p_padre_telefono: string
          p_pertenece_schoenstatt?: boolean
          p_pueblo_id: string
          p_pueblos_acompana?: string[]
          p_rama_schoenstatt?: string
          p_rol: string
          p_talle_remera: string
          p_telefono: string
          p_tipo_asesor?: string
          p_tratamiento_detalle: string
          p_tratamiento_especial: boolean
        }
        Returns: Json
      }
      remove_co_admin_pueblo: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      remove_pueblo_admin: { Args: { p_user_id: string }; Returns: undefined }
      revertir_no_clasificado: {
        Args: { p_registro_id: string }
        Returns: Json
      }
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
      set_modo_temporada: {
        Args: { p_año: number; p_modo: string }
        Returns: undefined
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
      torneo_correr_horarios: {
        Args: {
          p_minutos: number
          p_partido_id: string
          p_solo_cancha?: boolean
        }
        Returns: Json
      }
      torneo_generar_fixture: {
        Args: { p_disciplina_id: string }
        Returns: Json
      }
      torneo_goleadores: {
        Args: { p_disciplina_id: string; p_tipo?: string }
        Returns: {
          equipo_id: string
          equipo_nombre: string
          jugador: string
          total: number
        }[]
      }
      torneo_limpiar_horarios: {
        Args: { p_edicion_id: string; p_incluir_finalizados?: boolean }
        Returns: Json
      }
      torneo_programar:
        | {
            Args: { p_edicion_id: string; p_reprogramar_todo?: boolean }
            Returns: Json
          }
        | {
            Args: {
              p_descanso_min?: number
              p_edicion_id: string
              p_max_dia_pueblo?: number
              p_reprogramar_todo?: boolean
            }
            Returns: Json
          }
      torneo_resolver_avances: {
        Args: { p_disciplina_id: string }
        Returns: Json
      }
      torneo_sortear_zonas: {
        Args: { p_disciplina_id: string; p_num_zonas?: number }
        Returns: Json
      }
      torneo_suspender_desde: {
        Args: { p_desde: string; p_edicion_id: string }
        Returns: Json
      }
      torneo_tabla: {
        Args: { p_disciplina_id: string }
        Returns: {
          dif: number
          equipo_id: string
          equipo_nombre: string
          gc: number
          gf: number
          pe: number
          pg: number
          pj: number
          pos: number
          pp: number
          pueblo_id: string
          puntos: number
          zona: string
        }[]
      }
      update_registro_documentos_json: {
        Args: { p_fields: Json; p_registro_id: string }
        Returns: {
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
          estado: Database["public"]["Enums"]["estado_registro"]
          external_id: string | null
          ficha_medica_url: string | null
          firma_url: string | null
          id: string
          madre_nombre: string | null
          madre_telefono: string | null
          misiono_antes: boolean
          nacimiento: string
          no_clasificado_at: string | null
          no_clasificado_motivo: string | null
          no_clasificado_por: string | null
          no_clasifico: boolean
          nombres: string
          padre_nombre: string | null
          padre_telefono: string | null
          pertenece_schoenstatt: boolean
          pueblo_id: string
          pueblos_acompana: string[] | null
          rama_schoenstatt: string | null
          rol: string
          source: string | null
          talle_remera: string | null
          telefono: string
          tipo_asesor: string | null
          tratamiento_detalle: string | null
          tratamiento_especial: boolean
        }
        SetofOptions: {
          from: "*"
          to: "registros"
          isOneToOne: true
          isSetofReturn: false
        }
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
      validar_asesor: { Args: { p_registro_id: string }; Returns: Json }
      vencer_listas_espera: {
        Args: never
        Returns: {
          año: number
          apellidos: string
          email: string
          id: string
          nombres: string
          pueblo_id: string
          pueblo_nombre: string
        }[]
      }
    }
    Enums: {
      estado_registro:
        | "confirmado"
        | "lista_espera"
        | "cancelado"
        | "pendiente_validacion"
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
      estado_registro: [
        "confirmado",
        "lista_espera",
        "cancelado",
        "pendiente_validacion",
      ],
      tipo_reunion: ["general", "comision", "varias"],
    },
  },
} as const
