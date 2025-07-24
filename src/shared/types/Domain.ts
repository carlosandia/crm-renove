/**
 * ============================================
 * 🔧 TIPOS DERIVADOS DOS SCHEMAS ZOD - DOMÍNIO
 * ============================================
 * 
 * Types must always be generated via z.infer<typeof Schema>
 * AIDEV-NOTE: Type derived from Zod — do not edit manually
 */

import { z } from 'zod';
import {
  UserDataSchema,
  UserMemberSchema,
  PipelineMemberSchema,
  DealContactSchema,
  DealCompanySchema,
  DealAssignedUserSchema,
  DealSchema,
  DealCreateSchema,
  DealUpdateSchema,
  PipelineSchema,
  PipelineCreateSchema,
  PipelineUpdateSchema,
  CustomerSchema,
  CustomerCreateSchema,
  CustomerUpdateSchema,
  VendorSchema,
  VendorCreateSchema,
  VendorUpdateSchema,
  FormFieldSchema,
  FormSchema,
  FormCreateSchema,
  FormUpdateSchema,
  LeadSchema,
  LeadCreateSchema,
  LeadUpdateSchema,
  NotificationSchema,
  NotificationCreateSchema,
  NotificationUpdateSchema,
  CadenceActionSchema,
  CadenceSchema,
  CadenceCreateSchema,
  CadenceUpdateSchema
} from '../schemas/DomainSchemas';

// Import ContactSchema separadamente
import {
  ContactSchema,
  ContactCreateSchema,
  ContactUpdateSchema
} from '../schemas/ContactSchemas';

// ============================================
// USER DOMAIN TYPES
// ============================================

/**
 * ✅ User Data - Dados completos do usuário
 * AIDEV-NOTE: Type derived from Zod — do not edit manually
 */
export type UserData = z.infer<typeof UserDataSchema>;

/**
 * ✅ User Member - Para listagem de membros
 */
export type User = z.infer<typeof UserMemberSchema>;

/**
 * ✅ Pipeline Member - Membro de pipeline
 */
export type PipelineMember = z.infer<typeof PipelineMemberSchema>;

// ============================================
// DEAL DOMAIN TYPES
// ============================================

/**
 * ✅ Deal Contact - Relacionamento com contato
 */
export type DealContact = z.infer<typeof DealContactSchema>;

/**
 * ✅ Deal Company - Relacionamento com empresa
 */
export type DealCompany = z.infer<typeof DealCompanySchema>;

/**
 * ✅ Deal Assigned User - Relacionamento com usuário
 */
export type DealAssignedUser = z.infer<typeof DealAssignedUserSchema>;

/**
 * ✅ Deal - Esquema completo de negociação
 */
export type Deal = z.infer<typeof DealSchema>;

/**
 * ✅ Deal Create - Para criação
 */
export type DealCreate = z.infer<typeof DealCreateSchema>;

/**
 * ✅ Deal Update - Para atualização
 */
export type DealUpdate = z.infer<typeof DealUpdateSchema>;

// ============================================
// PIPELINE DOMAIN TYPES
// ============================================

/**
 * ✅ Pipeline Data - Esquema de pipeline
 */
export type PipelineData = z.infer<typeof PipelineSchema>;

/**
 * ✅ Pipeline Create - Para criação
 */
export type PipelineCreate = z.infer<typeof PipelineCreateSchema>;

/**
 * ✅ Pipeline Update - Para atualização
 */
export type PipelineUpdate = z.infer<typeof PipelineUpdateSchema>;

// ============================================
// CUSTOMER DOMAIN TYPES
// ============================================

/**
 * ✅ Customer Data - Esquema de cliente/contato
 */
export type CustomerData = z.infer<typeof CustomerSchema>;

/**
 * ✅ Customer Create - Para criação
 */
export type CustomerCreate = z.infer<typeof CustomerCreateSchema>;

/**
 * ✅ Customer Update - Para atualização
 */
export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>;

// ============================================
// VENDOR DOMAIN TYPES
// ============================================

