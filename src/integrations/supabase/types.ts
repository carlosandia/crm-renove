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
          created_at: string | null
          id: string
          name: string
          segment: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          segment?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          segment?: string | null
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
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
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
