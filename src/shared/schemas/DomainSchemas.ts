/**
 * ============================================
 * 🔧 SCHEMAS ZOD DOMÍNIO - BUSINESS ENTITIES
 * ============================================
 * 
 * Schemas Zod para entidades de domínio do CRM Multi-Tenant.
 * Fonte única da verdade para User, Deal, Pipeline, Lead, etc.
 */

import { z } from 'zod';

// ============================================
// USER DOMAIN SCHEMAS
// ============================================

/**
 * 🔧 User Data Schema - Dados completos do usuário
 */
export const UserDataSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(['super_admin', 'admin', 'member']),
  tenant_id: z.string().uuid(),
  
  // Campos opcionais
  is_active: z.boolean().default(true).optional(),
  avatar_url: z.string().url().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().default('pt-BR').optional(),
  
  // Configurações
  settings: z.object({
    email_notifications: z.boolean().default(true),
    desktop_notifications: z.boolean().default(true),
    theme: z.enum(['light', 'dark', 'system']).default('system')
  }).optional(),
  
  // Metadados (apenas para reads, nunca para writes)
  password_hash: z.string().optional(),
  email_verified_at: z.string().optional(), // Formato Supabase timestamp
  last_login: z.string().optional(), // Formato Supabase timestamp
  login_count: z.number().int().nonnegative().optional(),
  created_at: z.string().optional(), // Formato Supabase timestamp
  updated_at: z.string().optional() // Formato Supabase timestamp
});

/**
 * 🔧 User Member Schema - Para listagem de membros
 */
export const UserMemberSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  role: z.string(),
  is_active: z.boolean().optional(),
  tenant_id: z.string().uuid().optional(),
  created_at: z.string().optional() // Formato Supabase: "2025-06-30 01:14:13.34407"
});

/**
 * 🔧 Pipeline Member Schema
 */
export const PipelineMemberSchema = z.object({
  id: z.string().uuid(),
  pipeline_id: z.string().uuid(),
  member_id: z.string().uuid(),
  assigned_at: z.string(), // Formato Supabase timestamp
  users: UserMemberSchema.optional()
});

// ============================================
// DEAL DOMAIN SCHEMAS
// ============================================

/**
 * 🔧 Deal Contact Schema - Relacionamento com contato
 */
export const DealContactSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  company: z.string().optional()
});

/**
 * 🔧 Deal Company Schema - Relacionamento com empresa
 */
export const DealCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string()
});

/**
 * 🔧 Deal Assigned User Schema - Relacionamento com usuário
 */
export const DealAssignedUserSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email()
});

/**
 * 🔧 Deal Schema - Esquema completo de negociação
 */
export const DealSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  value: z.number().nonnegative(),
  currency: z.string().default('BRL').optional(),
  status: z.enum(['open', 'won', 'lost', 'pending']),
  stage: z.string(),
  probability: z.number().min(0).max(100).optional(),
  expected_close_date: z.string().optional(), // Formato Supabase timestamp
  actual_close_date: z.string().optional(), // Formato Supabase timestamp
  contact_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
  pipeline_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  lead_source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  tenant_id: z.string().uuid().optional(),
  created_at: z.string().optional(), // Formato Supabase timestamp
  updated_at: z.string().optional(), // Formato Supabase timestamp
  created_by: z.string().uuid().optional(),
  
  // Relacionamentos (apenas para reads)
  contact: DealContactSchema.optional(),
  company: DealCompanySchema.optional(),
  assigned_user: DealAssignedUserSchema.optional()
});

/**
 * 🔧 Deal Create Schema - Para criação (sem campos gerados)
 */
export const DealCreateSchema = DealSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  contact: true,
  company: true,
  assigned_user: true
});

/**
 * 🔧 Deal Update Schema - Para atualização (campos opcionais)
 */
export const DealUpdateSchema = DealCreateSchema.partial();

// ============================================
// PIPELINE DOMAIN SCHEMAS
// ============================================

/**
 * 🔧 Pipeline Schema - Esquema de pipeline de vendas
 */
export const PipelineSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  tenant_id: z.string().uuid(),
  created_by: z.string().uuid(),
  is_active: z.boolean().default(true).optional(),
  
  // Configurações
  settings: z.object({
    auto_progress: z.boolean().default(false),
    notification_enabled: z.boolean().default(true),
    required_fields: z.array(z.string()).default([])
  }).optional(),
  
  created_at: z.string().optional(), // Formato Supabase timestamp
  updated_at: z.string().optional() // Formato Supabase timestamp
});

/**
 * 🔧 Pipeline Create Schema
 */
export const PipelineCreateSchema = PipelineSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

/**
 * 🔧 Pipeline Update Schema
 */
export const PipelineUpdateSchema = PipelineCreateSchema.partial();

// ============================================
// CUSTOMER/CONTACT DOMAIN SCHEMAS
// ============================================

/**
 * 🔧 Customer Schema - Esquema de cliente/contato
 */
export const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  tenant_id: z.string().uuid().optional(),
  
  // Campos adicionais
  status: z.enum(['active', 'inactive', 'prospect', 'customer']).default('prospect').optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]).optional(),
  custom_fields: z.record(z.unknown()).optional(),
  
  created_at: z.string().optional(), // Formato Supabase timestamp
  updated_at: z.string().optional() // Formato Supabase timestamp
});

/**
 * 🔧 Customer Create Schema
 */
export const CustomerCreateSchema = CustomerSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

/**
 * 🔧 Customer Update Schema
 */
