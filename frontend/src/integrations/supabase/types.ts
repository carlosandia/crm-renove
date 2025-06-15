
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          segment: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          segment: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          segment?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          tenant_id: string
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          tenant_id: string
          role: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          tenant_id?: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          company_id: string
          google_ads_token?: string
          meta_ads_token?: string
          linkedin_ads_token?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          google_ads_token?: string
          meta_ads_token?: string
          linkedin_ads_token?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          google_ads_token?: string
          meta_ads_token?: string
          linkedin_ads_token?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
