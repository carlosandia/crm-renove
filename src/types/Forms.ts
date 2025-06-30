// ================================================================================
// TIPOS UNIFICADOS - MÓDULO GESTÃO DE FORMULÁRIOS
// ================================================================================
// Fase 1.3: Criação de tipos unificados em src/types/Forms.ts
// Data: 27/01/2025 - Consolidação de interfaces inconsistentes

// ================================================================================
// INTERFACES PRINCIPAIS
// ================================================================================

/**
 * Interface unificada para campos de formulário
 * Consolidação das 4 definições inconsistentes encontradas em:
 * - FormBuilderEditor.tsx, FormFieldEditor.tsx, ModernFormBuilder.tsx, PublicFormRenderer.tsx
 */
export interface FormField {
  id: string;
  field_type: FieldType;
  field_name: string;
  field_label: string;
  field_description?: string;
  placeholder?: string;
  is_required: boolean;
  field_options: FieldOptions;
  validation_rules: ValidationRules;
  styling: FieldStyling;
  order_index: number;
  scoring_weight?: number;
}

/**
 * Interface unificada para formulários customizados
 */
export interface CustomForm {
  id: string;
  name: string;
  description?: string;
  slug: string;
  is_active: boolean;
  settings: FormSettings;
  styling: FormStyling;
  redirect_url?: string;
  pipeline_id?: string;
  assigned_to?: string;
  qualification_rules: QualificationRules;
  created_at: string;
  updated_at: string;
  tenant_id: string; // Multi-tenant
}

/**
 * Interface unificada para regras de pontuação MQL
 */
export interface ScoringRule {
  id: string;
  field_id: string;
  condition: ScoringCondition;
  value: string;
  points: number;
  description: string;
}

/**
 * Interface unificada para pipelines
 */
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  fields: PipelineField[];
  is_active: boolean;
}

/**
 * Interface unificada para etapas do pipeline
 */
export interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  is_default: boolean;
  color: string;
}

// ================================================================================
// TIPOS E ENUMS
// ================================================================================

/**
 * Todos os tipos de campo disponíveis no FormBuilder
 */
export type FieldType = 
  | 'text' | 'email' | 'phone' | 'textarea' | 'number' | 'date' | 'time'
  | 'select' | 'radio' | 'checkbox' | 'rating' | 'range' | 'file' | 'city'
  | 'state' | 'country' | 'captcha' | 'submit' | 'whatsapp' | 'url' | 'password' | 'currency'
  | 'cpf' | 'cnpj' | 'heading' | 'paragraph' | 'divider' | 'image';

/**
 * Condições para regras de pontuação
 */
export type ScoringCondition = 
  | 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_empty' | 'range';

/**
 * Modos de visualização do preview
 */
export type PreviewMode = 'desktop' | 'tablet' | 'mobile';

/**
 * Painéis ativos no editor
 */
export type ActivePanel = 
  | 'properties' | 'scoring' | 'share' | 'buttons' | 'notifications' 
  | 'style' | 'form-settings' | 'pipeline' | 'destination';

/**
 * Tipo para alinhamento de texto
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

// ================================================================================
// INTERFACES DE CONFIGURAÇÃO
// ================================================================================

/**
 * Opções específicas por tipo de campo
 */
export interface FieldOptions {
  // Select, Radio, Checkbox
  options?: string[];
  
  // Rating
  max_rating?: number;
  style?: 'stars' | 'hearts' | 'thumbs';
  
  // Range
  min?: number;
  max?: number;
  step?: number;
  
  // File
  accept?: string;
  max_size?: string;
  multiple?: boolean;
  
  // City
  autocomplete?: boolean;
  suggestions?: string[];
  
  // Captcha
  type?: 'math' | 'text' | 'image';
  difficulty?: 'easy' | 'medium' | 'hard';
  
  // Submit Button
  button_text?: string;
  redirect_url?: string;
  background_color?: string;
  text_color?: string;
  
