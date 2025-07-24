export interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
  show_in_card?: boolean;
}

export interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  color: string;
  is_system_stage?: boolean;
  is_system?: boolean;
  stage_type?: 'default' | 'ganho' | 'perdido' | 'custom' | 'personalizado' | 'contato_inicial' | 'qualificado' | 'agendado' | 'proposta';
  description?: string;
  pipeline_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Lead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  custom_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  moved_at?: string;
  status?: 'active' | 'ganho' | 'perdido';
  assigned_to?: string;
  created_by?: string;
  source?: 'meta' | 'google' | 'linkedin' | 'webhook' | 'manual' | 'form';
  
  // ✅ ETAPA 3: CAMPO PARA SINCRONIZAÇÃO COM LEADS_MASTER
  lead_master_id?: string;
  
  // ✅ CORREÇÃO: Dados do leads_master incluídos diretamente via JOIN backend
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  estimated_value?: number;
  lead_temperature?: 'cold' | 'warm' | 'hot' | 'Frio'; // ✅ Baseado nos valores reais do Supabase
  lead_master_data?: any; // Referência completa ao leads_master para compatibilidade
  
  // 🌡️ SISTEMA DE TEMPERATURA AUTOMÁTICO
  temperature_level?: 'hot' | 'warm' | 'cold' | 'frozen';
  temperature_updated_at?: string;
  initial_stage_entry_time?: string;
  
  // 🎯 SISTEMA DE QUALIFICAÇÃO DE LEADS
  lifecycle_stage?: 'lead' | 'mql' | 'sql';
  
  // 📅 SISTEMA DE REUNIÕES
  attended_count?: number;
  no_show_count?: number;
}

export interface PipelineMember {
  id: string;
  pipeline_id: string;
  member_id: string;
  assigned_at: string;
  users?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // 📦 SISTEMA DE ARQUIVAMENTO
  is_active?: boolean;  // true = ativa, false = arquivada
  is_archived?: boolean;
  archived_at?: string;
  archived_by?: string;
  members?: PipelineMember[];
  stages?: PipelineStage[];
  custom_fields?: CustomField[];
  pipeline_stages?: PipelineStage[];
  pipeline_custom_fields?: CustomField[];
  pipeline_members?: PipelineMember[];
  
  // 🎯 SISTEMA DE QUALIFICAÇÃO DE LEADS
  qualification_rules?: any; // JSON das regras de qualificação
}