/**
 * ✅ Vendor Data - Esquema de vendedor
 */
export type VendedorData = z.infer<typeof VendorSchema>;

/**
 * ✅ Vendor Create - Para criação
 */
export type VendorCreate = z.infer<typeof VendorCreateSchema>;

/**
 * ✅ Vendor Update - Para atualização
 */
export type VendorUpdate = z.infer<typeof VendorUpdateSchema>;

// ============================================
// FORM BUILDER DOMAIN TYPES
// ============================================

/**
 * ✅ Form Field - Campo de formulário
 */
export type FormField = z.infer<typeof FormFieldSchema>;

/**
 * ✅ Form Data - Esquema de formulário
 */
export type FormData = z.infer<typeof FormSchema>;

/**
 * ✅ Form Create - Para criação
 */
export type FormCreate = z.infer<typeof FormCreateSchema>;

/**
 * ✅ Form Update - Para atualização
 */
export type FormUpdate = z.infer<typeof FormUpdateSchema>;

// ============================================
// LEAD DOMAIN TYPES
// ============================================

/**
 * ✅ Lead Data - Esquema de lead
 */
export type LeadData = z.infer<typeof LeadSchema>;

/**
 * ✅ Lead Create - Para criação
 */
export type LeadCreate = z.infer<typeof LeadCreateSchema>;

/**
 * ✅ Lead Update - Para atualização
 */
export type LeadUpdate = z.infer<typeof LeadUpdateSchema>;

// ============================================
// CONTACT DOMAIN TYPES
// ============================================

/**
 * ✅ Contact Data - Esquema de contato
 */
export type Contact = z.infer<typeof ContactSchema>;

/**
 * ✅ Contact Create - Para criação
 */
export type ContactCreate = z.infer<typeof ContactCreateSchema>;

/**
 * ✅ Contact Update - Para atualização
 */
export type ContactUpdate = z.infer<typeof ContactUpdateSchema>;

// ============================================
// NOTIFICATION DOMAIN TYPES
// ============================================

/**
 * ✅ Notification Data - Esquema de notificação
 */
export type NotificationData = z.infer<typeof NotificationSchema>;

/**
 * ✅ Notification Create - Para criação
 */
export type NotificationCreate = z.infer<typeof NotificationCreateSchema>;

/**
 * ✅ Notification Update - Para atualização
 */
export type NotificationUpdate = z.infer<typeof NotificationUpdateSchema>;

// ============================================
// CADENCE DOMAIN TYPES
// ============================================

/**
 * ✅ Cadence Action - Ação de cadência
 */
export type CadenceAction = z.infer<typeof CadenceActionSchema>;

/**
 * ✅ Cadence Data - Esquema de cadência
 */
export type CadenceData = z.infer<typeof CadenceSchema>;

/**
 * ✅ Cadence Create - Para criação
 */
export type CadenceCreate = z.infer<typeof CadenceCreateSchema>;

/**
 * ✅ Cadence Update - Para atualização
 */
export type CadenceUpdate = z.infer<typeof CadenceUpdateSchema>;

// ============================================
// UTILITY TYPES PARA BUSINESS LOGIC
// ============================================

/**
 * ✅ Entity Status - Status genérico de entidades
 */
export type EntityStatus = 'active' | 'inactive' | 'draft' | 'archived';

/**
 * ✅ User Role - Roles do sistema
 */
export type UserRole = 'super_admin' | 'admin' | 'member';

/**
 * ✅ Deal Status - Status específicos de deals
 */
export type DealStatus = 'open' | 'won' | 'lost' | 'pending';

/**
 * ✅ Lead Status - Status específicos de leads
 */
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

/**
 * ✅ Lead Temperature - Temperatura de leads
 * AIDEV-NOTE: Baseado nos valores reais encontrados no Supabase
 */
export type LeadTemperature = 'cold' | 'warm' | 'hot' | 'Frio';

/**
 * ✅ Notification Type - Tipos de notificação
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * ✅ Notification Category - Categorias de notificação
 */