  // WhatsApp
  number?: string;
  message?: string;
  
  // Phone/WhatsApp mask
  mask?: 'phone' | 'phone-alt' | 'none';
  
  // Heading
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  
  // Text alignment
  align?: 'left' | 'center' | 'right' | 'justify';
  
  // Image
  src?: string;
  alt?: string;
  width?: string;
  height?: string;
}

/**
 * Regras de validação para campos
 */
export interface ValidationRules {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  custom_message?: string;
  required_message?: string;
}

/**
 * Estilização individual de campos
 */
export interface FieldStyling {
  fontSize?: string;
  padding?: string;
  borderRadius?: string;
  borderColor?: string;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Configurações gerais do formulário
 */
export interface FormSettings {
  show_progress?: boolean;
  allow_draft?: boolean;
  max_submissions?: number;
  submission_limit_message?: string;
  success_redirect?: string;
  error_redirect?: string;
  collect_utm?: boolean;
  lead_tracking?: LeadTrackingSettings;
  notification_settings?: NotificationSettings;
  email_notifications?: EmailNotificationSettings;
}

/**
 * Estilização global do formulário
 */
export interface FormStyling {
  backgroundColor?: string;
  borderRadius?: string;
  border?: boolean;
  borderColor?: string;
  borderWidth?: string;
  shadow?: boolean;
  title?: string;
  titleColor?: string;
  titleSize?: string;
  titleWeight?: string;
  titleAlign?: string;
  padding?: string;
}

/**
 * Regras de qualificação e pontuação
 */
export interface QualificationRules {
  mql_rules?: ScoringRule[];
  mql_threshold?: number;
  scoring_rules?: ScoringRule[];
  scoring_threshold?: number;
}

/**
 * Configurações avançadas de rastreamento de origem de leads
 */
export interface LeadTrackingSettings {
  enabled: boolean;
  customSource: string;
  customSourceName: string;
  customCampaign: string;
  customMedium: string;
  utmTracking: {
    enabled: boolean;
    autoDetect: boolean;
    sourceMappings: {
      [key: string]: string;
    };
  };
  leadSource: 'utm' | 'custom' | 'form';
  showInPipeline: boolean;
  trackConversions: boolean;
  formIdentifier: string;
}

/**
 * Configurações de notificações visuais
 */
export interface NotificationSettings {
  successMessage: string;
  errorMessage: string;
  showNotifications: boolean;
  autoHide: boolean;
  hideDelay: number;
  successBackgroundColor: string;
  successTextColor: string;
  errorBackgroundColor: string;
  errorTextColor: string;
}

/**
 * Configurações de notificações por email
 */
export interface EmailNotificationSettings {
  enabled: boolean;
  recipients: string[];
  subject: string;
  template: string;
  sendOnSubmit: boolean;
  sendOnWhatsApp: boolean;
  includeLeadData: boolean;
  includeMQLScore: boolean;
}

// ================================================================================
// INTERFACES DE INTEGRAÇÃO
// ================================================================================

/**
 * Campo de pipeline para mapeamento
 */
export interface PipelineField {
  name: string;
  label: string;
  type: string;
  is_required: boolean;
  is_custom: boolean;
  options?: any;
}

/**
 * Mapeamento entre campos do formulário e pipeline
 */
export interface FieldMapping {
  form_field_id: string;
  pipeline_field_name: string;
  field_type: string;
  confidence: number; // 0-100, confiança do auto-mapping
}

/**
 * Configurações de integração WhatsApp
 */
export interface WhatsAppConfig {
  enabled: boolean;
  phone_number: string;
  message_template: string;
  redirect_after_send: boolean;
  custom_button_text?: string;
  custom_button_color?: string;
}

// ================================================================================
// INTERFACES DE PROPS DOS COMPONENTES
// ================================================================================

/**
 * Props do componente principal ModernFormBuilder
 */
export interface ModernFormBuilderProps {
  form: any; // TODO: Tipificar como CustomForm após migração
  onSave: () => void;
  onCancel: () => void;
  tenantId: string;
}

/**
 * Props do renderizador público
 */
export interface PublicFormRendererProps {
  formId?: string;
  formSlug?: string;
  embedded?: boolean;
}

/**
 * Props do editor de campos
 */
export interface FormFieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
}

