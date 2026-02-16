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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string
          data_evento: string
          descricao: string | null
          id: string
          lead_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_evento: string
          descricao?: string | null
          id?: string
          lead_id?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_evento?: string
          descricao?: string | null
          id?: string
          lead_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_history: {
        Row: {
          created_at: string
          field_label: string
          field_name: string
          id: string
          lead_id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          field_label: string
          field_name: string
          id?: string
          lead_id: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          field_label?: string
          field_name?: string
          id?: string
          lead_id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          due_time: string | null
          id: string
          is_cadence: boolean
          lead_id: string
          task_number: number
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          is_cadence?: boolean
          lead_id: string
          task_number?: number
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          is_cadence?: boolean
          lead_id?: string
          task_number?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cadencia_1: string | null
          cadencia_2: string | null
          cadencia_3: string | null
          cadencia_4: string | null
          cadencia_5: string | null
          created_at: string
          data_contato: string | null
          data_entrada_contato_iniciado: string | null
          data_entrada_contrato_enviado: string | null
          data_entrada_fechado_ganho: string | null
          data_entrada_fechado_perdido: string | null
          data_entrada_follow_up: string | null
          data_entrada_novo_lead: string | null
          data_entrada_proposta_enviada: string | null
          data_evento: string | null
          data_fechamento: string | null
          data_pedido: string | null
          data_proposta: string | null
          follow_up_1: string | null
          follow_up_2: string | null
          follow_up_3: string | null
          follow_up_4: string | null
          follow_up_5: string | null
          id: string
          iniciar_atendimento: boolean
          interesse: string | null
          motivo_perda: string | null
          nome: string
          origem: string | null
          package_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          user_id: string
          valor: number | null
          whatsapp: string
        }
        Insert: {
          cadencia_1?: string | null
          cadencia_2?: string | null
          cadencia_3?: string | null
          cadencia_4?: string | null
          cadencia_5?: string | null
          created_at?: string
          data_contato?: string | null
          data_entrada_contato_iniciado?: string | null
          data_entrada_contrato_enviado?: string | null
          data_entrada_fechado_ganho?: string | null
          data_entrada_fechado_perdido?: string | null
          data_entrada_follow_up?: string | null
          data_entrada_novo_lead?: string | null
          data_entrada_proposta_enviada?: string | null
          data_evento?: string | null
          data_fechamento?: string | null
          data_pedido?: string | null
          data_proposta?: string | null
          follow_up_1?: string | null
          follow_up_2?: string | null
          follow_up_3?: string | null
          follow_up_4?: string | null
          follow_up_5?: string | null
          id?: string
          iniciar_atendimento?: boolean
          interesse?: string | null
          motivo_perda?: string | null
          nome: string
          origem?: string | null
          package_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id: string
          valor?: number | null
          whatsapp: string
        }
        Update: {
          cadencia_1?: string | null
          cadencia_2?: string | null
          cadencia_3?: string | null
          cadencia_4?: string | null
          cadencia_5?: string | null
          created_at?: string
          data_contato?: string | null
          data_entrada_contato_iniciado?: string | null
          data_entrada_contrato_enviado?: string | null
          data_entrada_fechado_ganho?: string | null
          data_entrada_fechado_perdido?: string | null
          data_entrada_follow_up?: string | null
          data_entrada_novo_lead?: string | null
          data_entrada_proposta_enviada?: string | null
          data_evento?: string | null
          data_fechamento?: string | null
          data_pedido?: string | null
          data_proposta?: string | null
          follow_up_1?: string | null
          follow_up_2?: string | null
          follow_up_3?: string | null
          follow_up_4?: string | null
          follow_up_5?: string | null
          id?: string
          iniciar_atendimento?: boolean
          interesse?: string | null
          motivo_perda?: string | null
          nome?: string
          origem?: string | null
          package_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id?: string
          valor?: number | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          direction: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          direction?: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      package_services: {
        Row: {
          created_at: string
          id: string
          package_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_services_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          is_default: boolean
          nome: string
          preco_final: number | null
          user_id: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          is_default?: boolean
          nome: string
          preco_final?: number | null
          user_id?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          is_default?: boolean
          nome?: string
          preco_final?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          custo_interno: number | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
          valor_base: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          custo_interno?: number | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id: string
          valor_base?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          custo_interno?: number | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
          valor_base?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      lead_status:
        | "Novo Lead"
        | "Contato Iniciado"
        | "Fechado Perdido"
        | "Proposta Enviada"
        | "Follow-up"
        | "Fechado Ganho"
        | "Contrato Enviado"
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
      lead_status: [
        "Novo Lead",
        "Contato Iniciado",
        "Fechado Perdido",
        "Proposta Enviada",
        "Follow-up",
        "Fechado Ganho",
        "Contrato Enviado",
      ],
    },
  },
} as const