export type NotificationCategory = 'system' | 'pipeline' | 'deal' | 'lead' | 'user' | 'integration';

/**
 * ✅ Cadence Action Type - Tipos de ação de cadência
 */
export type CadenceActionType = 'email' | 'call' | 'task' | 'linkedin' | 'wait';

/**
 * ✅ Form Field Type - Tipos de campo de formulário
 */
export type FormFieldType = 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date';

// ============================================
// BUSINESS LOGIC HELPER TYPES
// ============================================

/**
 * ✅ Tenant Context - Contexto de tenant para operações
 */
export type TenantContext = {
  tenant_id: string;
  user_id: string;
  user_role: UserRole;
};

/**
 * ✅ Entity Create Base - Base para criação de entidades
 */
export type EntityCreateBase = {
  tenant_id: string;
  created_by: string;
};

/**
 * ✅ Entity Update Base - Base para atualização de entidades
 */
export type EntityUpdateBase = {
  updated_at?: string;
  updated_by?: string;
};

/**
 * ✅ Timestamps - Timestamps padrão
 */
export type Timestamps = {
  created_at: string;
  updated_at: string;
};

/**
 * ✅ Soft Delete - Soft delete padrão
 */
export type SoftDelete = {
  deleted_at?: string;
  deleted_by?: string;
  is_deleted?: boolean;
};

/**
 * ✅ Entity Base - Base completa para entidades
 */
export type EntityBase = {
  id: string;
} & Timestamps & Partial<SoftDelete>;

// ============================================
// SEARCH AND FILTER TYPES
// ============================================

/**
 * ✅ Search Filters - Filtros de busca genéricos
 */
export type SearchFilters = {
  search?: string;
  status?: string | string[];
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  tenant_id?: string;
  assigned_to?: string;
  tags?: string[];
};

/**
 * ✅ Deal Search Filters - Filtros específicos para deals
 */
export type DealSearchFilters = SearchFilters & {
  status?: DealStatus;
  stage?: string;
  pipeline_id?: string;
  company_id?: string;
  min_value?: number;
  max_value?: number;
  probability_min?: number;
  probability_max?: number;
};

/**
 * ✅ Lead Search Filters - Filtros específicos para leads
 */
export type LeadSearchFilters = SearchFilters & {
  status?: LeadStatus;
  temperature?: LeadTemperature;
  source?: string;
  score_min?: number;
  score_max?: number;
  utm_source?: string;
  utm_campaign?: string;
};

/**
 * ✅ Pipeline Search Filters - Filtros específicos para pipelines
 */
export type PipelineSearchFilters = SearchFilters & {
  is_active?: boolean;
  created_by?: string;
};

// ============================================
// METRICS AND ANALYTICS TYPES
// ============================================

/**
 * ✅ Deal Stats - Estatísticas de deals
 */
export type DealStats = {
  total: number;
  open: number;
  won: number;
  lost: number;
  pending: number;
  totalValue: number;
  wonValue: number;
  openValue: number;
  averageDealValue: number;
  winRate: number;
  conversionRate: number;
  atRisk: number;
  overdue: number;
};

/**
 * ✅ Lead Stats - Estatísticas de leads
 */
export type LeadStats = {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  averageScore: number;
  conversionRate: number;
  bySource: Record<string, number>;
  byTemperature: Record<LeadTemperature, number>;
};

/**
 * ✅ Pipeline Stats - Estatísticas de pipeline
 */
export type PipelineStats = {
  totalDeals: number;
  totalValue: number;
  averageTimeInStage: Record<string, number>;
  conversionRateByStage: Record<string, number>;
  bottlenecks: string[];
};

/**
 * ✅ Contact Stats - Estatísticas de contatos
 * AIDEV-NOTE: Type derived from business requirements — compatible with ContactsModule
 */
export type ContactStats = {
  totalContacts: number;
  activeContacts: number;
  newThisMonth: number;
  conversionRate: number;
  active_count?: number;
  new_this_month?: number;
  conversion_rate?: number;
};