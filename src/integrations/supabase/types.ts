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
      ai_config: {
        Row: {
          ai_trigger_enabled: boolean
          ai_trigger_keyword: string | null
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          model: string
          provider: string
          system_prompt: string | null
          temperature: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_trigger_enabled?: boolean
          ai_trigger_keyword?: string | null
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model: string
          provider: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_trigger_enabled?: boolean
          ai_trigger_keyword?: string | null
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string
          provider?: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_files: {
        Row: {
          created_at: string | null
          description: string | null
          file_size_bytes: number | null
          file_type: string
          file_url: string
          id: string
          name: string
          send_condition: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_size_bytes?: number | null
          file_type: string
          file_url: string
          id?: string
          name: string
          send_condition?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_size_bytes?: number | null
          file_type?: string
          file_url?: string
          id?: string
          name?: string
          send_condition?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cpf_cnpj: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          updated_at: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      cobrancas: {
        Row: {
          asaas_billet_url: string | null
          asaas_id: string | null
          asaas_invoice_url: string | null
          asaas_pix_code: string | null
          cliente_id: string | null
          created_at: string
          data_pagamento: string | null
          deleted_at: string | null
          descricao: string | null
          forma_pagamento: Database["public"]["Enums"]["payment_method"]
          grupo_id: string | null
          id: string
          lead_id: string | null
          parcela_numero: number | null
          parcela_total: number | null
          status: Database["public"]["Enums"]["cobranca_status"]
          tipo: Database["public"]["Enums"]["cobranca_tipo"]
          updated_at: string
          user_id: string
          valor: number
          vencimento: string
        }
        Insert: {
          asaas_billet_url?: string | null
          asaas_id?: string | null
          asaas_invoice_url?: string | null
          asaas_pix_code?: string | null
          cliente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          forma_pagamento?: Database["public"]["Enums"]["payment_method"]
          grupo_id?: string | null
          id?: string
          lead_id?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          status?: Database["public"]["Enums"]["cobranca_status"]
          tipo?: Database["public"]["Enums"]["cobranca_tipo"]
          updated_at?: string
          user_id: string
          valor?: number
          vencimento: string
        }
        Update: {
          asaas_billet_url?: string | null
          asaas_id?: string | null
          asaas_invoice_url?: string | null
          asaas_pix_code?: string | null
          cliente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          forma_pagamento?: Database["public"]["Enums"]["payment_method"]
          grupo_id?: string | null
          id?: string
          lead_id?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          status?: Database["public"]["Enums"]["cobranca_status"]
          tipo?: Database["public"]["Enums"]["cobranca_tipo"]
          updated_at?: string
          user_id?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          arquivo_contrato_url: string | null
          autentique_document_id: string | null
          cliente_id: string | null
          cpf_cnpj: string | null
          created_at: string
          data_evento: string | null
          deleted_at: string | null
          email: string | null
          endereco_cliente: string | null
          forma_pagamento: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          lead_id: string | null
          local_evento: string | null
          nome_cliente: string
          observacoes: string | null
          pacote: string | null
          status: string
          tipo_servico: string | null
          updated_at: string
          user_id: string
          valor: number | null
          whatsapp: string | null
        }
        Insert: {
          arquivo_contrato_url?: string | null
          autentique_document_id?: string | null
          cliente_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_evento?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco_cliente?: string | null
          forma_pagamento?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          lead_id?: string | null
          local_evento?: string | null
          nome_cliente: string
          observacoes?: string | null
          pacote?: string | null
          status?: string
          tipo_servico?: string | null
          updated_at?: string
          user_id: string
          valor?: number | null
          whatsapp?: string | null
        }
        Update: {
          arquivo_contrato_url?: string | null
          autentique_document_id?: string | null
          cliente_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_evento?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco_cliente?: string | null
          forma_pagamento?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          lead_id?: string | null
          local_evento?: string | null
          nome_cliente?: string
          observacoes?: string | null
          pacote?: string | null
          status?: string
          tipo_servico?: string | null
          updated_at?: string
          user_id?: string
          valor?: number | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: string
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string
          evento_id: string | null
          forma_pagamento: Database["public"]["Enums"]["payment_method"]
          grupo_id: string | null
          id: string
          observacoes: string | null
          parcela_numero: number | null
          parcela_total: number | null
          recorrente: boolean
          status: Database["public"]["Enums"]["despesa_status"]
          team_member_id: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data: string
          deleted_at?: string | null
          descricao: string
          evento_id?: string | null
          forma_pagamento?: Database["public"]["Enums"]["payment_method"]
          grupo_id?: string | null
          id?: string
          observacoes?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          recorrente?: boolean
          status?: Database["public"]["Enums"]["despesa_status"]
          team_member_id?: string | null
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string
          evento_id?: string | null
          forma_pagamento?: Database["public"]["Enums"]["payment_method"]
          grupo_id?: string | null
          id?: string
          observacoes?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          recorrente?: boolean
          status?: Database["public"]["Enums"]["despesa_status"]
          team_member_id?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_team_member_fk"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_team_members: {
        Row: {
          created_at: string
          event_id: string
          id: string
          team_member_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          team_member_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_team_members_event_fk"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_team_members_member_fk"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_evento: string
          deleted_at: string | null
          descricao: string | null
          id: string
          lead_id: string | null
          local: string | null
          responsavel_proprio: boolean
          service_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_evento: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          local?: string | null
          responsavel_proprio?: boolean
          service_id?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_evento?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          local?: string | null
          responsavel_proprio?: boolean
          service_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_conversations: {
        Row: {
          ai_enabled: boolean | null
          assigned_to: string | null
          contact_name: string | null
          contact_number: string
          created_at: string
          id: string
          instance_id: string | null
          is_group: boolean | null
          last_message: string | null
          lead_id: string | null
          status: Database["public"]["Enums"]["inbox_status"]
          unread_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_enabled?: boolean | null
          assigned_to?: string | null
          contact_name?: string | null
          contact_number: string
          created_at?: string
          id?: string
          instance_id?: string | null
          is_group?: boolean | null
          last_message?: string | null
          lead_id?: string | null
          status?: Database["public"]["Enums"]["inbox_status"]
          unread_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_enabled?: boolean | null
          assigned_to?: string | null
          contact_name?: string | null
          contact_number?: string
          created_at?: string
          id?: string
          instance_id?: string | null
          is_group?: boolean | null
          last_message?: string | null
          lead_id?: string | null
          status?: Database["public"]["Enums"]["inbox_status"]
          unread_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          direction: string
          id: string
          is_note: boolean | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          read: boolean | null
          timestamp: string | null
          type: string | null
          user_id: string
          whatsapp_message_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          is_note?: boolean | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          read?: boolean | null
          timestamp?: string | null
          type?: string | null
          user_id: string
          whatsapp_message_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          is_note?: boolean | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          read?: boolean | null
          timestamp?: string | null
          type?: string | null
          user_id?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_quick_replies: {
        Row: {
          body: string
          created_at: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      inbox_triggers: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          keyword: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          keyword: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          keyword?: string
          user_id?: string
        }
        Relationships: []
      }
      interesse_options: {
        Row: {
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
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
          cliente_id: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          due_time: string | null
          id: string
          is_cadence: boolean
          lead_id: string | null
          task_number: number
          title: string
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          is_cadence?: boolean
          lead_id?: string | null
          task_number?: number
          title: string
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          is_cadence?: boolean
          lead_id?: string | null
          task_number?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tasks_cliente_fk"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
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
          ai_paused: boolean | null
          budget: string | null
          cadencia_1: string | null
          cadencia_2: string | null
          cadencia_3: string | null
          cadencia_4: string | null
          cadencia_5: string | null
          city: string | null
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
          deleted_at: string | null
          follow_up_1: string | null
          follow_up_2: string | null
          follow_up_3: string | null
          follow_up_4: string | null
          follow_up_5: string | null
          id: string
          iniciar_atendimento: boolean
          interesse: string | null
          last_message_at: string | null
          motivo_perda: string | null
          nome: string
          observacao_perda: string | null
          origem: string | null
          package_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          triagem_at: string | null
          unread_count: number | null
          updated_at: string
          user_id: string
          valor: number | null
          whatsapp: string
          whatsapp_instance_id: string | null
        }
        Insert: {
          ai_paused?: boolean | null
          budget?: string | null
          cadencia_1?: string | null
          cadencia_2?: string | null
          cadencia_3?: string | null
          cadencia_4?: string | null
          cadencia_5?: string | null
          city?: string | null
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
          deleted_at?: string | null
          follow_up_1?: string | null
          follow_up_2?: string | null
          follow_up_3?: string | null
          follow_up_4?: string | null
          follow_up_5?: string | null
          id?: string
          iniciar_atendimento?: boolean
          interesse?: string | null
          last_message_at?: string | null
          motivo_perda?: string | null
          nome: string
          observacao_perda?: string | null
          origem?: string | null
          package_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          triagem_at?: string | null
          unread_count?: number | null
          updated_at?: string
          user_id: string
          valor?: number | null
          whatsapp: string
          whatsapp_instance_id?: string | null
        }
        Update: {
          ai_paused?: boolean | null
          budget?: string | null
          cadencia_1?: string | null
          cadencia_2?: string | null
          cadencia_3?: string | null
          cadencia_4?: string | null
          cadencia_5?: string | null
          city?: string | null
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
          deleted_at?: string | null
          follow_up_1?: string | null
          follow_up_2?: string | null
          follow_up_3?: string | null
          follow_up_4?: string | null
          follow_up_5?: string | null
          id?: string
          iniciar_atendimento?: boolean
          interesse?: string | null
          last_message_at?: string | null
          motivo_perda?: string | null
          nome?: string
          observacao_perda?: string | null
          origem?: string | null
          package_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          triagem_at?: string | null
          unread_count?: number | null
          updated_at?: string
          user_id?: string
          valor?: number | null
          whatsapp?: string
          whatsapp_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_whatsapp_instance_id_fkey"
            columns: ["whatsapp_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
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
      meta_daily_ads: {
        Row: {
          ad_account_id: string
          ad_id: string | null
          ad_name: string
          adset_id: string | null
          adset_name: string
          campaign_id: string | null
          campaign_name: string
          campaign_objective: string | null
          clicks: number
          client_id: string | null
          cost_per_messaging_conversation: number | null
          cost_per_result: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number
          messaging_conversations_started: number
          reach: number
          result_type: string | null
          results: number
          spend: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          ad_id?: string | null
          ad_name: string
          adset_id?: string | null
          adset_name: string
          campaign_id?: string | null
          campaign_name: string
          campaign_objective?: string | null
          clicks?: number
          client_id?: string | null
          cost_per_messaging_conversation?: number | null
          cost_per_result?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number
          messaging_conversations_started?: number
          reach?: number
          result_type?: string | null
          results?: number
          spend?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          ad_id?: string | null
          ad_name?: string
          adset_id?: string | null
          adset_name?: string
          campaign_id?: string | null
          campaign_name?: string
          campaign_objective?: string | null
          clicks?: number
          client_id?: string | null
          cost_per_messaging_conversation?: number | null
          cost_per_result?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number
          messaging_conversations_started?: number
          reach?: number
          result_type?: string | null
          results?: number
          spend?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
          asaas_api_key: string | null
          autentique_token: string | null
          avatar_url: string | null
          cpl_limite_alerta: number | null
          cpl_limite_bom: number | null
          created_at: string
          email: string | null
          id: string
          meta_ad_account_id: string | null
          nome: string
          senha: string | null
          ultimo_acesso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_api_key?: string | null
          autentique_token?: string | null
          avatar_url?: string | null
          cpl_limite_alerta?: number | null
          cpl_limite_bom?: number | null
          created_at?: string
          email?: string | null
          id?: string
          meta_ad_account_id?: string | null
          nome: string
          senha?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_api_key?: string | null
          autentique_token?: string | null
          avatar_url?: string | null
          cpl_limite_alerta?: number | null
          cpl_limite_bom?: number | null
          created_at?: string
          email?: string | null
          id?: string
          meta_ad_account_id?: string | null
          nome?: string
          senha?: string | null
          ultimo_acesso?: string | null
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
          valor_base?: number
        }
        Relationships: []
      }
      team_members: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          funcao: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          funcao?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          event: string | null
          id: string
          instance_key: string | null
          payload: Json | null
          processed: boolean | null
        }
        Insert: {
          created_at?: string | null
          event?: string | null
          id?: string
          instance_key?: string | null
          payload?: Json | null
          processed?: boolean | null
        }
        Update: {
          created_at?: string | null
          event?: string | null
          id?: string
          instance_key?: string | null
          payload?: Json | null
          processed?: boolean | null
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          api_key: string | null
          base_url: string | null
          created_at: string | null
          id: string
          instance_key: string | null
          name: string
          phone_number: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string | null
          id?: string
          instance_key?: string | null
          name: string
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string | null
          id?: string
          instance_key?: string | null
          name?: string
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      cobranca_status: "aguardando" | "paga" | "vencida"
      cobranca_tipo: "unica" | "parcela" | "recorrente"
      despesa_status: "paga" | "prevista"
      inbox_status: "pending_ai" | "open" | "closed"
      lead_status:
        | "Novo Lead"
        | "Contato Iniciado"
        | "Fechado Perdido"
        | "Triagem Feita"
        | "Proposta Enviada"
        | "Follow-up"
        | "Fechado Ganho"
        | "Contrato Enviado"
      payment_method: "pix" | "cartao" | "boleto" | "transferencia" | "dinheiro"
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
      app_role: ["admin", "user"],
      cobranca_status: ["aguardando", "paga", "vencida"],
      cobranca_tipo: ["unica", "parcela", "recorrente"],
      despesa_status: ["paga", "prevista"],
      inbox_status: ["pending_ai", "open", "closed"],
      lead_status: [
        "Novo Lead",
        "Contato Iniciado",
        "Fechado Perdido",
        "Triagem Feita",
        "Proposta Enviada",
        "Follow-up",
        "Fechado Ganho",
        "Contrato Enviado",
      ],
      payment_method: ["pix", "cartao", "boleto", "transferencia", "dinheiro"],
    },
  },
} as const
