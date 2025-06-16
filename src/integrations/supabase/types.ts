
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          segment: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          segment?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          segment?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          tenant_id: string | null
          role: string
          is_active: boolean | null
          created_at: string | null
          avatar_url: string | null
        }
        Insert: {
          id?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          tenant_id?: string | null
          role: string
          is_active?: boolean | null
          created_at?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          tenant_id?: string | null
          role?: string
          is_active?: boolean | null
          created_at?: string | null
          avatar_url?: string | null
        }
      }
      integrations: {
        Row: {
          id: string
          company_id: string | null
          google_ads_token: string | null
          meta_ads_token: string | null
          linkedin_ads_token: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id?: string | null
          google_ads_token?: string | null
          meta_ads_token?: string | null
          linkedin_ads_token?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string | null
          google_ads_token?: string | null
          meta_ads_token?: string | null
          linkedin_ads_token?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}