// ================================================================================
// INTERFACES DE ESTADO
// ================================================================================

/**
 * Estado de notificação
 */
export interface NotificationState {
  type: 'success' | 'error';
  message: string;
  show: boolean;
}

/**
 * Estado do botão de submit customizado
 */
export interface SubmitButtonState {
  text: string;
  backgroundColor: string;
  textColor: string;
  redirectUrl: string;
  enabled: boolean;
}

// ================================================================================
// INTERFACES DE DADOS DE BANCO
// ================================================================================

/**
 * Estrutura da tabela custom_forms (Supabase)
 */
export interface CustomFormDB {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  slug: string;
  is_active: boolean;
  settings: any; // JSON
  styling: any; // JSON
  redirect_url?: string;
  pipeline_id?: string;
  assigned_to?: string;
  qualification_rules: any; // JSON
  created_at: string;
  updated_at: string;
}

/**
 * Estrutura da tabela form_fields (Supabase)
 */
export interface FormFieldDB {
  id: string;
  form_id: string;
  field_type: string;
  field_name: string;
  field_label: string;
  field_description?: string;
  placeholder?: string;
  is_required: boolean;
  field_options: any; // JSON
  validation_rules: any; // JSON
  styling: any; // JSON
  order_index: number;
  scoring_weight?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Estrutura da tabela form_submissions (Supabase)
 */
export interface FormSubmissionDB {
  id: string;
  form_id: string;
  submission_data: any; // JSON
  lead_score?: number;
  is_mql: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Estrutura da tabela form_analytics (Supabase)
 */
export interface FormAnalyticsDB {
  id: string;
  form_id: string;
  views: number;
  submissions: number;
  conversion_rate: number;
  avg_lead_score: number;
  mql_count: number;
  last_updated: string;
}

// ================================================================================
// UTILITÁRIOS E HELPERS
// ================================================================================

/**
 * Tipo para definições de campo disponíveis no painel
 */
export interface FieldTypeDefinition {
  type: FieldType;
  label: string;
  description: string;
  icon: any; // React component
  color: string;
  category: 'basic' | 'advanced' | 'special';
}

/**
 * Resultado de validação de campo
 */
export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Configuração de máscara para campos
 */
export interface FieldMask {
  pattern: string;
  placeholder: string;
  transform?: (value: string) => string;
}

/**
 * Interface para configuração de destino de formulário
 */
export interface FormDestinationConfig {
  type: 'leads-menu' | 'pipeline' | 'webhook' | 'email';
  target_id?: string;
  pipeline_id?: string;
  stage_id?: string;
  webhook_url?: string;
  email_to?: string;
  auto_assign?: boolean;
  notification_enabled?: boolean;
}

/**
 * Interface para formData com configuração de destino
 */
export interface FormDataWithDestination extends FormData {
  destination_config?: FormDestinationConfig;
}

/**
 * Interface para usuário com perfil completo
 */
export interface UserWithProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
}

/**
 * Interface para Window com propriedades globais personalizadas
 */
export interface WindowWithGlobals extends Window {
  GLOBAL_MODAL_BLOCK?: boolean;
  GLOBAL_MODAL_FORCE_OPEN?: boolean;
  GLOBAL_MODAL_LEAD_ID?: string;
}

// ================================================================================
// EXPORTS ORGANIZADOS
// ================================================================================
// Todas as interfaces já foram exportadas inline acima
// Este arquivo centraliza todos os tipos do módulo FormBuilder 