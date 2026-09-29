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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ajustes: {
        Row: {
          clave: string
          updated_at: string | null
          valor: string | null
        }
        Insert: {
          clave: string
          updated_at?: string | null
          valor?: string | null
        }
        Update: {
          clave?: string
          updated_at?: string | null
          valor?: string | null
        }
        Relationships: []
      }
      alertas: {
        Row: {
          clave: string | null
          created_at: string
          detalle: string | null
          enviada_at: string | null
          id: number
          origen: string
          titulo: string
        }
        Insert: {
          clave?: string | null
          created_at?: string
          detalle?: string | null
          enviada_at?: string | null
          id?: number
          origen: string
          titulo: string
        }
        Update: {
          clave?: string | null
          created_at?: string
          detalle?: string | null
          enviada_at?: string | null
          id?: number
          origen?: string
          titulo?: string
        }
        Relationships: []
      }
      auditoria: {
        Row: {
          accion: string
          actor: string | null
          actor_email: string | null
          cambios: Json | null
          created_at: string
          id: number
          registro_id: string | null
          resumen: string | null
          tabla: string
        }
        Insert: {
          accion: string
          actor?: string | null
          actor_email?: string | null
          cambios?: Json | null
          created_at?: string
          id?: number
          registro_id?: string | null
          resumen?: string | null
          tabla: string
        }
        Update: {
          accion?: string
          actor?: string | null
          actor_email?: string | null
          cambios?: Json | null
          created_at?: string
          id?: number
          registro_id?: string | null
          resumen?: string | null
          tabla?: string
        }
        Relationships: []
      }
      configuracion_inscripcion: {
        Row: {
          activo: boolean
          año: number
          apertura_anticipada: string
          apertura_general: string
          cierre: string
          created_at: string
          horas_confirmar_promocion: number | null
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
          horas_confirmar_promocion?: number | null
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
          horas_confirmar_promocion?: number | null
          lista_espera_vence_at?: string | null
          modo?: string
          updated_at?: string
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
        ]
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
          promocion_confirmada_at: string | null
          promocion_notificada_at: string | null
          promocion_vence_at: string | null
          promovido_at: string | null
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
          promocion_confirmada_at?: string | null
          promocion_notificada_at?: string | null
          promocion_vence_at?: string | null
          promovido_at?: string | null
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
          promocion_confirmada_at?: string | null
          promocion_notificada_at?: string | null
          promocion_vence_at?: string | null
          promovido_at?: string | null
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
      tareas_log: {
        Row: {
          created_at: string
          detalle: Json | null
          id: number
          ok: boolean
          tarea: string
        }
        Insert: {
          created_at?: string
          detalle?: Json | null
          id?: number
          ok: boolean
          tarea: string
        }
        Update: {
          created_at?: string
          detalle?: Json | null
          id?: number
          ok?: boolean
          tarea?: string
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
      actualizar_registro: {
        Args: { p_datos: Json; p_registro_id: string }
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
          promocion_confirmada_at: string | null
          promocion_notificada_at: string | null
          promocion_vence_at: string | null
          promovido_at: string | null
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
      confirmar_promocion: { Args: { p_registro_id: string }; Returns: Json }
      crear_alerta: {
        Args: {
          p_clave?: string
          p_detalle: string
          p_origen: string
          p_titulo: string
        }
        Returns: undefined
      }
      current_user_email_confirmed: { Args: never; Returns: boolean }
      diagnostico_temporada: {
        Args: { p_año?: number }
        Returns: {
          chequeo: string
          detalle: string
          estado: string
          orden: number
        }[]
      }
      documentos_faltantes: {
        Args: { r: Database["public"]["Tables"]["registros"]["Row"] }
        Returns: string[]
      }
      estado_inscripcion: { Args: { p_año: number }; Returns: string }
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
      get_registro_id_from_path: { Args: { path: string }; Returns: string }
      get_user_pueblo_id: { Args: never; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_operador: { Args: never; Returns: boolean }
      is_pueblo_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      listar_archivos_huerfanos: {
        Args: { p_limite?: number }
        Returns: {
          name: string
          size: number
        }[]
      }
      marcar_no_clasificado: {
        Args: { p_motivo?: string; p_registro_id: string }
        Returns: Json
      }
      mismo_pueblo_que_yo: { Args: { p_user_id: string }; Returns: boolean }
      ocupa_cupo: {
        Args: { p_año: number; p_nacimiento: string; p_rol: string }
        Returns: boolean
      }
      only_digits: { Args: { txt: string }; Returns: string }
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
      revisar_salud: { Args: never; Returns: number }
      set_modo_temporada: {
        Args: { p_año: number; p_modo: string }
        Returns: undefined
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
          promocion_confirmada_at: string | null
          promocion_notificada_at: string | null
          promocion_vence_at: string | null
          promovido_at: string | null
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
      vencer_promociones_no_confirmadas: {
        Args: never
        Returns: {
          apellidos: string
          email: string
          id: string
          nombres: string
          pueblo_id: string
          pueblo_nombre: string
        }[]
      }
      verify_cron_secret: { Args: { p_secret: string }; Returns: boolean }
    }
    Enums: {
      estado_registro:
        | "confirmado"
        | "lista_espera"
        | "cancelado"
        | "pendiente_validacion"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    },
  },
} as const
