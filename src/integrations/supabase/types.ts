export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          city: string
          country: string | null
          created_at: string | null
          email: string | null
          expected_followers_monthly: number
          expected_leads_monthly: number
          expected_sales_monthly: number
          id: string
          industry: string
          is_active: boolean | null
          name: string
          phone: string | null
          segment: string | null
          state: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          expected_followers_monthly?: number
          expected_leads_monthly?: number
          expected_sales_monthly?: number
          id?: string
          industry?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          segment?: string | null
          state?: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          expected_followers_monthly?: number
          expected_leads_monthly?: number
          expected_sales_monthly?: number
          id?: string
          industry?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          segment?: string | null
          state?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      custom_forms: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          pipeline_id: string | null
          qualification_rules: Json | null
          redirect_url: string | null
          settings: Json | null
          slug: string
          styling: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pipeline_id?: string | null
          qualification_rules?: Json | null
          redirect_url?: string | null
          settings?: Json | null
          slug: string
          styling?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pipeline_id?: string | null
          qualification_rules?: Json | null
          redirect_url?: string | null
          settings?: Json | null
          slug?: string
          styling?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          created_at: string | null
          day_offset: number
          id: string
          is_active: boolean | null
          note: string | null
          pipeline_id: string | null
          stage_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_offset: number
          id?: string
          is_active?: boolean | null
          note?: string | null
          pipeline_id?: string | null
          stage_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_offset?: number
          id?: string
          is_active?: boolean | null
          note?: string | null
          pipeline_id?: string | null
          stage_id?: string | null
        }
        Relationships: []
      }
      form_fields: {
        Row: {
          created_at: string | null
          field_description: string | null
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          form_id: string
          id: string
          is_required: boolean | null
          order_index: number
          placeholder: string | null
          styling: Json | null
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          field_description?: string | null
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type: string
          form_id: string
          id?: string
          is_required?: boolean | null
          order_index: number
          placeholder?: string | null
          styling?: Json | null
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          field_description?: string | null
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean | null
          order_index?: number
          placeholder?: string | null
          styling?: Json | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          form_id: string
          id: string
          ip_address: unknown | null
          is_qualified: boolean | null
          lead_id: string | null
          submission_data: Json
          submitted_at: string | null
          user_agent: string | null
        }
        Insert: {
          form_id: string
          id?: string
          ip_address?: unknown | null
          is_qualified?: boolean | null
          lead_id?: string | null
          submission_data: Json
          submitted_at?: string | null
          user_agent?: string | null
        }
        Update: {
          form_id?: string
          id?: string
          ip_address?: unknown | null
          is_qualified?: boolean | null
          lead_id?: string | null
          submission_data?: Json
          submitted_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          company_id: string | null
          created_at: string | null
          google_ads_token: string | null
          id: string
          linkedin_ads_token: string | null
          meta_ads_token: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          google_ads_token?: string | null
          id?: string
          linkedin_ads_token?: string | null
          meta_ads_token?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          google_ads_token?: string | null
          id?: string
          linkedin_ads_token?: string | null
          meta_ads_token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_description: string | null
          activity_title: string
          activity_type: string
          communication_direction: string | null
          completed: boolean | null
          created_at: string | null
          due_date: string | null
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          activity_description?: string | null
          activity_title: string
          activity_type: string
          communication_direction?: string | null
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          activity_description?: string | null
          activity_title?: string
          activity_type?: string
          communication_direction?: string | null
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_master"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_feedback: {
        Row: {
          comment: string
          created_at: string | null
          feedback_type: string
          id: string
          lead_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          feedback_type: string
          id?: string
          lead_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          feedback_type?: string
          id?: string
          lead_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          created_at: string | null
          id: string
          is_private: boolean | null
          lead_id: string
          note_content: string
          note_title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          lead_id: string
          note_content: string
          note_title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          lead_id?: string
          note_content?: string
          note_title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_master"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_opportunities: {
        Row: {
          closed_at: string | null
          created_at: string | null
          expected_close_date: string | null
          id: string
          lead_id: string
          lost_notes: string | null
          lost_reason: string | null
          opportunity_name: string
          opportunity_value: number | null
          pipeline_id: string | null
          probability: number | null
          stage_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id: string
          lost_notes?: string | null
          lost_reason?: string | null
          opportunity_name: string
          opportunity_value?: number | null
          pipeline_id?: string | null
          probability?: number | null
          stage_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string
          lost_notes?: string | null
          lost_reason?: string | null
          opportunity_name?: string
          opportunity_value?: number | null
          pipeline_id?: string | null
          probability?: number | null
          stage_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_master"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_master: {
        Row: {
          assigned_to: string | null
          campaign_name: string | null
          closed_date: string | null
          company: string | null
          company_id: string | null
          created_at: string | null
          created_by: string
          email: string
          estimated_value: number | null
          first_name: string
          id: string
          is_mql: boolean | null
          job_title: string | null
          last_contact_date: string | null
          last_name: string | null
          lead_score: number | null
          lead_source: string | null
          lead_temperature: string | null
          mql_date: string | null
          next_action_date: string | null
          origem: string | null
          phone: string | null
          probability: number | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          valor: number | null
        }
        Insert: {
          assigned_to?: string | null
          campaign_name?: string | null
          closed_date?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by: string
          email: string
          estimated_value?: number | null
          first_name: string
          id?: string
          is_mql?: boolean | null
          job_title?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_source?: string | null
          lead_temperature?: string | null
          mql_date?: string | null
          next_action_date?: string | null
          origem?: string | null
          phone?: string | null
          probability?: number | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor?: number | null
        }
        Update: {
          assigned_to?: string | null
          campaign_name?: string | null
          closed_date?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string
          email?: string
          estimated_value?: number | null
          first_name?: string
          id?: string
          is_mql?: boolean | null
          job_title?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_source?: string | null
          lead_temperature?: string | null
          mql_date?: string | null
          next_action_date?: string | null
          origem?: string | null
          phone?: string | null
          probability?: number | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_master_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_custom_fields: {
        Row: {
          created_at: string | null
          field_label: string
          field_name: string
          field_options: Json | null
          field_order: number | null
          field_type: string
          id: string
          is_required: boolean | null
          pipeline_id: string
          placeholder: string | null
          show_in_card: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          field_label: string
          field_name: string
          field_options?: Json | null
          field_order?: number | null
          field_type: string
          id?: string
          is_required?: boolean | null
          pipeline_id: string
          placeholder?: string | null
          show_in_card?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_order?: number | null
          field_type?: string
          id?: string
          is_required?: boolean | null
          pipeline_id?: string
          placeholder?: string | null
          show_in_card?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pipeline_leads: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string
          id: string
          lead_data: Json
          moved_at: string | null
          pipeline_id: string
          stage_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          lead_data?: Json
          moved_at?: string | null
          pipeline_id: string
          stage_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          lead_data?: Json
          moved_at?: string | null
          pipeline_id?: string
          stage_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pipeline_members: {
        Row: {
          assigned_at: string | null
          id: string
          member_id: string | null
          pipeline_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          member_id?: string | null
          pipeline_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          id?: string
          member_id?: string | null
          pipeline_id?: string | null
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          max_days_allowed: number | null
          name: string
          order_index: number
          pipeline_id: string | null
          temperature_score: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          max_days_allowed?: number | null
          name: string
          order_index: number
          pipeline_id?: string | null
          temperature_score?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          max_days_allowed?: number | null
          name?: string
          order_index?: number
          pipeline_id?: string | null
          temperature_score?: number | null
        }
        Relationships: []
      }
      pipeline_win_loss_reasons: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          pipeline_id: string
          reason_name: string
          reason_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pipeline_id: string
          reason_name: string
          reason_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pipeline_id?: string
          reason_name?: string
          reason_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_win_loss_reasons_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_goals: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_value: number | null
          goal_type: string | null
          goal_value: number
          id: string
          period: string | null
          status: string | null
          target_date: string
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          goal_type?: string | null
          goal_value: number
          id?: string
          period?: string | null
          status?: string | null
          target_date: string
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          goal_type?: string | null
          goal_value?: number
          id?: string
          period?: string | null
          status?: string | null
          target_date?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_conditions: {
        Row: {
          action: string
          created_at: string | null
          field_name: string
          field_value: string | null
          id: string
          operator: string
          task_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          field_name: string
          field_value?: string | null
          id?: string
          operator: string
          task_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          field_name?: string
          field_value?: string | null
          id?: string
          operator?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_conditions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "sequence_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_task_index: number | null
          id: string
          last_executed_at: string | null
          lead_id: string
          metadata: Json | null
          sequence_id: string
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_task_index?: number | null
          id?: string
          last_executed_at?: string | null
          lead_id: string
          metadata?: Json | null
          sequence_id: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_task_index?: number | null
          id?: string
          last_executed_at?: string | null
          lead_id?: string
          metadata?: Json | null
          sequence_id?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pipeline_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_executions_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_task_executions: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          execution_id: string
          id: string
          notes: string | null
          result_data: Json | null
          scheduled_for: string | null
          started_at: string | null
          status: string | null
          task_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          execution_id: string
          id?: string
          notes?: string | null
          result_data?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
          task_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          execution_id?: string
          id?: string
          notes?: string | null
          result_data?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_task_executions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_task_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "sequence_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_task_executions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "sequence_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_tasks: {
        Row: {
          auto_complete: boolean | null
          created_at: string | null
          delay_days: number | null
          delay_hours: number | null
          description: string | null
          id: string
          is_required: boolean | null
          order_index: number | null
          sequence_id: string
          task_type: string
          template_content: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          auto_complete?: boolean | null
          created_at?: string | null
          delay_days?: number | null
          delay_hours?: number | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          sequence_id: string
          task_type: string
          template_content?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          auto_complete?: boolean | null
          created_at?: string | null
          delay_days?: number | null
          delay_hours?: number | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          sequence_id?: string
          task_type?: string
          template_content?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_tasks_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          pipeline_id: string | null
          stage_id: string | null
          tenant_id: string
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pipeline_id?: string | null
          stage_id?: string | null
          tenant_id: string
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pipeline_id?: string | null
          stage_id?: string | null
          tenant_id?: string
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_templates_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_templates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_pipeline_links: {
        Row: {
          created_at: string | null
          id: string
          pipeline_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pipeline_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pipeline_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pipeline_links_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pipeline_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          role: string
          tenant_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          role: string
          tenant_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          role?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_admin_user: {
        Args: { p_admin_email: string; p_tenant_id: string }
        Returns: Json
      }
      activate_pending_admin: {
        Args: { p_admin_email: string; p_tenant_id: string }
        Returns: Json
      }
      assign_existing_user_as_admin: {
        Args: { p_user_id: string; p_tenant_id: string }
        Returns: Json
      }
      assign_user_as_company_admin: {
        Args: { p_user_email: string; p_tenant_id: string }
        Returns: Json
      }
      auto_detect_inactive_leads: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calc_conversion_funnel: {
        Args: {
          p_tenant_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          stage: string
          count: number
          percentage: number
          value: number
        }[]
      }
      calculate_cpl: {
        Args: {
          p_campaign_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: number
      }
      calculate_goal_progress: {
        Args: { p_goal_id: string }
        Returns: Json
      }
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_client_with_salesperson: {
        Args: {
          p_client_nome: string
          p_client_segmento: string
          p_client_regiao: string
          p_vendedor_nome: string
          p_vendedor_email: string
          p_client_email?: string
          p_vendedor_telefone?: string
        }
        Returns: Json
      }
      create_company_with_admin: {
        Args:
          | {
              p_company_nome: string
              p_company_segmento: string
              p_company_regiao: string
              p_admin_nome: string
              p_admin_email: string
              p_admin_telefone?: string
            }
          | {
              p_company_nome: string
              p_company_segmento: string
              p_company_regiao: string
              p_admin_nome: string
              p_admin_email: string
              p_admin_telefone?: string
              p_company_email?: string
            }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_tenant_id: string
          p_user_id: string
          p_notification_type: string
          p_title: string
          p_message: string
          p_priority?: string
          p_action_url?: string
          p_metadata?: Json
          p_expires_hours?: number
        }
        Returns: string
      }
      create_vendedor: {
        Args: {
          p_nome: string
          p_email: string
          p_telefone?: string
          p_tenant_id?: string
        }
        Returns: Json
      }
      exec_sql: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      fix_existing_admin_auth: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
      generate_temp_password_for_admin: {
        Args: { p_admin_email: string }
        Returns: Json
      }
      generate_unique_slug: {
        Args: { base_name: string }
        Returns: string
      }
      get_client_stats: {
        Args: { p_client_id: string }
        Returns: Json
      }
      get_companies_performance_report: {
        Args: {
          p_start_date?: string
          p_end_date?: string
          p_company_filter?: string
          p_origem_filter?: string
        }
        Returns: {
          company_id: string
          company_name: string
          city: string
          state: string
          industry: string
          expected_leads_monthly: number
          leads_received: number
          expected_sales_monthly: number
          sales_closed: number
          expected_followers_monthly: number
          conversion_rate: number
          avg_ticket: number
          origem_breakdown: Json
          time_to_mql_days: number
          time_to_close_days: number
          stalled_leads: number
        }[]
      }
      get_companies_with_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          client_id: string
          company_name: string
          company_segment: string
          company_region: string
          company_email: string
          company_status: string
          tenant_id: string
          tenant_slug: string
          is_active: boolean
          created_at: string
          admin_id: string
          admin_name: string
          admin_email: string
          admin_is_active: boolean
          admin_has_auth: boolean
          admin_temp_password: string
          admin_last_login: string
        }[]
      }
      get_company_full_stats: {
        Args: { p_client_id: string }
        Returns: Json
      }
      get_company_metrics: {
        Args: {
          p_company_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: Json
      }
      get_consolidated_metrics: {
        Args: { p_start_date?: string; p_end_date?: string }
        Returns: Json
      }
      get_current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_detailed_client_stats: {
        Args: { p_client_id: string }
        Returns: Json
      }
      get_pending_admin_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          first_name: string
          last_name: string
          tenant_id: string
          tenant_name: string
          created_at: string
          has_auth_user: boolean
        }[]
      }
      get_performance_stats: {
        Args: { p_tenant_id: string; p_hours?: number }
        Returns: Json
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      process_admin_signup: {
        Args: { p_email: string; p_auth_user_id: string }
        Returns: Json
      }
      process_automation_trigger: {
        Args: { p_trigger_type: string; p_tenant_id: string; p_payload?: Json }
        Returns: undefined
      }
      refresh_kpi_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      setup_test_user: {
        Args: { user_email: string }
        Returns: Json
      }
      sync_existing_admin_with_auth: {
        Args: { p_admin_email: string }
        Returns: Json
      }
      toggle_admin_status: {
        Args: {
          p_admin_email: string
          p_tenant_id: string
          p_new_status: boolean
        }
        Returns: Json
      }
    }
    Enums: {
      user_role: "super_admin" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["super_admin", "admin", "member"],
    },
  },
} as const
