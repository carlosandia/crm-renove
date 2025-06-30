/**
 * ============================================
 * 🔧 CATEGORIA 7.2: TYPE TESTING - CRM TYPES
 * ============================================
 * 
 * Testes de tipo para validar os tipos específicos do CRM
 */

import type {
  Lead,
  Company,
  Pipeline,
  PipelineStage,
  PipelineCustomField,
  LeadCustomData,
  CompanySettings,
  UserRole,
  LeadSource,
  FieldType,
  CreateLeadData,
  UpdateLeadData
} from '../CRM';

// ✅ TESTES LEAD
const lead: Lead = {
  id: 'lead-123',
  company_id: 'company-123',
  pipeline_id: 'pipeline-123',
  stage_id: 'stage-123',
  owner_id: 'user-123',
  title: 'Novo Lead - Empresa XYZ',
  value: 50000,
  currency: 'BRL',
  probability: 85,
  expected_close_date: '2024-02-01',
  contact_name: 'João Silva',
  contact_email: 'joao@empresaxyz.com',
  contact_phone: '+55 11 99999-9999',
  company_name: 'Empresa XYZ',
  source: 'linkedin',
  
  // Custom data estruturado
  custom_data: {
    // Form data
    form_id: 'form-123',
    form_name: 'Contato Comercial',
    
    // UTM tracking
    utm_source: 'linkedin',
    utm_medium: 'social',
    utm_campaign: 'crm-launch-2024',
    utm_content: 'banner-cta',
    utm_term: 'crm software',
    
    // Lead scoring
    lead_score: 85,
    is_mql: true,
    qualification_status: 'qualified'
  },
  
  created_by: 'user-456',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  last_activity_at: '2024-01-01T10:00:00Z'
};

// ✅ TESTES COMPANY
const company: Company = {
  id: 'company-123',
  name: 'Empresa Teste LTDA',
  domain: 'empresateste.com',
  
  // Settings estruturadas
  settings: {
    // Business rules
    qualification_rules: {
      prevent_duplicates: true,
      capture_ip: true,
      capture_user_agent: true,
      require_company: false
    },
    
    // WhatsApp
    whatsapp_number: '+55 11 99999-9999',
    whatsapp_message: 'Olá! Obrigado pelo interesse.',
    
    // Form settings
    success_message: 'Obrigado! Entraremos em contato.',
    enable_double_optin: false,
    redirect_url: 'https://empresateste.com/obrigado',
    pipeline_id: 'pipeline-123',
    assigned_to: 'user-123',
    enable_captcha: true,
    enable_analytics: true
  },
  
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T10:00:00Z'
};

// ✅ TESTES PIPELINE
const pipeline: Pipeline = {
  id: 'pipeline-123',
  name: 'Pipeline Vendas B2B',
  description: 'Pipeline principal para vendas empresariais',
  company_id: 'company-123',
  is_active: true,
  created_by: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T10:00:00Z'
};

// ✅ TESTES PIPELINESTAGE
const pipelineStage: PipelineStage = {
  id: 'stage-123',
  pipeline_id: 'pipeline-123',
  name: 'Qualificação',
  order_index: 2,
  color: '#fbbf24',
  temperature_score: 40,
  is_system_stage: false,
  created_at: '2024-01-01T00:00:00Z'
};

// ✅ TESTES PIPELINECUSTOMFIELD
const customField: PipelineCustomField = {
  id: 'field-123',
  pipeline_id: 'pipeline-123',
  field_name: 'budget',
  field_label: 'Orçamento Disponível',
  field_type: 'text',
  is_required: false,
  field_order: 1,
  placeholder: 'Ex: R$ 10.000,00',
  show_in_card: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T10:00:00Z'
};

// ✅ TESTES ENUMS E UNIONS
const userRole: UserRole = 'admin';
const leadSource: LeadSource = 'google';
const fieldType: FieldType = 'email';

// ✅ TESTES CREATE/UPDATE PAYLOADS
const createLeadData: CreateLeadData = {
  pipeline_id: 'pipeline-123',
  stage_id: 'stage-123',
  title: 'Novo Lead',
  value: 25000,
  probability: 50,
  contact_name: 'Maria Santos',
  contact_email: 'maria@empresa.com',
  contact_phone: '+55 11 88888-8888',
  company_name: 'Empresa ABC',
  source: 'website',
  custom_data: {
    utm_source: 'google',
    lead_score: 75,
    is_mql: false,
    qualification_status: 'pending'
  }
};

const updateLeadData: UpdateLeadData = {
  title: 'Lead Atualizado',
  stage_id: 'stage-456',
  value: 30000,
  custom_data: {
    lead_score: 80,
    is_mql: true,
    qualification_status: 'qualified'
  }
  // Outros campos são opcionais
};

// ✅ TESTES DE TIPOS CONDICIONAIS
// Verificar se LeadCustomData permite campos flexíveis
const customData: LeadCustomData = {
  // Campos padrão
  email: 'test@test.com',
  first_name: 'João',
  last_name: 'Silva',
  utm_source: 'facebook',
  lead_score: 90,
  is_mql: true,
  
  // Campos customizados (extensível via [key: string]: unknown)
  custom_field_1: 'Valor customizado',
  custom_field_2: 42,
  custom_field_3: ['array', 'de', 'valores']
};

// ✅ TESTES DE COMPATIBILIDADE DE TIPOS
// Verificar se todos os tipos estão disponíveis e corretos
type _CrmExportsTest = {
  lead: Lead;
  company: Company;
  pipeline: Pipeline;
  stage: PipelineStage;
  customField: PipelineCustomField;
  customData: LeadCustomData;
  companySettings: CompanySettings;
  userRole: UserRole;
  leadSource: LeadSource;
  fieldType: FieldType;
  createLead: CreateLeadData;
  updateLead: UpdateLeadData;
};

console.log('✅ Todos os testes de tipos CRM passaram!');

export {};
