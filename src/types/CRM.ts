// =====================================================
// CRM TYPES - NEW STRUCTURE (Salesforce/HubSpot pattern)
// =====================================================

// ============================================
// ✅ CATEGORIA 5.1: TIPOS ESPECÍFICOS - INTERFACES CUSTOMIZADAS
// ============================================

/**
 * ✅ SUBSTITUIÇÃO: settings: Record<string, any> → interface CompanySettings
 * Configurações específicas da empresa baseadas na análise de uso real
 */
export interface CompanySettings {
  // Form Builder & Lead Qualification
  qualification_rules?: {
    prevent_duplicates?: boolean;
    capture_ip?: boolean;
    capture_user_agent?: boolean;
    require_company?: boolean;
    job_titles?: string;
    states?: string;
    min_value?: string;
  };
  
  // WhatsApp Integration
  whatsapp_number?: string;
  whatsapp_message?: string;
  
  // Form Settings
  success_message?: string;
  enable_double_optin?: boolean;
  redirect_url?: string;
  pipeline_id?: string;
  assigned_to?: string;
  enable_captcha?: boolean;
  enable_analytics?: boolean;
  
  // Global Tracking
  globalSettings?: {
    defaultCurrency?: string;
    trackingEnabled?: boolean;
    debugMode?: boolean;
  };
  
  // Notification Settings
  notification_settings?: {
    showNotifications?: boolean;
    autoHide?: boolean;
    hideDelay?: number;
    successMessage?: string;
    errorMessage?: string;
    successBackgroundColor?: string;
    successTextColor?: string;
    errorBackgroundColor?: string;
    errorTextColor?: string;
  };
  
  // Email Settings
  email_settings?: {
    enabled?: boolean;
    recipients?: string[];
    subject?: string;
    template?: string;
    sendOnSubmit?: boolean;
    sendOnWhatsApp?: boolean;
    includeLeadData?: boolean;
    includeMQLScore?: boolean;
  };
  
  // Extensible for future settings
  [key: string]: unknown;
}

/**
 * ✅ SUBSTITUIÇÃO: custom_data: Record<string, any> → interface LeadCustomData
 * Dados customizados do lead baseados na análise de uso real
 */
export interface LeadCustomData {
  // Contact Information (Portuguese/English variants)
  email?: string;
  Email?: string;
  
  // Name fields
  first_name?: string;
  last_name?: string;
  nome?: string;
  sobrenome?: string;
  
  // Phone fields
  phone?: string;
  telefone?: string;
  
  // Company fields
  company?: string;
  empresa?: string;
  
  // Form tracking fields
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  
  // Lead scoring and qualification
  lead_score?: number;
  is_mql?: boolean;
  qualification_status?: 'pending' | 'qualified' | 'unqualified';
  
  // Extensible for custom pipeline fields
  [key: string]: unknown;
}

// ============================================
// CORE ENTITIES
// ============================================

export interface Company {
  id: string;
  name: string;
  domain?: string;
  settings: CompanySettings; // ✅ CATEGORIA 5.1: Record<string, any> → CompanySettings
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role: 'super_admin' | 'admin' | 'manager' | 'sales_rep';
  company_id: string;
  manager_id?: string;
  team_id?: string;
  is_active: boolean;
  tenant_id?: string; // Legacy field
  created_at: string;
  
  // Relations
  company?: Company;
  manager?: User;
  team_members?: User[];
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Legacy fields (keep for compatibility)
  tenant_id?: string;
  
  // Relations
  company?: Company;
  creator?: User;
  stages?: PipelineStage[];
  custom_fields?: PipelineCustomField[];
  leads?: Lead[];
  
  // Legacy relations (for backward compatibility)
  pipeline_stages?: PipelineStage[];
  pipeline_custom_fields?: PipelineCustomField[];
  pipeline_members?: PipelineMember[]; // Will be deprecated
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  order_index: number;
  color: string;
  temperature_score?: number;
  is_system_stage?: boolean;
  created_at: string;
  
  // Relations
  pipeline?: Pipeline;
  leads?: Lead[];
}

export interface PipelineCustomField {
  id: string;
  pipeline_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
  show_in_card?: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  pipeline?: Pipeline;
}

// ============================================
// LEAD ENTITY (NEW STRUCTURE)
// ============================================

export interface Lead {
  id: string;
  company_id: string;
  pipeline_id: string;
  stage_id: string;
  owner_id: string; // Single owner (Salesforce pattern)
  
  // Lead data
  title: string;
  value: number;
  currency: string;
  probability: number;
  expected_close_date?: string;
  
  // Contact information
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  
  // Metadata
  source: string;
  custom_data: LeadCustomData; // ✅ CATEGORIA 5.1: Record<string, any> → LeadCustomData
  
  // Audit fields
  created_by: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  
  // Legacy fields (for backward compatibility)
  assigned_to?: string;
  moved_at?: string;
  status?: 'active' | 'won' | 'lost';
  
  // Relations
  company?: Company;
  pipeline?: Pipeline;
  stage?: PipelineStage;
  owner?: User;
  creator?: User;
}

// ============================================
// LEGACY TYPES (Keep for compatibility)
// ============================================

export interface PipelineMember {
  id: string;
  pipeline_id: string;
  member_id: string;
  user_id: string; // Alternative naming
  assigned_at: string;
  