export const CustomerUpdateSchema = CustomerCreateSchema.partial();

// ============================================
// VENDOR/SALES DOMAIN SCHEMAS
// ============================================

/**
 * 🔧 Vendor Schema - Esquema de vendedor
 */
export const VendorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  tenant_id: z.string().uuid(),
  is_active: z.boolean().default(true).optional(),
  
  // Campos adicionais
  role: z.string().optional(),
  team: z.string().optional(),
  target: z.number().nonnegative().optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  
  created_at: z.string().optional(), // Formato Supabase timestamp
  updated_at: z.string().optional() // Formato Supabase timestamp
});

/**
 * 🔧 Vendor Create Schema
 */
export const VendorCreateSchema = VendorSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

/**
 * 🔧 Vendor Update Schema
 */
export const VendorUpdateSchema = VendorCreateSchema.partial();

// ============================================
// FORM BUILDER DOMAIN SCHEMAS
// ============================================

/**
 * 🔧 Form Field Schema - Campo de formulário
 */
export const FormFieldSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['text', 'email', 'phone', 'number', 'textarea', 'select', 'checkbox', 'radio', 'date']),
  label: z.string().min(1),
  name: z.string().min(1),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  default_value: z.string().optional(),
  validation_rules: z.record(z.unknown()).optional(),
  options: z.array(z.string()).optional(), // Para select, checkbox, radio
  order: z.number().int().nonnegative()
});

/**
 * 🔧 Form Schema - Esquema de formulário
 */
export const FormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  tenant_id: z.string().uuid(),
  created_by: z.string().uuid(),
  is_active: z.boolean().default(true).optional(),
  
  // Configurações
  settings: z.object({
    lead_scoring_enabled: z.boolean().default(false),
    utm_tracking: z.boolean().default(true),
    notifications_enabled: z.boolean().default(true),
    auto_response: z.boolean().default(false),
    redirect_url: z.string().url().optional()
  }).optional(),
  
  // Campos do formulário
  fields: z.array(FormFieldSchema).default([]),
  
  created_at: z.string().optional(), // Formato Supabase timestamp
  updated_at: z.string().optional() // Formato Supabase timestamp
});

/**
 * 🔧 Form Create Schema
 */
export const FormCreateSchema = FormSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

/**
 * 🔧 Form Update Schema
 */
export const FormUpdateSchema = FormCreateSchema.partial();

// ============================================
// LEAD DOMAIN SCHEMAS
// ============================================

/**
 * 🔧 Lead Schema - Esquema de lead
 */
export const LeadSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).default('new'),
  score: z.number().min(0).max(100).optional(),
  temperature: z.enum(['cold', 'warm', 'hot']).default('cold').optional(),
  tenant_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  pipeline_id: z.string().uuid().optional(),
  
  // UTM Tracking
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  
  // Campos customizados
  custom_fields: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).default([]).optional(),
  notes: z.string().optional(),
  
  created_at: z.string().optional(), // Formato Supabase timestamp
  updated_at: z.string().optional() // Formato Supabase timestamp
});

/**
 * 🔧 Lead Create Schema
 */
export const LeadCreateSchema = LeadSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

/**
 * 🔧 Lead Update Schema
 */
export const LeadUpdateSchema = LeadCreateSchema.partial();

// ============================================
// NOTIFICATION DOMAIN SCHEMAS
// ============================================

/**
 * 🔧 Notification Schema - Esquema de notificação
 */
export const NotificationSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  category: z.enum(['system', 'pipeline', 'deal', 'lead', 'user', 'integration']),
  tenant_id: z.string().uuid(),
  user_id: z.string().uuid(),
  
  // Estado
  is_read: z.boolean().default(false),
  read_at: z.string().optional(), // Formato Supabase timestamp
  
  // Metadados
  metadata: z.record(z.unknown()).optional(),
  action_url: z.string().url().optional(),
  
  created_at: z.string().optional(), // Formato Supabase timestamp
  updated_at: z.string().optional() // Formato Supabase timestamp
});

/**
 * 🔧 Notification Create Schema
 */
export const NotificationCreateSchema = NotificationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

/**
 * 🔧 Notification Update Schema
 */
export const NotificationUpdateSchema = NotificationCreateSchema.partial();

// ============================================
// CADENCE DOMAIN SCHEMAS
// ============================================

/**
 * 🔧 Cadence Action Schema - Ação de cadência
 */
export const CadenceActionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['email', 'call', 'task', 'linkedin', 'wait']),
  subject: z.string().optional(),
  content: z.string().optional(),
  delay_days: z.number().int().nonnegative(),
  order: z.number().int().nonnegative()
});

/**
 * 🔧 Cadence Schema - Esquema de cadência
 */
export const CadenceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  tenant_id: z.string().uuid(),
  created_by: z.string().uuid(),
  is_active: z.boolean().default(true).optional(),
  
  // Configurações
  settings: z.object({
    auto_start: z.boolean().default(false),
    stop_on_reply: z.boolean().default(true),
    working_days_only: z.boolean().default(true)
  }).optional(),
  
  // Ações da cadência
  actions: z.array(CadenceActionSchema).default([]),
  
  created_at: z.string().optional(), // Formato Supabase timestamp
  updated_at: z.string().optional() // Formato Supabase timestamp
});

/**
 * 🔧 Cadence Create Schema
 */
export const CadenceCreateSchema = CadenceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

/**
 * 🔧 Cadence Update Schema
 */
export const CadenceUpdateSchema = CadenceCreateSchema.partial();