  // Relations
  users?: User;
  user?: User;
  pipeline?: Pipeline;
}

// Legacy Lead interface (for backward compatibility)
export interface LegacyLead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  custom_data: LeadCustomData; // ✅ CATEGORIA 5.1: Record<string, any> → LeadCustomData
  created_at: string;
  updated_at: string;
  moved_at?: string;
  status?: 'active' | 'won' | 'lost';
  assigned_to?: string;
  created_by?: string;
  source?: 'meta' | 'google' | 'linkedin' | 'webhook' | 'manual' | 'form';
}

// ============================================
// API TYPES
// ============================================

export interface LeadFilters {
  owner_id?: string;
  stage_id?: string;
  search?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
}

export interface CreateLeadData {
  pipeline_id: string;
  stage_id: string;
  title: string;
  value?: number;
  probability?: number;
  expected_close_date?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  source?: string;
  custom_data?: LeadCustomData; // ✅ CATEGORIA 5.1: Record<string, any> → LeadCustomData
}

export interface UpdateLeadData {
  title?: string;
  value?: number;
  probability?: number;
  expected_close_date?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  stage_id?: string;
  owner_id?: string;
  custom_data?: LeadCustomData; // ✅ CATEGORIA 5.1: Record<string, any> → LeadCustomData
}

export interface UserPermissions {
  canViewAllLeads: boolean;
  canEditAllLeads: boolean;
  canManageTeam: boolean;
  canManagePipelines: boolean;
  canViewReports: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  pipeline: Pipeline;
  stages: PipelineStage[];
  team_members: User[];
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface PipelineMetrics {
  total_leads: number;
  total_value: number;
  conversion_rate: number;
  average_deal_size: number;
  leads_by_stage: Array<{
    stage_id: string;
    stage_name: string;
    count: number;
    value: number;
    color: string;
  }>;
  leads_by_owner: Array<{
    owner_id: string;
    owner_name: string;
    count: number;
    value: number;
    conversion_rate: number;
  }>;
  recent_activity: Array<{
    lead_id: string;
    lead_title: string;
    owner_name: string;
    action: string;
    timestamp: string;
  }>;
}

export interface TeamMetrics {
  team_members: Array<{
    user_id: string;
    name: string;
    role: string;
    leads_count: number;
    deals_value: number;
    conversion_rate: number;
    last_activity: string;
  }>;
  top_performers: Array<{
    user_id: string;
    name: string;
    metric: string;
    value: number;
  }>;
}

// ============================================
// COMPONENT PROPS TYPES
// ============================================

export interface PipelineKanbanProps {
  pipeline: Pipeline;
  leads: Lead[];
  stages: PipelineStage[];
  customFields: PipelineCustomField[];
  filters?: LeadFilters;
  onLeadUpdate: (leadId: string, data: UpdateLeadData) => void;
  onLeadMove: (leadId: string, stageId: string) => void;
  onLeadCreate: (data: CreateLeadData) => void;
  canEdit?: boolean;
}

export interface LeadCardProps {
  lead: Lead;
  customFields: PipelineCustomField[];
  onEdit: (lead: Lead) => void;
  onMove: (leadId: string, stageId: string) => void;
  canEdit?: boolean;
}

export interface ManagerialViewProps {
  pipeline: Pipeline;
  teamMembers: User[];
  selectedOwner?: string;
  onOwnerFilter: (ownerId: string | null) => void;
  metrics: PipelineMetrics;
}

// ============================================
// UTILITY TYPES
// ============================================

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'sales_rep';
export type LeadSource = 'meta' | 'google' | 'linkedin' | 'webhook' | 'manual' | 'form';
export type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';

// Role-based type guards
export const isAdmin = (user: User): boolean => ['super_admin', 'admin'].includes(user.role);
export const isManager = (user: User): boolean => ['super_admin', 'admin', 'manager'].includes(user.role);
export const canViewAllLeads = (user: User): boolean => ['super_admin', 'admin'].includes(user.role);
// ============================================
// MIGRATION HELPERS
// ============================================

// Convert legacy lead to new lead structure
export const migrateLegacyLead = (legacyLead: LegacyLead, companyId: string, ownerId: string): Partial<Lead> => {
  const customData = legacyLead.custom_data || {};
  
  return {
    id: legacyLead.id,
    company_id: companyId,
    pipeline_id: legacyLead.pipeline_id,
    stage_id: legacyLead.stage_id,
    owner_id: legacyLead.assigned_to || ownerId,
    title: String((customData as any).nome_lead || (customData as any).title || 'Lead sem título'),
    value: Number((customData as any).value) || 0,
    currency: 'BRL',
    probability: 0,
    contact_name: String((customData as any).nome_lead || ''),
    contact_email: String((customData as any).email || ''),
    contact_phone: String((customData as any).telefone || (customData as any).phone || ''),
    company_name: String((customData as any).empresa || (customData as any).company || ''),
    source: legacyLead.source || 'manual',
    custom_data: legacyLead.custom_data,
    created_by: legacyLead.created_by || ownerId,
    created_at: legacyLead.created_at,
    updated_at: legacyLead.updated_at,
    last_activity_at: legacyLead.moved_at || legacyLead.updated_at,
    
    // Keep legacy fields for compatibility
    assigned_to: legacyLead.assigned_to,
    moved_at: legacyLead.moved_at,
    status: legacyLead.status
  };
};
