import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
// ✅ CORREÇÃO CRÍTICA: Usar tipos derivados de schemas Zod conforme CLAUDE.md
import { 
  PipelineSchema, 
  PipelineStageSchema, 
  CustomFieldSchema, 
  UserDataSchema,
  SimpleOutcomeReasonSchema,
  OutcomeReasonsCollectionSchema
} from '../../shared/schemas/DomainSchemas';
import { z } from 'zod';


// ✅ TIPOS DERIVADOS DOS SCHEMAS ZOD - FONTE ÚNICA DA VERDADE
type Pipeline = z.infer<typeof PipelineSchema>;
type PipelineStage = z.infer<typeof PipelineStageSchema>;
// ✅ CORREÇÃO: Tipo CustomField agora importado de fields/index.ts
type User = z.infer<typeof UserDataSchema>;
type SimpleOutcomeReason = z.infer<typeof SimpleOutcomeReasonSchema>;
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { usePipelineNameValidation } from '../../hooks/usePipelineNameValidation';
import { showErrorToast, showWarningToast, showSuccessToast } from '../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { withSilentRetry } from '../../utils/supabaseRetry';

// ✅ OTIMIZAÇÃO: Importar configurações de logging inteligente
import { COMPONENT_LOGGING_CONFIG } from '../../config/logging';

// ✅ CORREÇÃO: Importar CadenceApiService para uso consistente
import { CadenceApiService } from '../../services/cadenceApiService';
// ✅ CORREÇÃO: Importar api para uso em loadOutcomeReasons
import { api } from '../../lib/api';


// ✅ PERFORMANCE: Import do performance monitoring
import { usePerformanceMonitor } from '../../shared/utils/performance';

// ✅ CORREÇÃO ETAPA 3: Import para formatação consistente de IDs
import { formatLeadIdForLog } from '../../utils/logFormatters';

// ✅ CORREÇÃO ETAPA 4: Import do sistema de log levels baseado em Winston
import { logger, loggers } from '../../utils/logger';

// ✅ CORREÇÃO ETAPA 2: Sistema de debouncing para logs repetitivos
class LogDebouncer {
  private lastLogTime: number = 0;
  private lastLogData: string = '';

  shouldLog(data: any, minInterval: number = 1000): boolean {
    const now = Date.now();
    const currentData = JSON.stringify(data);
    
    if (currentData !== this.lastLogData || now - this.lastLogTime > minInterval) {
      this.lastLogTime = now;
      this.lastLogData = currentData;
      return true;
    }
    return false;
  }
}

// ✅ Instâncias globais de debouncer para diferentes tipos de log
const motivesLogDebouncer = new LogDebouncer();
const renderLogDebouncer = new LogDebouncer();

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

// Magic UI components
import { AnimatedCard } from '../ui/animated-card';
import { BlurFade } from '../ui/blur-fade';
import { HoverCard, MotionWrapper } from '../ui/motion-wrapper';
import { PulsatingButton } from '../magicui/pulsating-button';
import { BorderBeam } from '../magicui/border-beam';
import { NumberTicker } from '../magicui/number-ticker';

// Subcomponentes especializados
import { useStageManager, StageManagerRender } from './stages/ImprovedStageManager';
import { useCustomFieldsManager, CustomFieldsManagerRender, type CustomField } from './fields';
import { useCadenceManager, CadenceManagerRender } from './cadence';
import { useLocalDistributionManager, DistributionManagerRender, DistributionRule } from './distribution';
import { useTemperatureConfig, TemperatureConfigRender } from './temperature';

// ✅ NOVAS ABAS: Importar os 2 novos componentes para as abas expandidas
import QualificationManager, { QualificationRules } from './QualificationManager';
import SimpleMotivesManager, { SimpleMotivesManagerRef } from './configuration/SimpleMotivesManager';
import { FormOutcomeReasonsData } from '../../shared/types/simple-outcome-reasons';
import { API } from '../../utils/constants';


// Icons
import { 
  Settings, 
  Target, 
  Sliders, 
  Zap, 
  Save,
  Plus,
  ArrowLeft,
  Database,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lightbulb,
  Award,
  TrendingUp,
  Users,
  Trophy,
  MessageCircle,
  FileText,
} from 'lucide-react';

// Shared components
import { SectionHeader } from './shared/SectionHeader';

// Constants
import { PIPELINE_UI_CONSTANTS } from '../../styles/pipeline-constants';

const logPipelineError = (context: string, error: any, isCritical = false) => {
  if (isCritical) {
    console.error(`❌ [PipelineCreator:${context}]`, error, { 
      component: 'ModernPipelineCreatorRefactored',
      context 
    });
  } else {
    console.warn(`⚠️ [PipelineCreator:${context}] Aviso (não crítico):`, error.message || error);
  }
};

// ✅ NOVA: Função utilitária para identificar etapas que NÃO são finais (podem ter cadências)
const isNonFinalStage = (stage: PipelineStage): boolean => {
  // ✅ CRITÉRIO 1: Etapas finais têm order_index >= 998
  if (stage.order_index >= 998) {
    return false;
  }
  
  // ✅ CRITÉRIO 2: Nomes de etapas finais conhecidos
  // ✅ IMPROVED: Const assertion for readonly array with literal types
  const finalStageNames = [
    'Ganho', 'Perdido', 
    'Closed Won', 'Closed Lost',
    'Ganha', 'Perdida',
    'Won', 'Lost',
    'Finalizado', 'Cancelado'
  ] as const;
  
  const stageName = stage.name?.trim().toLowerCase();
  const isFinalByName = finalStageNames.some(finalName => 
    stageName === finalName.toLowerCase()
  );
  
  if (isFinalByName) {
    return false;
  }
  
  // ✅ CRITÉRIO 3: Etapas do sistema marcadas como finais
  if (stage.is_system_stage && (stageName.includes('ganho') || stageName.includes('perdido'))) {
    return false;
  }
  
  return true;
};

// ✅ CORREÇÃO: Removida interface LocalCustomField em favor do tipo CustomField derivado do schema Zod

// ================================================================================
// ✅ ZOD VALIDATION FUNCTIONS - Substituindo type guards manuais
// ================================================================================

// ✅ ETAPA 4: Validação consolidada - removendo duplicações
const validateOutcomeReasons = (data: unknown) => {
  const result = OutcomeReasonsCollectionSchema.safeParse(data);
  return result.success ? result.data : null;
};

// ✅ ETAPA 4: Helper para logs - evita validações repetidas
const getOutcomeReasonsStats = (outcomeReasons: unknown) => {
  const validated = validateOutcomeReasons(outcomeReasons);
  return {
    validated,
    ganhoCount: validated?.ganho_reasons?.length ?? 0,
    perdidoCount: validated?.perdido_reasons?.length ?? 0,
    ganhoSample: validated?.ganho_reasons?.slice(0, 2).map(r => r.reason_text?.substring(0, 30)) ?? [],
    perdidoSample: validated?.perdido_reasons?.slice(0, 2).map(r => r.reason_text?.substring(0, 30)) ?? []
  };
};

const validateCustomField = (data: unknown) => {
  const result = CustomFieldSchema.safeParse(data);
  return result.success ? result.data : null;
};

const validateCustomFieldsArray = (data: unknown): CustomField[] | null => {
  const arraySchema = z.array(CustomFieldSchema);
  const result = arraySchema.safeParse(data);
  return result.success ? result.data as CustomField[] : null;
};

const validateStringArray = (data: unknown) => {
  const result = z.array(z.string()).safeParse(data);
  return result.success ? result.data : null;
};

const validateSimpleOutcomeReasonArray = (data: unknown) => {
  const arraySchema = z.array(SimpleOutcomeReasonSchema);
  const result = arraySchema.safeParse(data);
  return result.success ? result.data : null;
};

// ✅ ZOD VALIDATION: Schema para distribuição rule
const DistributionRuleValidationSchema = z.object({
  pipeline_id: z.string(),
  mode: z.enum(['manual', 'rodizio']),
  is_active: z.boolean(),
  working_hours_only: z.boolean(),
  skip_inactive_members: z.boolean(),
  fallback_to_manual: z.boolean()
}).passthrough(); // Permite campos extras opcionais

const validateDistributionRule = (data: unknown): DistributionRule | null => {
  const result = DistributionRuleValidationSchema.safeParse(data);
  return result.success ? result.data as DistributionRule : null;
};

// ✅ ZOD VALIDATION: Schemas para dados do form
const PipelineFormDataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  member_ids: z.array(z.string()).optional(),
  stages: z.array(PipelineStageSchema).optional(),
  custom_fields: z.array(CustomFieldSchema).optional()
}).passthrough(); // Permite campos extras

const validateFormData = (data: unknown) => {
  const result = PipelineFormDataSchema.partial().safeParse(data);
  return result.success ? result.data : null;
};

// ✅ ZOD VALIDATION: Schema para cadence config
const CadenceConfigSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  actions: z.array(z.any()).optional() // Simplified para compatibilidade
}).passthrough();

const validateCadenceConfigArray = (data: unknown) => {
  const result = z.array(CadenceConfigSchema).safeParse(data);
  return result.success ? result.data : null;
};

// ================================================================================
// ✅ LEGACY TYPE GUARDS - Mantidos para compatibilidade com código existente
// ================================================================================

// ✅ ETAPA 4: Legacy type guard removido - usar validateOutcomeReasons() diretamente

const isValidFormData = (data: unknown): data is Partial<PipelineFormData> => {
  return validateFormData(data) !== null;
};

// ✅ ETAPA 4: isValidCustomField removido - usar validateCustomField() diretamente

// ✅ ETAPA 4: isCustomFieldsArray removido - usar validateCustomFieldsArray() diretamente

// ✅ ETAPA 4: isStringArray removido - usar validateStringArray() diretamente

// ✅ ETAPA 4: isFormOutcomeReasonsData removido - usar validateOutcomeReasons() diretamente

// ✅ ETAPA 4: isCadenceConfigArray removido - usar validateCadenceConfigArray() diretamente

// ✅ ETAPA 4: isDistributionRule removido - usar validateDistributionRule() diretamente

// ✅ ETAPA 4: isSimpleOutcomeReasonArray removido - usar validateSimpleOutcomeReasonArray() diretamente

// ✅ HELPER: Função para obter DistributionRule padrão (compatível com InitializationState)
const getDefaultDistributionRule = (pipelineId: string = ''): DistributionRule => ({
  pipeline_id: pipelineId,
  mode: 'manual',
  is_active: true,
  working_hours_only: false,
  skip_inactive_members: true,
  fallback_to_manual: true
});

interface CadenceTask {
  id?: string;
  day_offset: number;
  task_order: number;
  channel: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  action_type: 'mensagem' | 'ligacao' | 'tarefa' | 'email_followup' | 'agendamento' | 'proposta';
  task_title: string;
  task_description: string;
  template_content?: string;
  is_active: boolean;
}

interface CadenceConfig {
  id?: string;
  stage_name: string;
  stage_order: number;
  readonly tasks: readonly CadenceTask[];
  is_active: boolean;
}

interface LocalDistributionRule {
  mode: 'manual' | 'rodizio';
  is_active: boolean;
  working_hours_only: boolean;
  skip_inactive_members: boolean;
  fallback_to_manual: boolean;
}

interface TemperatureConfig {
  hot_days: number;
  warm_days: number;
  cold_days: number;
}

interface PipelineFormData {
  name: string;
  description: string;
  readonly member_ids: readonly string[];
  readonly stages: readonly Omit<PipelineStage, 'id' | 'pipeline_id' | 'created_at' | 'updated_at'>[];
  readonly custom_fields: readonly CustomField[];
  readonly cadence_configs: readonly CadenceConfig[];
  distribution_rule?: LocalDistributionRule;
  temperature_config?: TemperatureConfig;
  // ✅ NOVAS ABAS: Campos das 2 novas abas
  qualification_rules?: QualificationRules;
  outcome_reasons?: FormOutcomeReasonsData;
}

// ✅ PHASE 1: Estado consolidado usando useReducer para eliminar race conditions
interface PipelineCreatorState {
  // Estados de controle de modificações
  hasUnsavedChanges: boolean;
  hasQualificationChanges: boolean;
  hasMotivesChanges: boolean;
  
  // Estados de ações e navegação
  isStageAction: boolean;
  isNavigationChange: boolean;
  isExplicitButtonClick: boolean;
  
  // Estados de inicialização e carregamento
  isInitialized: boolean;
  loading: boolean;
  isSaving: boolean;
  savingActivities: boolean;
  
  // Estados de UI
  activeTab: string;
  showUnsavedDialog: boolean;
  isIntentionalSubmit: boolean;
  
  // Estado de salvamento e feedback
  lastSavedAt: Date | null;
  operationError: string | null;
  
  // Estado da distribuição consolidado
  distributionState: {
    hasChanges: boolean;
    isInitializing: boolean;
    lastUpdate: Date | null;
  };
  
  // ✅ FASE 1: Estado de inicialização atômica
  initializationState: InitializationState;
  
  // Dados do formulário
  formData: PipelineFormData;
}

// ✅ FASE 1: Estado de inicialização atômico para eliminar race conditions
interface InitializationState {
  phase: 'idle' | 'preparing' | 'loading_data' | 'applying_data' | 'completed';
  loadedData: {
    pipeline?: Pipeline; // ✅ CORRIGIDO: tipo específico em vez de any
    distributionRule?: DistributionRule; // ✅ CORRIGIDO: tipo específico em vez de any
    customFields?: CustomField[]; // ✅ CORRIGIDO: tipo específico em vez de any[]
    qualificationMotives?: SimpleOutcomeReason[]; // ✅ CORRIGIDO: tipo específico em vez de any[]
  };
  startedAt: Date | null;
  completedAt: Date | null;
  abortController?: AbortController;
}

// ✅ IMPROVED: TypeScript Discriminated Unions seguindo Context7 best practices
type PipelineCreatorAction =
  // Form Data Actions
  | { readonly type: 'SET_FORM_DATA'; readonly payload: Partial<PipelineFormData> }
  | { readonly type: 'INITIALIZE_FORM'; readonly payload: Partial<PipelineFormData> }
  | { readonly type: 'BULK_INITIALIZE'; readonly payload: { readonly formData: Partial<PipelineFormData>; readonly distributionRule?: any } }
  
  // Boolean State Actions
  | { readonly type: 'SET_HAS_UNSAVED_CHANGES'; readonly payload: boolean }
  | { readonly type: 'SET_HAS_QUALIFICATION_CHANGES'; readonly payload: boolean }
  | { readonly type: 'SET_HAS_MOTIVES_CHANGES'; readonly payload: boolean }
  | { readonly type: 'SET_IS_STAGE_ACTION'; readonly payload: boolean }
  | { readonly type: 'SET_IS_NAVIGATION_CHANGE'; readonly payload: boolean }
  | { readonly type: 'SET_IS_EXPLICIT_BUTTON_CLICK'; readonly payload: boolean }
  | { readonly type: 'SET_IS_INITIALIZED'; readonly payload: boolean }
  | { readonly type: 'SET_LOADING'; readonly payload: boolean }
  | { readonly type: 'SET_IS_SAVING'; readonly payload: boolean }
  | { readonly type: 'SET_SAVING_ACTIVITIES'; readonly payload: boolean }
  | { readonly type: 'SET_SHOW_UNSAVED_DIALOG'; readonly payload: boolean }
  | { readonly type: 'SET_IS_INTENTIONAL_SUBMIT'; readonly payload: boolean }
  
  // String Actions
  | { readonly type: 'SET_ACTIVE_TAB'; readonly payload: string }
  
  // Nullable Actions
  | { readonly type: 'SET_LAST_SAVED_AT'; readonly payload: Date | null }
  | { readonly type: 'SET_OPERATION_ERROR'; readonly payload: string | null }
  
  // Complex Object Actions
  | { readonly type: 'SET_DISTRIBUTION_STATE'; readonly payload: Partial<PipelineCreatorState['distributionState']> }
  
  // No-payload Actions
  | { readonly type: 'MARK_FORM_CLEAN' }
  | { readonly type: 'MARK_FORM_DIRTY' }
  | { readonly type: 'COMPLETE_INITIALIZATION' }
  
  // Initialization Actions
  | { readonly type: 'START_ATOMIC_INITIALIZATION'; readonly payload: { readonly abortController: AbortController } }
  | { readonly type: 'SET_INITIALIZATION_PHASE'; readonly payload: InitializationState['phase'] }
  | { readonly type: 'STORE_LOADED_DATA'; readonly payload: Partial<InitializationState['loadedData']> }
  | { readonly type: 'COMPLETE_ATOMIC_INITIALIZATION' }
  | { readonly type: 'ABORT_INITIALIZATION' };

// ✅ IMPROVED: Type-safe reducer with discriminated union type narrowing
const pipelineCreatorReducer = (
  state: PipelineCreatorState,
  action: PipelineCreatorAction
): PipelineCreatorState => {
  // TypeScript automatically narrows action.type and payload based on discriminated union
  switch (action.type) {
    case 'SET_FORM_DATA': {
      // TypeScript knows action.payload is Partial<PipelineFormData>
      const { payload } = action;
      
      // ✅ OPTIMIZED: Log crítico otimizado com configuração de ambiente
      const config = COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR;
      
      
      
      const newFormData = { ...state.formData, ...payload };
      
      
      return {
        ...state,
        formData: newFormData
      };
    }
    
    case 'SET_HAS_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload };
    
    case 'SET_HAS_QUALIFICATION_CHANGES':
      return { ...state, hasQualificationChanges: action.payload };
    
    case 'SET_HAS_MOTIVES_CHANGES':
      return { ...state, hasMotivesChanges: action.payload };
    
    case 'SET_IS_STAGE_ACTION':
      return { ...state, isStageAction: action.payload };
    
    case 'SET_IS_NAVIGATION_CHANGE':
      return { ...state, isNavigationChange: action.payload };
    
    case 'SET_IS_EXPLICIT_BUTTON_CLICK':
      return { ...state, isExplicitButtonClick: action.payload };
    
    case 'SET_IS_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_IS_SAVING':
      return { ...state, isSaving: action.payload };
    
    case 'SET_SAVING_ACTIVITIES':
      return { ...state, savingActivities: action.payload };
    
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    
    case 'SET_SHOW_UNSAVED_DIALOG':
      return { ...state, showUnsavedDialog: action.payload };
    
    case 'SET_IS_INTENTIONAL_SUBMIT':
      return { ...state, isIntentionalSubmit: action.payload };
    
    case 'SET_LAST_SAVED_AT':
      return { ...state, lastSavedAt: action.payload };
    
    case 'SET_OPERATION_ERROR':
      return { ...state, operationError: action.payload };
    
    case 'SET_DISTRIBUTION_STATE':
      return {
        ...state,
        distributionState: { ...state.distributionState, ...action.payload }
      };
    
    case 'MARK_FORM_CLEAN':
      return {
        ...state,
        hasUnsavedChanges: false,
        hasQualificationChanges: false,
        hasMotivesChanges: false,
        distributionState: { ...state.distributionState, hasChanges: false }
      };
    
    case 'MARK_FORM_DIRTY':
      return {
        ...state,
        // ✅ CORREÇÃO CRÍTICA: Só marca como dirty se estiver inicializado E não estiver carregando
        hasUnsavedChanges: (state.isInitialized && !state.loading) ? true : state.hasUnsavedChanges
      };
    
    case 'INITIALIZE_FORM':
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
        isInitialized: true,
        hasUnsavedChanges: false,
        hasQualificationChanges: false,
        hasMotivesChanges: false
      };
    
    case 'COMPLETE_INITIALIZATION':
      return {
        ...state,
        // ✅ CORREÇÃO CRÍTICA: Limpar todas as flags de mudança após carregamento completo
        hasUnsavedChanges: false,
        hasQualificationChanges: false,
        hasMotivesChanges: false,
        distributionState: { ...state.distributionState, hasChanges: false },
        loading: false
      };
    
    // ✅ FASE 1: Casos do reducer para inicialização atômica
    case 'START_ATOMIC_INITIALIZATION':
      return {
        ...state,
        initializationState: {
          phase: 'preparing' as const,
          loadedData: {},
          startedAt: new Date(),
          completedAt: null,
          abortController: action.payload.abortController
        },
        loading: true,
        isInitialized: false
      };
    
    case 'SET_INITIALIZATION_PHASE':
      return {
        ...state,
        initializationState: {
          ...state.initializationState,
          phase: action.payload
        }
      };
    
    case 'STORE_LOADED_DATA':
      return {
        ...state,
        initializationState: {
          ...state.initializationState,
          loadedData: { ...state.initializationState.loadedData, ...action.payload }
        }
      };
    
    case 'BULK_INITIALIZE':
      // ✅ DEBUG CRÍTICO: Log antes da aplicação
      
      
      // ✅ FASE 2: Aplicação atômica de todos os dados sem disparar handlers individuais
      const newState: PipelineCreatorState = {
        ...state,
        formData: { ...state.formData, ...action.payload.formData },
        initializationState: {
          ...state.initializationState,
          phase: 'applying_data' as const,
          loadedData: { 
            ...state.initializationState.loadedData, 
            distributionRule: action.payload.distributionRule 
          }
        },
        // ✅ Flags de mudança permanecem false durante inicialização
        hasUnsavedChanges: false,
        hasQualificationChanges: false,
        hasMotivesChanges: false,
        distributionState: { ...state.distributionState, hasChanges: false }
      };


      // ✅ OTIMIZADO: Resultado da operação BULK_INITIALIZE - logging removido do reducer
      // Smart logger será usado no componente após o dispatch

      return newState;
    
    case 'COMPLETE_ATOMIC_INITIALIZATION':
      return {
        ...state,
        initializationState: {
          ...state.initializationState,
          phase: 'completed' as const,
          completedAt: new Date(),
          abortController: undefined
        },
        loading: false,
        isInitialized: true,
        // ✅ GARANTIA: Todas as flags de mudança são false após inicialização
        hasUnsavedChanges: false,
        hasQualificationChanges: false,
        hasMotivesChanges: false,
        distributionState: { ...state.distributionState, hasChanges: false }
      };
    
    case 'ABORT_INITIALIZATION':
      return {
        ...state,
        initializationState: {
          phase: 'idle' as const,
          loadedData: {},
          startedAt: null,
          completedAt: null,
          abortController: undefined
        },
        loading: false,
        isInitialized: false
      };
    
    default:
      return state;
  }
};

// ✅ PHASE 1: Estado inicial para o reducer
const createInitialState = (): PipelineCreatorState => ({
  hasUnsavedChanges: false,
  hasQualificationChanges: false,
  hasMotivesChanges: false,
  isStageAction: false,
  isNavigationChange: false,
  isExplicitButtonClick: false,
  isInitialized: false,
  loading: false,
  isSaving: false,
  savingActivities: false,
  activeTab: 'basic',
  showUnsavedDialog: false,
  isIntentionalSubmit: false,
  lastSavedAt: null,
  operationError: null,
  distributionState: {
    hasChanges: false,
    isInitializing: false,
    lastUpdate: null
  },
  // ✅ FASE 1: Estado inicial de inicialização atômica
  initializationState: {
    phase: 'idle' as const,
    loadedData: {},
    startedAt: null,
    completedAt: null,
    abortController: undefined
  },
  formData: {
    name: '',
    description: '',
    member_ids: [] as const,
    stages: [] as const,
    custom_fields: [] as const,
    cadence_configs: [] as const,
    distribution_rule: {
      mode: 'manual',
      is_active: true,
      working_hours_only: false,
      skip_inactive_members: true,
      fallback_to_manual: true
    },
    temperature_config: {
      hot_days: 3,
      warm_days: 7,
      cold_days: 14
    },
    qualification_rules: { mql: [] as const, sql: [] as const },
    outcome_reasons: { ganho_reasons: [] as const, perdido_reasons: [] as const }
  }
});

interface ModernPipelineCreatorProps {
  readonly members: readonly User[];
  membersLoading?: boolean;
  pipeline?: Pipeline;
  onSubmit: (data: PipelineFormData, shouldRedirect?: boolean) => Promise<Pipeline | void>;
  onCancel: () => void;
  title: string;
  submitText: string;
  onDuplicatePipeline?: () => Promise<void>;
  onArchivePipeline?: () => Promise<void>;
  // ✅ NOVA: Callback para receber pipeline atualizada
  onPipelineUpdated?: (pipeline: Pipeline) => void;
  // ✅ NOVA: Callback para expor o footer
  onFooterRender?: (footerElement: React.ReactNode) => void;
  // ✅ DRAFT MODE: Callback quando pipeline é criada (para sincronização de campos draft)
  onPipelineCreated?: (pipelineId: string) => void;
}

const ModernPipelineCreatorRefactored: React.FC<ModernPipelineCreatorProps> = ({
  members,
  membersLoading = false,
  pipeline,
  onSubmit,
  onCancel,
  title,
  submitText,
  onDuplicatePipeline,
  onArchivePipeline,
  onPipelineUpdated,
  onFooterRender,
  onPipelineCreated,
}) => {
  
  
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ✅ PERFORMANCE: Smart logger com ref para evitar recriação
  // ✅ SMART LOGGER: Sistema de logging inteligente otimizado com configuração centralizada
  const smartLoggerRef = useRef<any>(null);
  if (!smartLoggerRef.current) {
    smartLoggerRef.current = (() => {
      const config = COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR;
      const logStateRef = { current: {
        lastTabChange: 0,
        lastStateChange: 0,
        lastPerformanceLog: 0,
        lastFormValidation: 0,
        lastPropsLog: 0,
        suppressedCount: 0
      }};
      
      return {
        logTabChange: (data: any, operation: string) => {
          if (!config.enabled || !config.trackTabChanges) return;
          
          const now = Date.now();
          if (now - logStateRef.current.lastTabChange < config.throttleMs) {
            logStateRef.current.suppressedCount++;
            return;
          }
          
          console.log(`🔄 [PipelineCreator.${operation}]`, data);
          logStateRef.current.lastTabChange = now;
          
          if (logStateRef.current.suppressedCount > 0) {
            console.log(`📊 [PipelineCreator] ${logStateRef.current.suppressedCount} logs suprimidos`);
            logStateRef.current.suppressedCount = 0;
          }
        },
        
        logStateChange: (data: any, operation: string) => {
          if (!config.enabled) return;
          
          const now = Date.now();
          if (now - logStateRef.current.lastStateChange < config.throttleMs) return;
          
          console.log(`🔄 [PipelineCreator.${operation}]`, data);
          logStateRef.current.lastStateChange = now;
        },
        
        logState: (data: any, operation: string) => {
          if (!config.enabled) return;
          
          const now = Date.now();
          if (now - logStateRef.current.lastStateChange < config.throttleMs) return;
          
          console.log(`🔄 [PipelineCreator.${operation}]`, data);
          logStateRef.current.lastStateChange = now;
        },
        
        logProps: (data: any, operation: string = 'props-update') => {
          if (!config.enabled || !config.trackPerformance) return;
          
          const now = Date.now();
          if (now - logStateRef.current.lastPropsLog < config.throttleMs * 3) return;
          
          console.log(`📊 [PipelineCreator.${operation}]`, data);
          logStateRef.current.lastPropsLog = now;
        },
        
        logPerformance: (data: any, operation: string) => {
          if (!config.enabled || !config.trackPerformance) return;
          
          const now = Date.now();
          if (now - logStateRef.current.lastPerformanceLog < config.throttleMs * 2) return;
          
          console.log(`⚡ [PipelineCreator.${operation}]`, data);
          logStateRef.current.lastPerformanceLog = now;
        },
        
        logFormValidation: (data: any, operation: string) => {
          if (!config.enabled || !config.trackFormValidation) return;
          
          const now = Date.now();
          if (now - logStateRef.current.lastFormValidation < config.throttleMs) return;
          
          console.log(`📝 [PipelineCreator.${operation}]`, data);
          logStateRef.current.lastFormValidation = now;
        },
        
        logError: (error: any, operation: string) => {
          console.error(`❌ [PipelineCreator.${operation}]`, error);
        },
        
        // ✅ CORREÇÃO: Adicionar método initialization que estava sendo chamado mas não existia
        initialization: (message: string) => {
          if (!config.enabled) return;
          
          const now = Date.now();
          if (now - logStateRef.current.lastStateChange < config.throttleMs) return;
          
          console.log(`🚀 [PipelineCreator.initialization]`, message);
          logStateRef.current.lastStateChange = now;
        }
      };
    })();
  }

  const smartLogger = smartLoggerRef.current;

  // ✅ OPTIMIZED: Log de props com throttling inteligente e null safety
  useEffect(() => {
    // AIDEV-NOTE: Early return para null safety durante criação de nova pipeline
    if (!pipeline) return;
    
    smartLogger.logProps({
      members_count: members.length,
      members_loading: membersLoading,
      pipeline_id: pipeline?.id?.substring(0, 8) || 'new-pipeline',
      rafael_found: members.some(m => 
        m.email === 'rafael@renovedigital.com.br' || 
        m.first_name?.toLowerCase().includes('rafael')
      ),
      timestamp: new Date().toISOString()
    });
  }, [members, membersLoading, pipeline, smartLogger]);
  
  // ✅ PERFORMANCE: Integração do performance monitoring
  const performanceMonitor = usePerformanceMonitor('ModernPipelineCreatorRefactored');
  
  // ✅ PHASE 1: Usar useReducer para eliminar race conditions entre estados interdependentes
  const [state, dispatch] = useReducer(pipelineCreatorReducer, createInitialState());
  
  // ✅ PHASE 1: Destructuring para facilitar acesso aos estados
  const {
    hasUnsavedChanges,
    hasQualificationChanges,
    hasMotivesChanges,
    isStageAction,
    isNavigationChange,
    isExplicitButtonClick,
    isInitialized,
    loading,
    isSaving,
    savingActivities,
    activeTab,
    showUnsavedDialog,
    isIntentionalSubmit,
    lastSavedAt,
    operationError,
    distributionState,
    formData
  } = state;
  
  // Helper function for operation error
  const setOperationError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_OPERATION_ERROR', payload: error });
  }, []);
  
  // Hook de validação de nome único
  const pipelineNameValidation = usePipelineNameValidation(
    '', // Não passar nome inicial para evitar validação automática
    pipeline?.id
  );
  
  // ✅ NOVO: Cleanup do hook de validação quando componente desmontar
  useEffect(() => {
    return () => {
      // Cleanup quando componente for desmontado
      pipelineNameValidation.cleanup();
    };
  }, [pipelineNameValidation]);
  
  // ✅ NOVA: Referência para evitar re-inicialização desnecessária
  const lastInitializedPipelineId = useRef<string | null>(null);
  
  // ✅ OTIMIZAÇÃO: Sistema de debouncing para handlers frequentes
  const debounceTimeouts = useRef<{[key: string]: NodeJS.Timeout}>({});
  
  // ✅ CORREÇÃO: Refs para sistema de debounce de inicialização (movidos do useEffect)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastInitializationAttempt = useRef<string>('');
  
  // ✅ ETAPA 2: Ref para SimpleMotivesManager - forçar flush antes do save
  const simpleMotivesManagerRef = useRef<SimpleMotivesManagerRef>(null);
  
  const debounceHandler = useCallback((key: string, fn: () => void, delay: number = 500) => {
    if (debounceTimeouts.current[key]) {
      clearTimeout(debounceTimeouts.current[key]);
    }
    
    debounceTimeouts.current[key] = setTimeout(() => {
      fn();
      delete debounceTimeouts.current[key];
    }, delay);
  }, []);


  // ✅ FASE 3: Função inteligente para marcar formulário como modificado
  const markFormDirty = useCallback(() => {
    // ✅ FASE 3: Guards inteligentes - não marcar como dirty durante inicialização atômica
    const isInitializingAtomically = state.initializationState.phase !== 'idle' && 
      state.initializationState.phase !== 'completed';
    
    const isSystemOperation = state.loading || 
      distributionState.isInitializing || 
      !state.isInitialized ||
      isInitializingAtomically;

    if (!hasUnsavedChanges && state.isInitialized && !isSystemOperation) {
      dispatch({ type: 'MARK_FORM_DIRTY' });
      smartLoggerRef.current.logStateChange({ tipo: 'MARK_FORM_DIRTY' }, 'smart-dirty-marcado-usuario');
    } else if (isSystemOperation) {
      smartLoggerRef.current.logStateChange({ 
        bloqueado: true, 
        fase: state.initializationState.phase 
      }, 'smart-dirty-bloqueado-sistema');
    }
  }, [hasUnsavedChanges, state.isInitialized, state.loading, state.initializationState.phase, distributionState.isInitializing]);

  // ✅ PHASE 1: Função para limpar estado de mudanças (usando reducer)
  const markFormClean = useCallback(() => {
    smartLogger.logStateChange({
      antes: {
        hasUnsavedChanges,
        hasQualificationChanges,
        hasMotivesChanges,
        distributionChanges: distributionState.hasChanges
      },
      pipeline_id: pipeline?.id?.substring(0, 8)
    }, 'markFormClean-limpando-flags');
    
    dispatch({ type: 'MARK_FORM_CLEAN' });
    
    smartLogger.logStateChange({
      dispatch_executado: 'MARK_FORM_CLEAN',
      status: 'flags-limpos'
    }, 'markFormClean-dispatch-executado');
    
    // ✅ PHASE 1: Smart logger já registrou o evento acima
  }, [hasUnsavedChanges, hasQualificationChanges, hasMotivesChanges, distributionState.hasChanges, pipeline?.id, smartLogger]); // ✅ CORREÇÃO EXHAUSTIVE-DEPS: Adicionado smartLogger

  // ✅ SIMPLIFICADO: Estado calculado durante renderização (React best practice)
  const isDistributionBusy = distributionState.isInitializing;
  
  // ✅ CORREÇÃO: Proteção contra duplo clique/salvamento
  const isSavingRef = useRef<boolean>(false);

  // Callbacks para mudanças que marcam o formulário como dirty
  const handleStagesChange = useCallback((customStages: PipelineStage[]) => {
    // ✅ OPTIMIZED: Log com throttling inteligente baseado em configuração
    smartLogger.logState({
      customStagesCount: customStages.length,
      isEditMode: !!pipeline?.id,
    }, 'handleStagesChange');
    
    const systemStages = formData.stages.filter(stage => stage.is_system_stage);
    const allStages = [...systemStages, ...customStages];
    
    // ✅ PHASE 1: Usar dispatch para atualizar estado
    dispatch({ type: 'SET_FORM_DATA', payload: { stages: allStages } });
    
    // ✅ FASE 3: Usar markFormDirty inteligente e sinalizar que é ação de stage do usuário
    if (pipeline?.id) {
      markFormDirty(); // Já verifica se é operação do sistema internamente
      // ✅ PHASE 1: Flag para identificar mudanças de stage usando dispatch
      dispatch({ type: 'SET_IS_STAGE_ACTION', payload: true });
      smartLogger.logState({ action: 'stage_user_action' }, 'SMART-STAGE');
    }
  }, [pipeline?.id, markFormDirty, formData.stages, smartLogger]); // ✅ CORREÇÃO EXHAUSTIVE-DEPS: Adicionado smartLogger

  const handleFieldsUpdate = useCallback((custom_fields: CustomField[]) => {
    // ✅ OPTIMIZED: Log com throttling inteligente baseado em configuração
    smartLogger.logState({
      fieldsCount: custom_fields.length,
    }, 'handleFieldsUpdate');
    
    // ✅ PHASE 1: Usar dispatch para atualizar estado
    dispatch({ type: 'SET_FORM_DATA', payload: { custom_fields } });
    // ✅ CORREÇÃO CRÍTICA: NÃO marcar formulário como dirty para campos customizados
    // Campos customizados são salvos via API própria, não devem afetar estado do pipeline
    // if (pipeline?.id) markFormDirty(); // REMOVIDO: Causa fechamento automático do modal
  }, [pipeline?.id]);

  // ✅ CORREÇÃO CRÍTICA: Sistema de dirty state robusto para cadências
  const previousCadenceConfigsRef = useRef<any[]>([]);
  const cadenceChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCadencesChange = useCallback((cadence_configs: any[]) => {
    // ✅ PADRÃO REACT OFICIAL: Comparação deep para detectar mudanças reais
    const previousConfigs = previousCadenceConfigsRef.current;
    const hasLengthChange = previousConfigs.length !== cadence_configs.length;
    const hasContentChange = JSON.stringify(previousConfigs) !== JSON.stringify(cadence_configs);
    const hasRealChange = hasLengthChange || hasContentChange;
    
    // ✅ DEBUGGING: Log detalhado do fluxo (apenas em desenvolvimento)
    if (import.meta.env.DEV && hasRealChange) {
      if (cadenceChangeTimeoutRef.current) {
        clearTimeout(cadenceChangeTimeoutRef.current);
      }
      
    }
    
    // ✅ STEP 1: Atualizar estado do formulário
    dispatch({ type: 'SET_FORM_DATA', payload: { cadence_configs } });
    
    // ✅ STEP 2: CORREÇÃO CRÍTICA - Marcar como dirty apenas para mudanças reais do usuário
    if (pipeline?.id && isInitialized && hasRealChange) {
      markFormDirty();
    }
    
    // ✅ STEP 3: Atualizar referência para próxima comparação
    previousCadenceConfigsRef.current = JSON.parse(JSON.stringify(cadence_configs)); // Deep clone
  }, [pipeline?.id, isInitialized, markFormDirty, dispatch]); // ✅ DEPENDÊNCIAS COMPLETAS

  const handleDistributionRuleChange = useCallback((distribution_rule: DistributionRule, isNavChange = false) => {
    // ✅ OTIMIZADO: Log com throttling condicional apenas em desenvolvimento
    debounceHandler('distribution-log', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [handleDistributionRuleChange] Atualizando distribuição', { isNavChange });
      }
    }, 2000);
    
    // ✅ PHASE 1: Usar dispatch para definir flag de navegação
    dispatch({ type: 'SET_IS_NAVIGATION_CHANGE', payload: isNavChange });
    dispatch({ type: 'SET_FORM_DATA', payload: { distribution_rule } });
    
    // ✅ CORREÇÃO CRÍTICA: Só marcar como dirty se estiver inicializado e não for durante inicialização
    if (pipeline?.id && !distributionState.isInitializing && isInitialized) {
      markFormDirty();
      dispatch({ 
        type: 'SET_DISTRIBUTION_STATE', 
        payload: {
          hasChanges: true,
          lastUpdate: new Date()
        }
      });
      
      // ✅ PHASE 1: LOG LIMPO - Usar smart logger para distribution updates
      smartLogger.logStateChange({
        pipelineId: pipeline?.id || 'new-pipeline',
        isNavigation: isNavChange,
        timestamp: new Date().toISOString()
      }, 'distribution-rule-updated');
    }
    
    // ✅ CRÍTICO: Reset da flag após um breve delay para evitar submits automáticos
    if (isNavChange) {
      setTimeout(() => {
        dispatch({ type: 'SET_IS_NAVIGATION_CHANGE', payload: false });
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [handleDistributionRuleChange] Flag de navegação resetada');
        }
      }, 50);
    }
  }, [pipeline?.id, markFormDirty, distributionState.isInitializing]);

  const handleTemperatureConfigChange = useCallback((temperature_config: TemperatureConfig) => {
    debounceHandler('temperature-log', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🌡️ [handleTemperatureConfigChange] Recebido:', temperature_config);
      }
    }, 2000);
    // ✅ PHASE 1: Usar dispatch para atualizar estado
    dispatch({ type: 'SET_FORM_DATA', payload: { temperature_config } });
    
    // ✅ SOLUÇÃO DEFINITIVA: markFormDirty condicional
    // Só marca como dirty se estiver inicializado e for uma mudança real do usuário
    if (pipeline?.id && isInitialized) {
      markFormDirty();
    }
  }, [pipeline?.id, isInitialized, markFormDirty, debounceHandler]);

  const handleQualificationChange = useCallback((qualification_rules: QualificationRules) => {
    debounceHandler('qualification-log', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [handleQualificationChange] Atualizando qualificação');
      }
    }, 2000);
    // ✅ PHASE 1: Usar dispatch para atualizar estado
    dispatch({ type: 'SET_FORM_DATA', payload: { qualification_rules } });
    
    // ✅ SOLUÇÃO DEFINITIVA: flag específica condicional
    // Só marca como modificado se estiver inicializado e for uma mudança real do usuário  
    if (pipeline?.id && isInitialized) {
      dispatch({ type: 'SET_HAS_QUALIFICATION_CHANGES', payload: true });
      debounceHandler('qualification-dirty-log', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('📝 [handleQualificationChange] Qualificação marcada como modificada (sem fechar modal)');
        }
      }, 2000);
    }
  }, [pipeline?.id, isInitialized, debounceHandler]);

  // ✅ CORREÇÃO: Handler para mudanças de motivos seguindo padrão da aba Básico
  const handleMotivesChange = useCallback((outcome_reasons: FormOutcomeReasonsData) => {
    // 🔍 [SAVE-DEBUG] CALLBACK: Log detalhado dos dados recebidos do SimpleMotivesManager
    console.log(`🔍 [SAVE-DEBUG-CALLBACK] handleMotivesChange RECEBEU dados:`, {
      step: 'PARENT_CALLBACK_RECEIVED',
      callback_triggered_by: 'SimpleMotivesManager.updateReasonText',
      received_data: outcome_reasons,
      data_structure_check: {
        is_object: typeof outcome_reasons === 'object',
        has_ganho_key: 'ganho_reasons' in outcome_reasons,
        has_perdido_key: 'perdido_reasons' in outcome_reasons,
        ganho_is_array: Array.isArray(outcome_reasons.ganho_reasons),
        perdido_is_array: Array.isArray(outcome_reasons.perdido_reasons)
      },
      ganho_count: outcome_reasons.ganho_reasons?.length || 0,
      perdido_count: outcome_reasons.perdido_reasons?.length || 0,
      ganho_texts: outcome_reasons.ganho_reasons?.map(r => r.reason_text) || [],
      perdido_texts: outcome_reasons.perdido_reasons?.map(r => r.reason_text) || [],
      // Verificar especificamente por "nenis"
      nenis_found: outcome_reasons.perdido_reasons?.some(r => r.reason_text?.includes('nenis')) || 
                   outcome_reasons.ganho_reasons?.some(r => r.reason_text?.includes('nenis')) || false,
      timestamp: new Date().toISOString()
    });

    // 🔍 [SAVE-DEBUG] DISPATCH: Log antes de atualizar o estado React
    console.log(`🔍 [SAVE-DEBUG-DISPATCH] ANTES de dispatch SET_FORM_DATA:`, {
      step: 'PRE_REACT_STATE_UPDATE',
      current_formData_outcome_reasons: formData.outcome_reasons,
      new_outcome_reasons: outcome_reasons,
      will_update_state: true,
      dispatch_type: 'SET_FORM_DATA',
      dispatch_payload: { outcome_reasons },
      timestamp: new Date().toISOString()
    });
    
    // Disparar dispatch para atualizar formData
    dispatch({ type: 'SET_FORM_DATA', payload: { outcome_reasons } });
    dispatch({ type: 'SET_HAS_MOTIVES_CHANGES', payload: true });
    markFormDirty();

    // 🔍 [SAVE-DEBUG] POST-DISPATCH: Log após atualização do estado
    console.log(`🔍 [SAVE-DEBUG-POST-DISPATCH] APÓS dispatch:`, {
      step: 'POST_REACT_STATE_UPDATE',
      dispatch_completed: true,
      has_motives_changes_set: true,
      form_marked_dirty: true,
      next_step: 'Estado React atualizado, aguardando próxima ação do usuário (ex: clique em Salvar)',
      timestamp: new Date().toISOString()
    });
    
  }, [dispatch, markFormDirty, debounceHandler, pipeline?.id, pipeline?.name, formData.name]);


  // ✅ PHASE 1: Handlers para campos básicos usando dispatch
  // ✅ PHASE 3: Memoizar funções estáveis de pipelineNameValidation
  const stableUpdateName = useMemo(() => pipelineNameValidation.updateName, [pipelineNameValidation.updateName]);

  const handleNameChange = useCallback((value: string) => {
    dispatch({ type: 'SET_FORM_DATA', payload: { name: value } });
    // Sincronizar com hook de validação se necessário
    if (pipelineNameValidation.name !== value) {
      stableUpdateName(value);
    }
    
    // ✅ FASE 3B: Smart guard - não marcar como dirty durante inicialização atômica ou sincronização
    const isInitializingAtomically = state.initializationState.phase !== 'idle' && 
      state.initializationState.phase !== 'completed';
    const isSyncingName = formData.name === value; // Se o valor já está no formData, é sincronização
    
    // ✅ FASE 3: Usar markFormDirty inteligente (já verifica se é operação do sistema)
    if (pipeline?.id && !isInitializingAtomically && !isSyncingName) {
      markFormDirty();
    }
  }, [pipeline?.id, markFormDirty, stableUpdateName, pipelineNameValidation.name, state.initializationState.phase, formData.name]);

  const handleDescriptionChange = useCallback((value: string) => {
    dispatch({ type: 'SET_FORM_DATA', payload: { description: value } });
    
    // ✅ FASE 3B: Smart guard - não marcar como dirty durante inicialização atômica ou sincronização
    const isInitializingAtomically = state.initializationState.phase !== 'idle' && 
      state.initializationState.phase !== 'completed';
    const isSyncingDescription = formData.description === value; // Se o valor já está no formData, é sincronização
    
    // ✅ FASE 3: Usar markFormDirty inteligente (já verifica se é operação do sistema)
    if (pipeline?.id && !isInitializingAtomically && !isSyncingDescription) {
      markFormDirty();
    }
  }, [pipeline?.id, markFormDirty, state.initializationState.phase, formData.description]);

  // ✅ PHASE 3: Memoizar member_ids para evitar recriação constante do useCallback
  const memberIds = useMemo(() => formData.member_ids, [formData.member_ids]);

  // ✅ DEBUG CRÍTICO: Monitor de alterações no formData.member_ids (apenas em desenvolvimento)
  useEffect(() => {
    if (COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.enabled) {
      console.log('🔍 [FORMDATA-MEMBER-IDS-MONITOR] Mudança detectada:', {
        formData_member_ids: formData.member_ids,
        count: formData.member_ids?.length || 0,
        memberIds_memoized: memberIds,
        memoized_count: memberIds?.length || 0,
        same_reference: formData.member_ids === memberIds,
        pipeline_id: pipeline?.id?.substring(0, 8) || 'N/A',
        timestamp: new Date().toISOString(),
        sample: formData.member_ids?.slice(0, 3)?.map(id => id.substring(0, 8)) || []
      });
    }
  }, [formData.member_ids, memberIds, pipeline?.id]);
  
  // 🔍 DEBUG CRÍTICO: Monitor de alterações no formData.outcome_reasons
  useEffect(() => {
    console.log('🎯 [FORMDATA-OUTCOME-REASONS-MONITOR] Mudança detectada:', {
      formData_outcome_reasons: formData.outcome_reasons,
      outcome_reasons_type: typeof formData.outcome_reasons,
      outcome_reasons_isNull: formData.outcome_reasons === null,
      outcome_reasons_isUndefined: formData.outcome_reasons === undefined,
      outcome_reasons_keys: formData.outcome_reasons ? Object.keys(formData.outcome_reasons) : 'N/A',
      ganho_count: formData.outcome_reasons?.ganho_reasons?.length || 0,
      perdido_count: formData.outcome_reasons?.perdido_reasons?.length || 0,
      ganho_sample: formData.outcome_reasons?.ganho_reasons?.slice(0, 2).map(r => r?.reason_text?.substring(0, 30)) || [],
      perdido_sample: formData.outcome_reasons?.perdido_reasons?.slice(0, 2).map(r => r?.reason_text?.substring(0, 30)) || [],
      pipeline_id: pipeline?.id?.substring(0, 8) || 'N/A',
      isInitialized,
      timestamp: new Date().toISOString()
    });
  }, [formData.outcome_reasons, pipeline?.id, isInitialized]);

  const handleMemberToggle = useCallback((memberId: string) => {
    const newMemberIds = memberIds.includes(memberId)
      ? memberIds.filter(id => id !== memberId)
      : [...memberIds, memberId];
    
    // ✅ TRACKING: Log detalhado da alteração de vendedores (apenas em desenvolvimento)
    if (COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.enabled) {
      console.log('🔄 [MEMBER-TOGGLE-TRACKING] Alteração de vendedor:', {
        memberId,
        memberIdSubstring: memberId.substring(0, 8),
        action: memberIds.includes(memberId) ? 'REMOVER' : 'ADICIONAR',
        memberIds_antes: [...memberIds],
        memberIds_depois: [...newMemberIds],
        count_antes: memberIds.length,
        count_depois: newMemberIds.length,
        pipeline_id: pipeline?.id?.substring(0, 8) || 'N/A',
        formData_member_ids_antes: formData.member_ids,
        formData_member_ids_count: formData.member_ids?.length || 0,
        timestamp: new Date().toISOString()
      });
    }
    
    dispatch({ type: 'SET_FORM_DATA', payload: { member_ids: newMemberIds } });
    
    // ✅ FASE 3B: Smart guard - não marcar como dirty durante inicialização atômica
    const isInitializingAtomically = state.initializationState.phase !== 'idle' && 
      state.initializationState.phase !== 'completed';
    
    // ✅ FASE 3: Usar markFormDirty inteligente (já verifica se é operação do sistema)
    if (pipeline?.id && !isInitializingAtomically) {
      markFormDirty();
    }
  }, [pipeline?.id, markFormDirty, memberIds, state.initializationState.phase]);

  // ✅ PHASE 3: Memoizar valores computados caros
  const initialCustomStages = useMemo(() => {
    return formData.stages.filter(stage => !stage.is_system_stage);
  }, [formData.stages]);

  // ✅ PHASE 3: totalChanges já está memoizado mais abaixo no componente

  // ✅ PHASE 3: Memoizar configuração estável para managers
  const stableManagerConfig = useMemo(() => ({
    pipelineId: pipeline?.id || '',
    tenantId: user?.tenant_id || '',
    enableApiIntegration: !!pipeline?.id
  }), [pipeline?.id, user?.tenant_id]);
  
  const stageManager = useStageManager({
    initialStages: initialCustomStages,
    onStagesChange: handleStagesChange
  });

  const fieldsManager = useCustomFieldsManager({
    customFields: formData.custom_fields ? [...formData.custom_fields] : [],
    onFieldsUpdate: (fields) => handleFieldsUpdate([...fields]),
    pipelineId: pipeline?.id,
    // ✅ DRAFT MODE: Callback para sincronização automática quando pipeline é criada
    onPipelineCreated: onPipelineCreated
  });
  

  const cadenceManager = useCadenceManager({
    initialCadences: formData.cadence_configs ? [...formData.cadence_configs] : [],
    // ✅ CORREÇÃO: Mapear stages para formato esperado pelo CadenceManager
    availableStages: stageManager.stages.map(stage => ({
      name: stage.name,
      order_index: stage.order_index
    })),
    onCadencesChange: handleCadencesChange,
    // ✅ PHASE 3: Usar configuração estável para evitar re-renders
    pipelineId: stableManagerConfig.pipelineId,
    tenantId: stableManagerConfig.tenantId,
    enableApiIntegration: stableManagerConfig.enableApiIntegration
  });

  const distributionManager = useLocalDistributionManager({
    pipelineId: stableManagerConfig.pipelineId,
    onRuleChange: handleDistributionRuleChange
  });

  // ✅ NOVO: Salvar mudanças sem fechar (modo edição) - MOVIDO ANTES DOS USEEFFECT
  const handleSaveChanges = useCallback(async () => {
    if (!pipeline?.id) return;

    // ✅ ETAPA 2: Forçar flush de todos os campos pendentes antes da normalização (modo edição)
    console.log('🧹 [handleSaveChanges] Forçando flush de todos os campos antes do salvamento');
    try {
      if (simpleMotivesManagerRef.current) {
        simpleMotivesManagerRef.current.forceFlushAllFields();
        console.log('✅ [handleSaveChanges] Flush dos motivos concluído com sucesso');
      } else {
        console.warn('⚠️ [handleSaveChanges] simpleMotivesManagerRef.current é null - não foi possível fazer flush');
      }
    } catch (error) {
      console.error('❌ [handleSaveChanges] Erro ao forçar flush dos campos:', error);
      // Não bloquear o save por erro de flush - apenas logar
    }
    
    // ✅ CORREÇÃO CRÍTICA: Proteção contra duplo clique/execução
    if (isSavingRef.current) {
      smartLoggerRef.current.logStateChange('saveBlocked', () => {
        smartLogger.logStateChange({
          isSaving,
          pipelineId: pipeline?.id,
          reason: 'operation_in_progress'
        }, 'save-blocked');
      });
      return;
    }
    
    // ✅ PERFORMANCE: Iniciar medição de performance
    return await performanceMonitor.measureAsync('saveChanges', async () => {
      try {
        // Marcar início do salvamento
        isSavingRef.current = true;
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_IS_SAVING', payload: true });
        // ✅ PERFORMANCE: Debounced logging para save operations
        smartLoggerRef.current.logStateChange('saveStart', () => {
          console.log('💾 [handleSaveChanges] Iniciando salvamento');
        });
      
      // ✅ CONSOLIDADO: Salvar distribuição com estado unificado
      if (distributionState.hasChanges && distributionManager.handleSave) {
        smartLogger.logStateChange({
          hasChanges: distributionState.hasChanges,
          pipelineId: pipeline?.id
        }, 'saving-distribution-config');
        
        await distributionManager.handleSave();
        
        smartLogger.logStateChange({
          pipelineId: pipeline?.id,
          result: 'success'
        }, 'distribution-config-saved');
      }

      // ✅ NOVO: Salvar regras de qualificação se houver mudanças
      if (hasQualificationChanges && formData.qualification_rules) {
        console.log('🔄 [handleSaveChanges] Salvando regras de qualificação...');
        await saveQualificationRules(pipeline.id, formData.qualification_rules);
        console.log('✅ [handleSaveChanges] Regras de qualificação salvas');
      }

      // 🚨 LOG CRÍTICO: Estado completo no momento do clique em Salvar
      console.log('🚨 [handleSaveChanges] ESTADO CRÍTICO NO MOMENTO DO CLIQUE:', {
        formData_completo: formData,
        formData_outcome_reasons_completo: formData.outcome_reasons,
        estado_atual_ganho: formData.outcome_reasons?.ganho_reasons,
        estado_atual_perdido: formData.outcome_reasons?.perdido_reasons,
        ganho_length: formData.outcome_reasons?.ganho_reasons?.length || 0,
        perdido_length: formData.outcome_reasons?.perdido_reasons?.length || 0,
        timestamp_clique: new Date().toISOString()
      });
      
      // 🚨 ANÁLISE ESPECÍFICA: Se perdido está vazio, investigar últimas mudanças
      if ((formData.outcome_reasons?.perdido_reasons?.length || 0) === 0) {
        console.log('🚨 [PERDIDO-INVESTIGAÇÃO] PERDIDO_REASONS ESTÁ VAZIO - ANÁLISE:', {
          perdido_reasons_length: formData.outcome_reasons?.perdido_reasons?.length || 0,
          ganho_reasons_length: formData.outcome_reasons?.ganho_reasons?.length || 0,
          outcome_reasons_object: formData.outcome_reasons,
        });
      }

      // ✅ NOVO: Salvar motivos de ganho/perdido se houver mudanças
      
      // ✅ CORREÇÃO CRÍTICA: Salvar motivos quando há mudanças, independente do estado do formData
      if (hasMotivesChanges) {
        
        try {
          
          let motivesToSave = formData.outcome_reasons || { ganho_reasons: [], perdido_reasons: [] };

          
          await saveOutcomeReasons(pipeline.id, motivesToSave);
          
          
          // ✅ CORREÇÃO: Marcar como salvo apenas se salvamento teve sucesso
          dispatch({ type: 'SET_HAS_MOTIVES_CHANGES', payload: false });
          console.log('🔄 [handleSaveChanges] hasMotivesChanges resetado para false');
          
        } catch (error) {
          console.error('❌ [handleSaveChanges] Erro ao salvar motivos:', error);
          throw error;
        }
      } else {
        console.log('ℹ️ [handleSaveChanges] Sem mudanças de motivos para salvar (hasMotivesChanges=false)');
      }
      
      // ✅ CORREÇÃO: Receber pipeline atualizada do onSubmit - manter modal aberto
      const updatedPipeline = await onSubmit(formData, false); // false = não redirecionar, manter modal aberto
      
      // ✅ DRAFT MODE: Notificar criação de pipeline para sincronização de campos draft
      if (updatedPipeline && updatedPipeline.id && onPipelineCreated) {
        try {
          onPipelineCreated(updatedPipeline.id);
        } catch (error) {
          console.error('❌ [handleSaveChanges] Erro no callback onPipelineCreated:', error);
        }
      }
      
      // ✅ CRÍTICO: Limpar flag após uso
      if (isStageAction) {
        dispatch({ type: 'SET_IS_STAGE_ACTION', payload: false });
      }
      
      markFormClean();
      dispatch({ type: 'SET_LAST_SAVED_AT', payload: new Date() });
      
      // ✅ NOVO: Verificar se flags foram realmente limpos
      console.log('🔍 [handleSaveChanges] VERIFICAÇÃO PÓS MARKFORMCLEAN:', {
        hasUnsavedChanges_depois: hasUnsavedChanges,
        hasQualificationChanges_depois: hasQualificationChanges,
        hasMotivesChanges_depois: hasMotivesChanges,
        distributionChanges_depois: distributionState.hasChanges,
        markFormCleanChamado: true,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ [handleSaveChanges] Salvamento concluído com sucesso');
      
      } catch (error) {
        console.error('❌ [handleSaveChanges] Erro ao salvar:', error);
        showErrorToast('Erro ao salvar', 'Não foi possível salvar as mudanças');
      } finally {
        // ✅ CORREÇÃO CRÍTICA: Liberar proteção contra duplo clique
        isSavingRef.current = false;
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_IS_SAVING', payload: false });
        console.log('🔓 [handleSaveChanges] Proteção contra duplo clique liberada');
      }
    });
  }, [pipeline?.id, formData, onSubmit, hasQualificationChanges, hasMotivesChanges, isStageAction, isSaving, user?.tenant_id, markFormClean, distributionState.hasChanges, distributionManager.handleSave, queryClient, performanceMonitor, smartLogger.logStateChange, showErrorToast]);

  // ✅ PHASE 1: Sincronizar estado durante renderização usando dispatch
  useEffect(() => {
    dispatch({ 
      type: 'SET_DISTRIBUTION_STATE', 
      payload: { isInitializing: distributionManager.isInitializing }
    });
  }, [distributionManager.isInitializing]);

  // ✅ FASE 3A: Sincronizar pipelineNameValidation com formData.name após BULK_INITIALIZE
  useEffect(() => {
    // ✅ GUARD: Só sincronizar se há nome no formData e é diferente do atual
    if (formData.name && formData.name !== pipelineNameValidation.name) {
      console.log('🔄 [NAME-SYNC] Sincronizando pipelineNameValidation com formData:', {
        formData_name: formData.name,
        current_validation_name: pipelineNameValidation.name,
        initializationPhase: state.initializationState.phase
      });
      
      // ✅ Usar initializeName para não disparar validação desnecessária
      pipelineNameValidation.initializeName(formData.name);
    }
  }, [formData.name, pipelineNameValidation, state.initializationState.phase]);

  // ✅ PHASE 2: AUTOSAVE com dependencies corretas e cleanup adequado
  useEffect(() => {
    if (!isStageAction || !pipeline?.id) return;
    
    // ✅ PHASE 2: AbortController para cancelar operações pendentes
    const abortController = new AbortController();
    
    // Debounce para evitar salvamentos excessivos
    const timeoutId = setTimeout(async () => {
      // ✅ PHASE 2: Verificar se a operação foi cancelada
      if (abortController.signal.aborted) return;
      
      try {
        console.log('🔄 [AutoSave-Stages] Salvando mudanças de stages automaticamente...');
        await handleSaveChanges();
        console.log('✅ [AutoSave-Stages] Mudanças de stages salvas com sucesso');
      } catch (error) {
        // ✅ PHASE 2: Não logar error se foi abort intencional
        if (error.name !== 'AbortError') {
          console.error('❌ [AutoSave-Stages] Erro ao salvar stages:', error);
        }
      }
    }, 1000); // Aguarda 1 segundo após a última mudança

    // ✅ PHASE 2: Cleanup que cancela timeout e aborta operações pendentes
    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [isStageAction, pipeline?.id, handleSaveChanges]); // ✅ PHASE 2: Dependencies completas

  // ✅ CORREÇÃO CRÍTICA: Auto-save removido para seguir padrão manual das outras abas
  // Sistema de motivos agora só salva quando botão "Salvar Alterações" é pressionado

  const temperatureManager = useTemperatureConfig({
    pipelineId: pipeline?.id,
    tenantId: user?.tenant_id,
    initialConfig: formData.temperature_config,
    onConfigChange: handleTemperatureConfigChange
  });

  // ✅ PHASE 3: Memoizar campos disponíveis para evitar recálculo constante
  const availableFields = useMemo(() => {
    // ✅ CORREÇÃO: Lista de campos sistema que nunca devem ser marcados como draft
    const SYSTEM_FIELD_NAMES = ['nome_lead', 'email', 'telefone'];
    
    // fieldsManager.customFields já inclui campos sistema + customizados
    return (fieldsManager.customFields || [])
      .filter(field => field.field_name && field.field_label) // Garantir que têm nome e label
      .map(field => {
        // ✅ DRAFT SUPPORT: Identificar campos draft (sem ID do banco E não é campo sistema)
        const isSystemField = SYSTEM_FIELD_NAMES.includes(field.field_name);
        const isDraft = !field.id && !isSystemField; // ✅ CORREÇÃO: Campos sistema nunca são draft
        const fieldLabel = isDraft ? `${field.field_label} (Draft)` : field.field_label;
        
        return {
          value: field.field_name,
          label: fieldLabel,       // ✅ MELHORADO: Identificar apenas campos customizados draft
          type: field.field_type,
          isDraft: isDraft        // ✅ CORREÇÃO: Flag precisa para identificação de campos draft
        };
      });
  }, [fieldsManager.customFields]);

  const getAvailableFields = useCallback(() => {
    return availableFields;
  }, [availableFields]);

  // ✅ CORREÇÃO: Memoizar vendedores para evitar recálculo constante
  const salesMembers = useMemo(() => {
    // ✅ ETAPA 4: Log Winston crítico com controle de configuração
    if (COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.enabled) {
      loggers.modernPipelineCreator.info('Iniciando filtragem de sales members', {
        total_members: members.length,
        members_preview: members.map(m => ({
          id: formatLeadIdForLog(m.id),
          email: m.email,
          first_name: m.first_name,
          role: m.role,
          is_active: m.is_active,
          role_type: typeof m.role,
          is_active_type: typeof m.is_active
        }))
      });
    }

    const filtered = members.filter(m => {
      const isRoleMember = m.role === 'member';
      const isActive = m.is_active !== false;
      const passesFilter = isRoleMember && isActive;
      
      // ✅ DEBUG CRÍTICO: Log detalhado para cada member (especialmente Rafael)
      if (COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.enabled) {
        const isRafael = m.first_name?.toLowerCase().includes('rafael') || m.email?.toLowerCase().includes('rafael');
        if (isRafael || !passesFilter) {
          console.log(`🔍 [SALES-MEMBERS-FILTER] Member ${m.first_name} (${m.email?.substring(0, 15)}):`, {
            id: m.id?.substring(0, 8),
            role: m.role,
            role_check: `${m.role} === 'member' = ${isRoleMember}`,
            is_active: m.is_active,
            is_active_check: `${m.is_active} !== false = ${isActive}`,
            passes_filter: passesFilter,
            is_rafael: isRafael
          });
        }
      }
      
      return passesFilter;
    });

    // ✅ DEBUG CRÍTICO: Log do resultado final
    if (COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.enabled) {
      console.log('✅ [SALES-MEMBERS-RESULT] Filtragem concluída:', {
        original_count: members.length,
        filtered_count: filtered.length,
        filtered_members: filtered.map(m => ({
          id: m.id?.substring(0, 8),
          email: m.email,
          first_name: m.first_name
        })),
        rafael_found: filtered.some(m => m.first_name?.toLowerCase().includes('rafael') || m.email?.toLowerCase().includes('rafael'))
      });
    }

    return filtered;
  }, [members]);

  // ✅ PHASE 1: Handler para fechar modal com verificação de mudanças usando dispatch
  const handleCloseAttempt = useCallback(() => {
    if (hasUnsavedChanges && pipeline?.id) {
      dispatch({ type: 'SET_SHOW_UNSAVED_DIALOG', payload: true });
    } else {
      // ✅ CORREÇÃO: Cleanup do hook de validação antes de fechar
      pipelineNameValidation.cleanup();
      onCancel();
    }
  }, [hasUnsavedChanges, pipeline?.id, onCancel, pipelineNameValidation.cleanup]);

  // ✅ PHASE 1: Salvar mudanças e fechar usando dispatch
  const handleSaveAndClose = useCallback(async () => {
    if (!pipeline?.id) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // ✅ PERFORMANCE: Debounced logging para save operations
      smartLoggerRef.current.logStateChange('handleSaveAndClose', () => {
        console.log('💾 [handleSaveAndClose] Salvando mudanças antes de fechar');
      });
      
      await onSubmit(formData, true); // ✅ CORREÇÃO: manter modal aberto após salvar
      markFormClean();
      dispatch({ type: 'SET_SHOW_UNSAVED_DIALOG', payload: false });
      onCancel();
    } catch (error) {
      console.error('❌ [handleSaveAndClose] Erro ao salvar:', error);
      showErrorToast('Erro ao salvar', 'Não foi possível salvar as mudanças');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [pipeline?.id, formData, onSubmit, markFormClean, onCancel]);


  // ✅ PHASE 1: Descartar mudanças e fechar usando dispatch
  const handleDiscardAndClose = useCallback(() => {
    console.log('🗑️ [handleDiscardAndClose] Descartando mudanças');
    
    // ✅ CORREÇÃO: Cleanup do hook de validação antes de fechar
    pipelineNameValidation.cleanup();
    
    markFormClean();
    dispatch({ type: 'SET_SHOW_UNSAVED_DIALOG', payload: false });
    onCancel();
  }, [markFormClean, onCancel, pipelineNameValidation.cleanup]);

  // ✅ PHASE 1: Cancelar fechamento usando dispatch
  const handleCancelClose = useCallback(() => {
    dispatch({ type: 'SET_SHOW_UNSAVED_DIALOG', payload: false });
  }, []);

  // ✅ RESET: Resetar estado quando pipeline muda
  useEffect(() => {
    if (!pipeline) return;

    // ✅ CORREÇÃO CRÍTICA: Reset state se pipeline mudou
    if (lastInitializedPipelineId.current && pipeline?.id && lastInitializedPipelineId.current !== pipeline.id) {
      console.log('🔄 [Reset] Pipeline mudou, resetando estado:', lastInitializedPipelineId.current, '→', pipeline.id);
      dispatch({ type: 'SET_IS_INITIALIZED', payload: false });
      lastInitializedPipelineId.current = null;
    }
  }, [pipeline?.id]);

  // ✅ FASE 2: Função de inicialização atômica (resolve problemas de race condition)
  const performAtomicInitialization = async (pipelineData: any): Promise<void> => {
    const abortController = new AbortController();
    
    
    try {
      // ✅ FASE 2: Iniciar processo atômico
      dispatch({ 
        type: 'START_ATOMIC_INITIALIZATION', 
        payload: { abortController } 
      });

      // ✅ FASE 2: Carregar todos os dados em paralelo SEM aplicar ao estado
      dispatch({ type: 'SET_INITIALIZATION_PHASE', payload: 'loading_data' });
      
      const dataLoadingPromises = [
        loadCustomFields(pipelineData.id, abortController.signal),
        loadCadenceConfigs(pipelineData.id, abortController.signal),
        loadDistributionRule(pipelineData.id, abortController.signal),
        loadTemperatureConfig(pipelineData.id, abortController.signal),
        loadQualificationRules(pipelineData.id, abortController.signal),
        loadOutcomeReasons(pipelineData.id, abortController.signal),
        loadPipelineMembers(pipelineData.id, abortController.signal)
      ];

      const results = await Promise.allSettled(dataLoadingPromises);
      
      // ✅ FASE 2: Verificar se foi cancelado
      if (abortController.signal.aborted) {
        dispatch({ type: 'ABORT_INITIALIZATION' });
        return;
      }

      // ✅ FASE 2: Extrair dados com fallbacks robustos
      const [
        customFieldsResult,
        cadenceConfigsResult, 
        distributionRuleResult,
        temperatureConfigResult,
        qualificationRulesResult,
        outcomeReasonsResult,
        pipelineMembersResult
      ] = results;

      const customFields = customFieldsResult.status === 'fulfilled' ? customFieldsResult.value : [];
      const cadenceConfigs = cadenceConfigsResult.status === 'fulfilled' ? cadenceConfigsResult.value : [];

      // ✅ DEBUG: Log detalhado dos campos customizados carregados
      const validatedFields = validateCustomFieldsArray(customFields);
      const rawFieldsCount = Array.isArray(customFields) ? customFields.length : 0;
      
      console.log('🔍 [CUSTOM-FIELDS-LOADED] Campos carregados do banco:', {
        rawCount: rawFieldsCount,
        validatedCount: (validatedFields ?? []).length,
        validationPassed: validatedFields !== null,
        rawStructure: Array.isArray(customFields) ? customFields.slice(0, 2).map(field => ({
          id: field?.id,
          field_name: field?.field_name, 
          field_label: field?.field_label,
          field_type: field?.field_type,
          field_order: field?.field_order,
          hasRequiredFields: !!(field?.field_name && field?.field_label),
          missingFields: {
            field_name: !field?.field_name,
            field_label: !field?.field_label,
            field_type: !field?.field_type
          }
        })) : [],
        allFieldNames: (validatedFields ?? []).map(f => f?.field_name).slice(0, 5)
      });

      // ✅ DEBUG ADICIONAL: Se validação falhou, mostrar motivo
      if (rawFieldsCount > 0 && (!validatedFields || validatedFields.length === 0)) {
        console.warn('⚠️ [CUSTOM-FIELDS-VALIDATION] Validação Zod falhando:', {
          rawFields: customFields,
          schemaTest: Array.isArray(customFields) ? customFields.map(field => {
            const testResult = CustomFieldSchema.safeParse(field);
            return {
              field_name: field?.field_name,
              field_type: field?.field_type,
              success: testResult.success,
              errors: testResult.success ? null : testResult.error.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message,
                code: issue.code
              }))
            };
          }) : 'Not an array'
        });
        
        // ✅ CORREÇÃO DEBUG: Log individual de cada campo para análise detalhada
        if (Array.isArray(customFields)) {
          customFields.forEach((field, index) => {
            console.log(`🔍 [FIELD-${index}] Dados recebidos COMPLETO:`, {
              id: field?.id,
              field_name: field?.field_name,
              field_label: field?.field_label, // ✅ ADICIONADO: mostrar field_label
              field_type: field?.field_type,
              field_order: field?.field_order,
              is_required: field?.is_required,
              show_in_card: field?.show_in_card,
              pipeline_id: field?.pipeline_id,
              created_at: field?.created_at,
              updated_at: field?.updated_at,
              // ✅ DEBUG ADICIONAL: Verificar estrutura completa
              allKeys: Object.keys(field || {}),
              hasFieldLabel: field?.field_label !== undefined && field?.field_label !== null,
              hasAllRequired: !!(field?.field_name && field?.field_label && field?.field_type),
              // ✅ CRITICAL DEBUG: Mostrar erro detalhado do Zod
              zodTestResult: (() => {
                const result = CustomFieldSchema.safeParse(field);
                if (!result.success) {
                  console.error(`❌ [ZOD-ERROR-FIELD-${index}] Validação falhou:`, {
                    fieldName: field?.field_name,
                    errors: result.error.issues.map(issue => ({
                      path: issue.path.join('.'),
                      message: issue.message,
                      code: issue.code,
                      expected: issue.expected,
                      received: issue.received
                    }))
                  });
                }
                return result;
              })()
            });
          });
        }
      }
      const distributionRule = distributionRuleResult.status === 'fulfilled' ? distributionRuleResult.value : { mode: 'manual', is_active: true };
      const temperatureConfig = temperatureConfigResult.status === 'fulfilled' ? temperatureConfigResult.value : null;
      const qualificationRules = qualificationRulesResult.status === 'fulfilled' ? qualificationRulesResult.value : [];
      const outcomeReasons = outcomeReasonsResult.status === 'fulfilled' ? outcomeReasonsResult.value : { ganho_reasons: [] as const, perdido_reasons: [] as const };
      const pipelineMembers = pipelineMembersResult.status === 'fulfilled' ? pipelineMembersResult.value : [];

      // ✅ DEBUG CRÍTICO: Verificar resultado do carregamento de motivos
      console.log('🔍 [MOTIVOS-DEBUG] Status do carregamento de motivos:', {
        outcomeReasonsResult_status: outcomeReasonsResult.status,
        outcomeReasonsResult_error: outcomeReasonsResult.status === 'rejected' ? outcomeReasonsResult.reason : null,
        outcomeReasons_loaded: outcomeReasons,
        ...(() => {
          const stats = getOutcomeReasonsStats(outcomeReasons);
          return {
            outcomeReasons_ganhoCount: stats.ganhoCount,
            outcomeReasons_perdidoCount: stats.perdidoCount,
            outcomeReasons_structure: stats.ganhoSample
          };
        })()
      });

      // ✅ FASE 2: Armazenar dados carregados temporariamente
      dispatch({ 
        type: 'STORE_LOADED_DATA', 
        payload: { 
          pipeline: pipelineData,
          distributionRule: validateDistributionRule(distributionRule) ?? getDefaultDistributionRule(pipelineData?.id || ''),
          customFields: validateCustomFieldsArray(customFields)?.map(field => ({
            ...field,
            field_options: field.field_options ? [...field.field_options] : undefined
          })) ?? [],
          qualificationMotives: validateSimpleOutcomeReasonArray(qualificationRules) ?? []
        } 
      });

      // ✅ FASE 1 CRÍTICA: Correção da inconsistência de dados
      console.log('🔍 [PIPELINE-MEMBERS-DEBUG] Dados carregados (diagnóstico):', {
        pipelineData_id: pipelineData.id,
        pipelineData_name: pipelineData.name,
        pipelineMembers_raw: pipelineMembers,
        pipelineMembers_count: Array.isArray(pipelineMembers) ? pipelineMembers.length : 0,
        pipelineMembers_type: typeof pipelineMembers,
        pipelineMembers_isArray: Array.isArray(pipelineMembers),
        first_element: Array.isArray(pipelineMembers) ? pipelineMembers[0] : undefined,
        first_element_type: Array.isArray(pipelineMembers) && pipelineMembers.length > 0 ? typeof pipelineMembers[0] : 'N/A'
      });

      // ✅ CORREÇÃO CRÍTICA: loadPipelineMembers retorna string[], não objeto[]
      let memberIds = [];
      if (Array.isArray(pipelineMembers)) {
        // Verificar se é array de strings (format correto) ou array de objetos (format antigo)
        if (pipelineMembers.length > 0 && typeof pipelineMembers[0] === 'string') {
          // ✅ CORRETO: Array de strings (IDs)
          memberIds = pipelineMembers.filter(id => id && typeof id === 'string');
          console.log('✅ [PIPELINE-MEMBERS] Detectado formato correto (string[]):', memberIds);
        } else if (pipelineMembers.length > 0 && typeof pipelineMembers[0] === 'object') {
          // ⚠️ LEGACY: Array de objetos (formato antigo)
          memberIds = pipelineMembers
            .filter(m => 
              m && typeof m === 'object' && 'member_id' in m && typeof (m as any).member_id === 'string'
            )
            .map(m => (m as any).member_id);
          console.warn('⚠️ [PIPELINE-MEMBERS] Detectado formato legado (object[]), convertendo:', memberIds);
        } else {
          // Array vazio ou com elementos inválidos
          memberIds = [];
          console.log('ℹ️ [PIPELINE-MEMBERS] Array vazio ou elementos inválidos');
        }
      } else {
        console.warn('⚠️ [PIPELINE-MEMBERS] pipelineMembers não é array válido:', pipelineMembers);
        memberIds = [];
      }

      // ✅ LOG: Resultado final
      console.log('🔍 [PIPELINE-MEMBERS-DEBUG] Member IDs finais:', {
        memberIds,
        count: memberIds.length
      });

      // ✅ FASE 4: Validação robusta de todos os dados carregados
      loggers.modernPipelineCreator.smartLog('Validação de dados carregados', {
        pipelineData_valid: !!(pipelineData?.id && pipelineData?.name),
        customFields_valid: Array.isArray(customFields),
        customFields_count: validateCustomFieldsArray(customFields)?.length ?? 0,
        distributionRule_valid: distributionRule ? (validateDistributionRule(distributionRule) !== null && (distributionRule as any).mode && typeof (distributionRule as any).is_active === 'boolean') : false,
        memberIds_valid: Array.isArray(memberIds),
        memberIds_count: memberIds.length
      });

      // ✅ FASE 4: Fallback para customFields inválidos usando Zod validation
      const validatedCustomFieldsArray = validateCustomFieldsArray(customFields);
      const validatedCustomFields = validatedCustomFieldsArray 
        ? validatedCustomFieldsArray.filter(field => field && field.field_name && field.field_label)
        : [];
      
      if (validatedCustomFields.length !== (validatedCustomFieldsArray?.length ?? 0)) {
        const invalidFields = validatedCustomFieldsArray?.filter(field => !(field && field.field_name && field.field_label)) ?? [];
        console.warn('⚠️ [VALIDATION] Alguns customFields foram filtrados por serem inválidos:', {
          original: validatedCustomFieldsArray?.length ?? 0,
          validated: validatedCustomFields.length,
          invalidFieldsCount: invalidFields.length,
          invalidFields: invalidFields.map(field => ({
            id: field?.id,
            field_name: field?.field_name,
            field_label: field?.field_label,
            missing_field_name: !field?.field_name,
            missing_field_label: !field?.field_label
          }))
        });
      }

      // ✅ FASE 4: Fallback para distributionRule inválido usando Zod validation
      // ✅ CORREÇÃO CRÍTICA: Garantir que pipeline_id esteja presente antes da validação
      const distributionRuleWithPipelineId = distributionRule ? {
        ...distributionRule,
        pipeline_id: (distributionRule as any).pipeline_id || pipelineData?.id || ''
      } : null;
      
      const validatedDistributionRule = distributionRuleWithPipelineId && 
        validateDistributionRule(distributionRuleWithPipelineId) !== null &&
        (distributionRuleWithPipelineId as any).mode && 
        typeof (distributionRuleWithPipelineId as any).is_active === 'boolean' ? distributionRuleWithPipelineId : null;
      
      if (distributionRule && !validatedDistributionRule) {
        console.warn('⚠️ [VALIDATION] distributionRule inválido, usando fallback null:', {
          original: distributionRule,
          withPipelineId: distributionRuleWithPipelineId,
          pipelineId: pipelineData?.id
        });
      }

      // ✅ FASE 4: Validação dos dados da pipeline
      const validatedPipelineData = {
        id: pipelineData?.id || '',
        name: pipelineData?.name || '',
        description: pipelineData?.description || '',
        stages: Array.isArray(pipelineData?.stages) ? pipelineData.stages : []
      };

      // ✅ FASE 2: Aplicação atômica de TODOS os dados de uma vez só (com dados validados)
      const formDataUpdate: Partial<PipelineFormData> = {
        name: validatedPipelineData.name,
        description: validatedPipelineData.description,
        member_ids: memberIds,
        stages: validatedPipelineData.stages,
        custom_fields: validatedCustomFields,
        cadence_configs: (validateCadenceConfigArray(cadenceConfigs) ?? []) as CadenceConfig[],
        distribution_rule: validatedDistributionRule as LocalDistributionRule,
        temperature_config: temperatureConfig && typeof temperatureConfig === 'object' && 'hot_days' in temperatureConfig ? temperatureConfig : undefined,
        qualification_rules: qualificationRules && typeof qualificationRules === 'object' && 'mql' in qualificationRules ? qualificationRules : undefined,
        outcome_reasons: validateOutcomeReasons(outcomeReasons) as FormOutcomeReasonsData | undefined
      };

      // ✅ DEBUG CRÍTICO: Log antes de aplicar ao estado
      console.log('🔄 [MOTIVOS-APPLY] Aplicando motivos ao estado do formulário:', {
        outcomeReasons_beforeApply: outcomeReasons,
        ...(() => {
          const stats = getOutcomeReasonsStats(outcomeReasons);
          return { ganhoCount: stats.ganhoCount, perdidoCount: stats.perdidoCount };
        })(),
        formDataUpdateStructure: Object.keys(formDataUpdate),
        willApplyToState: true
      });

      // ✅ DEBUG CRÍTICO: Log detalhado do formDataUpdate
      console.log('🔍 [BULK-INITIALIZE-DEBUG] FormDataUpdate construído:', {
        pipelineData_name: pipelineData.name,
        formDataUpdate_name: formDataUpdate.name,
        formDataUpdate_id: (formDataUpdate as any).id,
        has_name: !!formDataUpdate.name,
        name_length: formDataUpdate.name?.length
      });

      // ✅ DEBUG CRÍTICO: Log antes do dispatch BULK_INITIALIZE
      console.log('🚨 [MEMBER-IDS-DEBUG] ANTES DO BULK_INITIALIZE:', {
        memberIds: memberIds,
        memberIds_count: memberIds.length,
        formDataUpdate_member_ids: formDataUpdate.member_ids,
        formDataUpdate_member_ids_count: formDataUpdate.member_ids?.length || 0,
        pipeline_id: pipelineData.id,
        pipeline_name: pipelineData.name
      });

      // ✅ FASE 2: BULK_INITIALIZE - aplicação atômica sem disparar handlers individuais
      dispatch({ 
        type: 'BULK_INITIALIZE', 
        payload: { 
          formData: formDataUpdate,
          distributionRule 
        } 
      });

      // ✅ CORREÇÃO CRÍTICA: Verificar se motivos foram aplicados corretamente após BULK_INITIALIZE
      setTimeout(() => {
        console.log('🔍 [VERIFY-AFTER-BULK] Estado dos motivos após BULK_INITIALIZE:', {
          outcome_reasons: formDataUpdate.outcome_reasons,
          ganho_count: formDataUpdate.outcome_reasons?.ganho_reasons?.length || 0,
          perdido_count: formDataUpdate.outcome_reasons?.perdido_reasons?.length || 0,
          has_outcome_reasons: !!formDataUpdate.outcome_reasons,
          ganho_sample: formDataUpdate.outcome_reasons?.ganho_reasons?.slice(0, 2).map(r => r.reason_text?.substring(0, 30)) || [],
          perdido_sample: formDataUpdate.outcome_reasons?.perdido_reasons?.slice(0, 2).map(r => r.reason_text?.substring(0, 30)) || [],
          timestamp: new Date().toISOString()
        });
      }, 100);

      // ✅ FASE 2: Finalizar inicialização atômica
      dispatch({ type: 'COMPLETE_ATOMIC_INITIALIZATION' });

      console.log('✅ [ATOMIC-INIT] Inicialização atômica concluída para pipeline:', pipelineData.id);

    } catch (error) {
      console.error('❌ [ATOMIC-INIT] Erro na inicialização atômica:', error);
      dispatch({ type: 'ABORT_INITIALIZATION' });
    }
  };

  // ✅ PHASE 2: Inicialização com AbortController e Promise.allSettled
  useEffect(() => {
    if (!pipeline) return;

    const abortController = new AbortController();
    
    const initializePipelineData = async () => {
      try {
        // ✅ CORREÇÃO CRÍTICA: Verificar apenas se é a mesma pipeline E se já foi inicializada
        const isAlreadyInitialized = pipeline.id === lastInitializedPipelineId.current && 
          isInitialized &&
          !hasUnsavedChanges;
        
        // ✅ PATTERN: Estado calculado durante renderização
        const hasDistributionPending = distributionState.hasChanges || distributionState.isInitializing;
          
        if (isAlreadyInitialized) {
          console.log('🚫 [ModernPipelineCreatorRefactored] Pipeline já inicializada, ignorando re-inicialização:', pipeline.id);
          return;
        }
        
        if (hasDistributionPending) {
          smartLogger.logStateChange({
            hasChanges: distributionState.hasChanges,
            isInitializing: distributionState.isInitializing,
            reason: 'avoiding_reload'
          }, 'distribution-changes-pending');
          return;
        }
        
        // ✅ PHASE 2: Verificar se operação foi cancelada
        if (abortController.signal.aborted) return;
        
        // ✅ THROTTLING: Log importante para debug mas com throttling de inicialização
        smartLoggerRef.current.initialization('Inicializando dados da pipeline: ' + pipeline.id);
        lastInitializedPipelineId.current = pipeline.id;

        // ✅ PHASE 4: Carregar dados com AbortController e Promise.allSettled para resilência
        const dataLoadingPromises = [
          loadCustomFields(pipeline.id, abortController.signal),
          loadCadenceConfigs(pipeline.id, abortController.signal),
          loadDistributionRule(pipeline.id, abortController.signal),
          loadTemperatureConfig(pipeline.id, abortController.signal),
          loadQualificationRules(pipeline.id, abortController.signal),
          loadOutcomeReasons(pipeline.id, abortController.signal),
          loadPipelineMembers(pipeline.id, abortController.signal)
        ];

        const results = await Promise.allSettled(dataLoadingPromises);
        
        // ✅ PHASE 2: Verificar se operação foi cancelada após async operations
        if (abortController.signal.aborted) return;

        // ✅ PHASE 2: Extrair resultados com fallbacks para falhas
        const [
          customFieldsResult,
          cadenceConfigsResult,
          distributionRuleResult,
          temperatureConfigResult,
          qualificationRulesResult,
          outcomeReasonsResult,
          pipelineMembersResult
        ] = results;

        const customFields = customFieldsResult.status === 'fulfilled' ? customFieldsResult.value : [] as CustomField[];
        const cadenceConfigs = cadenceConfigsResult.status === 'fulfilled' ? cadenceConfigsResult.value : [] as CadenceConfig[];
        const distributionRule = distributionRuleResult.status === 'fulfilled' ? distributionRuleResult.value : {
          mode: 'manual' as const,
          is_active: true,
          working_hours_only: false,
          skip_inactive_members: true,
          fallback_to_manual: true
        } as LocalDistributionRule;
        const temperatureConfig = temperatureConfigResult.status === 'fulfilled' ? temperatureConfigResult.value : {
          hot_days: 3,
          warm_days: 7,
          cold_days: 14
        } as TemperatureConfig;
        const qualificationRules = qualificationRulesResult.status === 'fulfilled' ? qualificationRulesResult.value : {
          mql: [] as const,
          sql: [] as const
        } as QualificationRules;
        const outcomeReasons = outcomeReasonsResult.status === 'fulfilled' ? outcomeReasonsResult.value : {
          ganho_reasons: [] as const,
          perdido_reasons: [] as const
        } as FormOutcomeReasonsData;
        const pipelineMembers = pipelineMembersResult.status === 'fulfilled' ? pipelineMembersResult.value : [] as string[];

        // ✅ DEBUG CRÍTICO: Verificar resultado do carregamento de motivos (modo edição)
        console.log('🔍 [MOTIVOS-DEBUG-EDIT] Status do carregamento de motivos (modo edição):', {
          outcomeReasonsResult_status: outcomeReasonsResult.status,
          outcomeReasonsResult_error: outcomeReasonsResult.status === 'rejected' ? outcomeReasonsResult.reason : null,
          outcomeReasons_loaded: outcomeReasons,
          ...(() => {
            const stats = getOutcomeReasonsStats(outcomeReasons);
            return { 
              outcomeReasons_ganhoCount: stats.ganhoCount, 
              outcomeReasons_perdidoCount: stats.perdidoCount 
            };
          })(),
          modeEdit: true
        });

        // ✅ PHASE 2: Log de falhas individuais sem parar inicialização
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            // ✅ IMPROVED: Const assertion for operation names array
            const operations = ['customFields', 'cadenceConfigs', 'distributionRule', 'temperatureConfig', 'qualificationRules', 'outcomeReasons', 'pipelineMembers'] as const;
            console.warn(`⚠️ [Initialize] Falha ao carregar ${operations[index]}:`, result.reason);
          }
        });

        // ✅ DEBUG CRÍTICO: Log antes de aplicar ao estado (modo edição)
        console.log('🔄 [MOTIVOS-APPLY-EDIT] Aplicando motivos ao estado do formulário (modo edição):', {
          outcomeReasons_beforeApply: outcomeReasons,
          ...(() => {
            const stats = getOutcomeReasonsStats(outcomeReasons);
            return { ganhoCount: stats.ganhoCount, perdidoCount: stats.perdidoCount };
          })(),
          modeEdit: true
        });

        // ✅ PHASE 1: Usar action INITIALIZE_FORM para inicializar todos os dados de uma só vez
        dispatch({
          type: 'INITIALIZE_FORM',
          payload: {
            name: pipeline.name || '',
            description: pipeline.description || '',
            member_ids: pipelineMembers as string[],
            stages: pipeline.stages || [],
            custom_fields: customFields as CustomField[],
            cadence_configs: cadenceConfigs as CadenceConfig[],
            distribution_rule: distributionRule as LocalDistributionRule,
            temperature_config: temperatureConfig as TemperatureConfig,
            qualification_rules: qualificationRules as QualificationRules,
            outcome_reasons: outcomeReasons as FormOutcomeReasonsData
          }
        });

        // ✅ CORREÇÃO CRÍTICA: Verificar se motivos foram aplicados corretamente após INITIALIZE_FORM (modo edição)
        setTimeout(() => {
          console.log('🔍 [VERIFY-AFTER-INIT-EDIT] Estado dos motivos após INITIALIZE_FORM (edit mode):', {
            outcome_reasons: outcomeReasons,
            ...(() => {
              const stats = getOutcomeReasonsStats(outcomeReasons);
              return {
                ganho_count: stats.ganhoCount,
                perdido_count: stats.perdidoCount,
                has_outcome_reasons: !!outcomeReasons,
                ganho_sample: stats.ganhoSample,
                perdido_sample: stats.perdidoSample
              };
            })(),
            edit_mode: true,
            timestamp: new Date().toISOString()
          });
        }, 100);

        // ✅ INICIALIZAÇÃO CRÍTICA: Definir estado inicial das cadências para comparação
        previousCadenceConfigsRef.current = JSON.parse(JSON.stringify(cadenceConfigs));
        if (import.meta.env.DEV) {
          console.log('🔧 [PipelineCreator] previousCadenceConfigsRef inicializado:', {
            cadenceConfigsLength: (validateCadenceConfigArray(cadenceConfigs) ?? []).length,
            pipelineId: pipeline?.id?.substring(0, 8) || 'new-pipeline'
          });
        }

        // Validar nome inicialmente e sincronizar com hook
        if (pipeline?.name) {
          pipelineNameValidation.updateName(pipeline.name);
        }

        // ✅ CORREÇÃO CRÍTICA: Completar inicialização e limpar flags de mudança
        dispatch({ type: 'COMPLETE_INITIALIZATION' });

        // ✅ THROTTLING: Importante para debug mas com throttling 
        smartLoggerRef.current.initialization('Inicialização completa - pronto para detectar mudanças');

      } catch (error) {
        // ✅ PHASE 2: Ignore AbortError - operação foi cancelada intencionalmente
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('🚫 [Initialize] Operação cancelada:', pipeline.id);
          return;
        }

        console.error('❌ [PipelineCreator] Erro durante inicialização:', error);
        
        // ✅ PHASE 1: FALLBACK - Usar dispatch para dados básicos mesmo com erro
        dispatch({
          type: 'SET_FORM_DATA',
          payload: {
            name: pipeline?.name || '',
            description: pipeline?.description || '',
            stages: pipeline?.stages || []
          }
        });
        
        // Tentar log estruturado, se falhar usar console básico
        try {
          logPipelineError('initialization', error, true);
        } catch (logError) {
          console.error('❌ Erro no sistema de logging:', logError);
        }
        
        // Toast com informação mais específica
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.warn('⚠️ Falha durante inicialização, usando dados básicos:', errorMessage);
        
        // ✅ PHASE 1: Mesmo com erro, marcar como inicializado para evitar loops
        dispatch({ type: 'SET_IS_INITIALIZED', payload: true });
      }
    };

    // ✅ FASE 2: Usar inicialização atômica ao invés da lógica antiga
    const initializeAtomically = async () => {
      try {
        // ✅ FASE 3: Guards inteligentes - verificar estado de inicialização
        const isAlreadyCompleted = state.initializationState.phase === 'completed' && 
          pipeline.id === lastInitializedPipelineId.current;
        
        const hasInitializationInProgress = state.initializationState.phase !== 'idle' && 
          state.initializationState.phase !== 'completed';
        
        const hasDistributionPending = distributionState.hasChanges || distributionState.isInitializing;

        // ✅ FASE 3: Guard adicional - evitar inicializações muito próximas 
        const currentAttemptKey = `${pipeline.id}-${Date.now()}`;
        const timeSinceLastAttempt = Date.now() - parseInt(lastInitializationAttempt.current.split('-')[1] || '0');
        const isDuplicateAttempt = timeSinceLastAttempt < 500; // 500ms de debounce

        if (isAlreadyCompleted) {
          // ✅ FASE 3: Log throttled para reduzir spam
          if (Date.now() % 10 === 0) { // Log apenas 10% das vezes
            console.log('🚫 [ATOMIC-INIT] Pipeline já inicializada atomicamente:', pipeline.id);
          }
          return;
        }

        if (hasInitializationInProgress) {
          console.log('⏸️ [ATOMIC-INIT] Inicialização já em andamento, aguardando conclusão');
          return;
        }
        
        if (hasDistributionPending) {
          console.log('⏸️ [ATOMIC-INIT] Mudanças de distribuição pendentes, evitando reload');
          return;
        }

        if (isDuplicateAttempt) {
          console.log('🔄 [ATOMIC-INIT] Inicialização duplicada detectada, ignorando (debounce)');
          return;
        }

        // ✅ FASE 3: Clear debounce timer anterior se existir
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }

        // ✅ FASE 3: Debounce de 300ms para evitar múltiplas chamadas
        debounceTimer.current = setTimeout(async () => {
          try {
            // ✅ FASE 2: Executar inicialização atômica
            smartLoggerRef.current.initialization('Iniciando inicialização atômica para pipeline: ' + pipeline.id);
            lastInitializedPipelineId.current = pipeline.id;
            lastInitializationAttempt.current = currentAttemptKey;
            
            await performAtomicInitialization(pipeline);
          } catch (debounceError) {
            console.error('❌ [ATOMIC-INIT] Erro na inicialização com debounce:', debounceError);
            dispatch({ type: 'ABORT_INITIALIZATION' });
          }
        }, 300);

      } catch (error) {
        console.error('❌ [ATOMIC-INIT] Erro na inicialização atômica:', error);
        dispatch({ type: 'ABORT_INITIALIZATION' });
      }
    };

    initializeAtomically();

    // ✅ FASE 2: Cleanup - cancelar inicialização se componente desmontado
    return () => {
      if (state.initializationState.abortController && !state.initializationState.abortController.signal.aborted) {
        state.initializationState.abortController.abort();
      }
      
      // ✅ FASE 3: Cleanup do debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [pipeline?.id, state.initializationState.phase, distributionState.hasChanges, distributionState.isInitializing]); // ✅ FASE 2: Dependências otimizadas

  // ✅ PHASE 4: Funções de carregamento com AbortController para prevenção de race conditions
  const loadCustomFields = useCallback(async (pipelineId: string, abortSignal?: AbortSignal): Promise<CustomField[]> => {
    try {
      // ✅ PHASE 4: Verificar se operação foi cancelada antes de continuar
      if (abortSignal?.aborted) {
        throw new Error('AbortError');
      }

      // ✅ CORREÇÃO CRÍTICA: Usar API REST em vez de consulta direta ao Supabase
      const response = await api.get(`/pipelines/${pipelineId}/custom-fields`);

      // ✅ PHASE 4: Verificar se operação foi cancelada após requisição
      if (abortSignal?.aborted) {
        throw new Error('AbortError');
      }

      // ✅ Extrair campos da resposta da API
      const fields = response.data?.fields || [];
      
      console.log('✅ [loadCustomFields] Campos carregados via API REST:', {
        pipelineId,
        fieldsCount: fields.length,
        fields: fields.slice(0, 3).map((f: any) => ({ id: f.id, name: f.field_name, label: f.field_label }))
      });

      return fields;
    } catch (error) {
      // ✅ PHASE 4: Não logar erro se foi cancelamento intencional
      if (error instanceof Error && error.message === 'AbortError') {
        throw error; // Re-throw para tratamento upstream
      }
      console.warn('⚠️ [loadCustomFields] Erro ao carregar campos via API:', error);
      return [];
    }
  }, []);

  const loadCadenceConfigs = useCallback(async (pipelineId: string, abortSignal?: AbortSignal): Promise<CadenceConfig[]> => {
    try {
      // ✅ PHASE 4: Verificar cancelamento antes de continuar
      if (abortSignal?.aborted) {
        throw new Error('AbortError');
      }

      // ✅ CORREÇÃO: Usar CadenceApiService para consistência com API backend
      console.log('🔄 [loadCadenceConfigs] Carregando via CadenceApiService:', { pipelineId: pipelineId.substring(0, 8) });
      
      // ✅ PHASE 4: CadenceApiService deve suportar AbortController futuramente
      const configs = await CadenceApiService.loadCadenceForPipeline(pipelineId);
      
      // ✅ PHASE 4: Verificar cancelamento após operação
      if (abortSignal?.aborted) {
        throw new Error('AbortError');
      }

      console.log('✅ [loadCadenceConfigs] Configurações carregadas:', { count: configs.length });
      return configs;
    } catch (error) {
      // ✅ PHASE 4: Não logar erro se foi cancelamento intencional
      if (error instanceof Error && error.message === 'AbortError') {
        throw error; // Re-throw para tratamento upstream
      }
      console.warn('⚠️ [loadCadenceConfigs] Erro ao carregar cadências:', error);
      return [];
    }
  }, []);


  const loadDistributionRule = async (pipelineId: string, abortSignal?: AbortSignal): Promise<LocalDistributionRule> => {
    try {
      // ✅ PHASE 4: Verificar abort antes da operação
      if (abortSignal?.aborted) {
        throw new Error('AbortError');
      }

      // 🔐 CORREÇÃO CRÍTICA: Verificar autenticação antes da query RLS
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.warn('❌ [loadDistributionRule] Usuário não autenticado para RLS:', authError?.message);
        return {
          mode: 'manual',
          is_active: true,
          working_hours_only: false,
          skip_inactive_members: true,
          fallback_to_manual: true
        };
      }

      // ✅ PADRÃO BÁSICO SUPABASE: Obter tenant_id via user_metadata (Basic Supabase Authentication)
      const tenantId = authUser.user_metadata?.tenant_id;
      
      if (!tenantId) {
        console.warn('❌ [loadDistributionRule] tenant_id não encontrado - usando configuração padrão');
        return {
          mode: 'manual',
          is_active: true,
          working_hours_only: false,
          skip_inactive_members: true,
          fallback_to_manual: true
        };
      }

      console.log('🔐 [loadDistributionRule] Autenticação validada:', {
        userId: authUser.id.substring(0, 8) + '...',
        tenantId: tenantId.substring(0, 8) + '...',
        pipelineId: pipelineId
      });

      // ✅ FASE 5: Query robusta - usar maybeSingle() ao invés de single() para lidar com casos sem rule
      const { data: rule, error } = await supabase
        .from('pipeline_distribution_rules')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId)  
        .maybeSingle()  // ✅ CORREÇÃO: maybeSingle() não falha se não encontrar registro
        .abortSignal(abortSignal);

      // 🔍 LOG AMPLIADO: Incluir informações de autenticação para debug
      console.log('🔍 [loadDistributionRule] Query Supabase executada:', {
        pipelineId,
        tenantId: tenantId.substring(0, 8) + '...',
        authUserId: authUser.id.substring(0, 8) + '...',
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: error?.code,
        hasRule: !!rule,
        ruleMode: rule?.mode
      });

      // ✅ FASE 5: Tratar erro de query de forma robusta
      if (error) {
        console.warn('❌ [loadDistributionRule] Erro na query Supabase:', error);
        // Não fazer throw, usar fallback manual
      }
      
      // 🔍 DEBUG CRÍTICO: Log detalhado da resposta para diagnosticar o problema
      console.log('🔍 [loadDistributionRule] Resposta completa da query:', {
        rule: rule,
        ruleType: typeof rule,
        hasRule: !!rule,
        ruleMode: rule?.mode,
        ruleModeType: typeof rule?.mode,
        hasMode: !!rule?.mode,
        pipelineId: pipelineId
      });
      
      // ✅ FASE 5: Fallback robusto baseado na análise do banco de dados
      const fallbackRule = {
        mode: 'manual' as const,
        is_active: true,
        working_hours_only: false,
        skip_inactive_members: true,
        fallback_to_manual: true
      };

      // ✅ FASE 5: Caso 1 - Nenhuma rule encontrada (pipeline sem distribution rule)
      if (!rule) {
        console.log('📝 [loadDistributionRule] Pipeline sem distribution rule, criando fallback manual:', {
          pipelineId,
          reason: 'no_rule_found',
          fallbackMode: 'manual'
        });
        return fallbackRule;
      }
      
      // ✅ FASE 5: Caso 2 - Rule existe mas mode está vazio/inválido
      if (!rule.mode || typeof rule.mode !== 'string') {
        console.log('📝 [loadDistributionRule] Rule existe mas mode inválido, usando fallback:', {
          ruleId: rule.id,
          currentMode: rule.mode,
          modeType: typeof rule.mode,
          reason: 'invalid_mode',
          fallbackMode: 'manual'
        });
        return fallbackRule;
      }
      
      console.log('✅ [loadDistributionRule] Rule carregada do banco:', {
        mode: rule.mode,
        pipeline_id: pipelineId
      });
      
      // ✅ PRESERVAR: Mode exato do banco de dados
      return {
        mode: rule.mode, // ✅ PRESERVAR mode original do banco
        is_active: rule.is_active ?? true,
        working_hours_only: rule.working_hours_only ?? false,
        skip_inactive_members: rule.skip_inactive_members ?? true,
        fallback_to_manual: rule.fallback_to_manual ?? true
      };
    } catch (error) {
      // ✅ PHASE 4: Re-throw AbortError para preservar o cancelamento
      if (error instanceof Error && error.message === 'AbortError') {
        throw error;
      }
      console.warn('⚠️ [loadDistributionRule] Erro ao carregar regra:', error);
      return {
        mode: 'manual',
        is_active: true,
        working_hours_only: false,
        skip_inactive_members: true,
        fallback_to_manual: true
      };
    }
  };

  const loadTemperatureConfig = async (pipelineId: string, abortSignal?: AbortSignal): Promise<TemperatureConfig> => {
    try {
      // ✅ PHASE 4: Verificar abort antes da operação
      if (abortSignal?.aborted) {
        throw new Error('AbortError');
      }

      const { data: config, error } = await supabase
        .from('temperature_config')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .single()
        .abortSignal(abortSignal);

      if (error) throw error;
      
      // ✅ Mapear campos corretos da tabela temperature_config
      return config ? {
        hot_days: config.hot_threshold || 3,
        warm_days: config.warm_threshold || 7,
        cold_days: config.cold_threshold || 14
      } : {
        hot_days: 3,
        warm_days: 7,
        cold_days: 14
      };
    } catch (error) {
      // ✅ PHASE 4: Re-throw AbortError para preservar o cancelamento
      if (error instanceof Error && error.message === 'AbortError') {
        throw error;
      }
      if (error.code === '42P01') {
        console.warn('⚠️ [loadTemperatureConfig] Tabela temperature_config não existe, usando padrão');
      } else {
        console.warn('⚠️ [loadTemperatureConfig] Erro ao carregar configuração:', error);
      }
      return {
        hot_days: 3,
        warm_days: 7,
        cold_days: 14
      };
    }
  };

  const loadQualificationRules = async (pipelineId: string, abortSignal?: AbortSignal): Promise<QualificationRules> => {
    try {
      // ✅ PHASE 4: Verificar abort antes da operação
      if (abortSignal?.aborted) {
        throw new Error('AbortError');
      }

      // ✅ MIGRADO: Usar Backend API como outras abas (Distribuição, Cadência, etc.)
      const { QualificationApiService } = await import('../../services/qualificationApi');
      const qualificationRules = await QualificationApiService.loadQualificationRules(pipelineId);
      
      console.log('✅ [loadQualificationRules] Regras carregadas via Backend API:', {
        mqlCount: qualificationRules.mql.length,
        sqlCount: qualificationRules.sql.length
      });
      
      return qualificationRules;
    } catch (error: any) {
      // ✅ PHASE 4: Re-throw AbortError para preservar o cancelamento
      if (error instanceof Error && error.message === 'AbortError') {
        throw error;
      }
      console.warn('⚠️ [loadQualificationRules] Erro ao carregar regras:', error.message);
      return { mql: [] as const, sql: [] as const };
    }
  };

  // ✅ MIGRADO: Função para salvar regras de qualificação via Backend API (como outras abas)
  const saveQualificationRules = async (pipelineId: string, qualificationRules: QualificationRules) => {
    try {
      console.log('🔄 [saveQualificationRules] Salvando via Backend API:', {
        pipelineId,
        mqlCount: qualificationRules.mql.length,
        sqlCount: qualificationRules.sql.length
      });

      // ✅ MIGRADO: Usar Backend API como outras abas (Distribuição, Cadência, etc.)
      const { QualificationApiService } = await import('../../services/qualificationApi');
      await QualificationApiService.saveQualificationRules(pipelineId, qualificationRules);
      
      console.log('✅ [saveQualificationRules] Regras salvas com sucesso via Backend API:', {
        mqlCount: qualificationRules.mql.length,
        sqlCount: qualificationRules.sql.length
      });

      // ✅ SIMPLIFICADO: Invalidate queries diretamente usando TanStack Query padrão
      await queryClient.invalidateQueries({ 
        queryKey: ['qualification-rules', pipelineId], 
        exact: true 
      });

    } catch (error: any) {
      console.error('❌ [saveQualificationRules] Erro ao salvar regras via Backend API:', error.message);
      throw error;
    }
  };

  // ✅ FUNÇÃO HELPER: Wrapper para operações Supabase com timeout adequado para pipeline
  const supabaseWithTimeout = async <T,>(operation: () => Promise<T>, timeoutMs: number = API.TIMEOUT_PIPELINE): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`⏰ [supabaseWithTimeout] Timeout de ${timeoutMs}ms atingido - abortando operação de pipeline`);
      controller.abort();
    }, timeoutMs);

    try {
      const result = await operation();
      clearTimeout(timeoutId);
      
      // 🔍 DEBUG: Log detalhado da resposta do Supabase para diagnóstico
      console.log('🔍 [supabaseWithTimeout] Resposta do Supabase:', {
        result_type: typeof result,
        result_structure: result,
        has_data: !!(result as any)?.data,
        has_error: !!(result as any)?.error,
        data_length: Array.isArray((result as any)?.data) ? (result as any).data.length : 'not_array'
      });
      
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError' || controller.signal.aborted) {
        console.error(`❌ [supabaseWithTimeout] Timeout de ${timeoutMs}ms excedido para operação de pipeline`);
        throw new Error(`Tempo limite de ${timeoutMs/1000}s excedido para operação de pipeline. Tente novamente.`);
      }
      throw error;
    }
  };

  // ✅ ETAPA 1: Função para salvar motivos de ganho/perdido - SIMPLIFICADA (era ~850 linhas de debug)
  const saveOutcomeReasons = async (pipelineId: string, outcomeReasons: FormOutcomeReasonsData) => {
    let tenantId: string;
    let authUser: any;

    try {
      // ✅ Validar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      authUser = user;
      tenantId = authUser.user_metadata?.tenant_id;
      if (!tenantId) {
        throw new Error('Dados de tenant não encontrados. Faça login novamente.');
      }

      // ✅ Padronizar estrutura de dados
      const normalizedGanhoReasons = (outcomeReasons.ganho_reasons || []).map((reason, index) => ({
        reason_text: typeof reason.reason_text === 'string' ? reason.reason_text : '',
        reason_type: 'ganho' as const,
        display_order: reason.display_order !== undefined ? reason.display_order : index,
        is_active: reason.is_active !== undefined ? reason.is_active : true,
        tenant_id: tenantId,
        pipeline_id: pipelineId,
        created_by: authUser.id
      }));

      const normalizedPerdidoReasons = (outcomeReasons.perdido_reasons || []).map((reason, index) => ({
        reason_text: typeof reason.reason_text === 'string' ? reason.reason_text : '',
        reason_type: 'perdido' as const,
        display_order: reason.display_order !== undefined ? reason.display_order : index,
        is_active: reason.is_active !== undefined ? reason.is_active : true,
        tenant_id: tenantId,
        pipeline_id: pipelineId,
        created_by: authUser.id
      }));

      // ✅ Criar estrutura JSON para salvar
      const outcomeReasonsJSON = {
        ganho_reasons: normalizedGanhoReasons,
        perdido_reasons: normalizedPerdidoReasons,
        last_updated: new Date().toISOString(),
        updated_by: authUser.id
      };


      // ✅ Salvar motivos no banco de dados
      const { data: updateResult, error: updateError } = await supabase
        .from('pipelines')
        .update({ outcome_reasons: outcomeReasonsJSON })
        .eq('id', pipelineId)
        .eq('tenant_id', tenantId);
      if (updateError) {
        console.error('❌ [saveOutcomeReasons] Erro ao salvar motivos:', updateError);
        return {
          success: false,
          error: 'Erro ao salvar motivos no banco de dados',
          details: updateError
        };
      }

      console.log('✅ [saveOutcomeReasons] Motivos salvos com sucesso:', {
        pipelineId: pipelineId.substring(0, 8),
        ganhoCount: normalizedGanhoReasons.length,
        perdidoCount: normalizedPerdidoReasons.length
      });

      return {
        success: true,
        message: 'Motivos salvos com sucesso',
        data: updateResult
      }

    } catch (error) {
      console.error('❌ [saveOutcomeReasons] Erro inesperado:', error);
      return {
        success: false,
        error: 'Erro inesperado ao salvar motivos',
        details: error
      };
    }
  };

  // ✅ ETAPA 1: Função para carregar motivos - SIMPLIFICADA (era ~500 linhas de debug)
  const loadOutcomeReasons = async (pipelineId: string, abortSignal?: AbortSignal): Promise<FormOutcomeReasonsData> => {
    try {
      if (abortSignal?.aborted) {
        throw new Error('AbortError');
      }

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const tenantId = authUser.user_metadata?.tenant_id;
      if (!tenantId) {
        throw new Error('Dados de tenant não encontrados. Faça login novamente.');
      }

      const { data: pipeline, error } = await supabaseWithTimeout(async () => {
        return await supabase
          .from('pipelines')
          .select('outcome_reasons')
          .eq('id', pipelineId)
          .eq('tenant_id', tenantId)
          .single();
      });

      if (error) {
        console.error('❌ [loadOutcomeReasons] Erro ao carregar motivos:', error.message);
        throw new Error(`Falha ao carregar motivos: ${error.message}`);
      }

      const pipelineObj = Array.isArray(pipeline) ? pipeline[0] : pipeline;
      const outcomeReasonsData = pipelineObj?.outcome_reasons;
      
      let normalizedData: FormOutcomeReasonsData;
      
      if (!outcomeReasonsData || typeof outcomeReasonsData !== 'object') {
        normalizedData = {
          ganho_reasons: [],
          perdido_reasons: []
        };
      } else {
        const validationResult = OutcomeReasonsCollectionSchema.safeParse(outcomeReasonsData);
        
        if (validationResult.success) {
          normalizedData = validationResult.data;
        } else {
          normalizedData = {
            ganho_reasons: Array.isArray(outcomeReasonsData.ganho_reasons) ? outcomeReasonsData.ganho_reasons : [],
            perdido_reasons: Array.isArray(outcomeReasonsData.perdido_reasons) ? outcomeReasonsData.perdido_reasons : []
          };
        }
      }
      
      return normalizedData;
    } catch (error: any) {
      if (error instanceof Error && error.message === 'AbortError') {
        throw error;
      }
      console.error('❌ [loadOutcomeReasons] Erro ao carregar motivos:', error.message);
      return { ganho_reasons: [], perdido_reasons: [] };
    }
  };

  // ✅ CORREÇÃO: Carregar member_ids da tabela pipeline_members
  const loadPipelineMembers = async (pipelineId: string, abortSignal?: AbortSignal): Promise<string[]> => {
    try {
      // ✅ PHASE 4: Verificar abort antes da operação
      if (abortSignal?.aborted) {
        throw new Error('AbortError');
      }

      console.log('🔄 [loadPipelineMembers] Carregando membros da pipeline:', pipelineId);
      
      const { data: pipelineMembers, error } = await supabase
        .from('pipeline_members')
        .select('member_id')
        .eq('pipeline_id', pipelineId)
        .abortSignal(abortSignal);

      if (error) {
        console.warn('⚠️ [loadPipelineMembers] Erro ao carregar membros:', error);
        return [];
      }
      
      const member_ids = (pipelineMembers || []).map(pm => pm.member_id);
      console.log('✅ [loadPipelineMembers] Membros carregados:', {
        pipeline_id: pipelineId,
        member_ids,
        count: member_ids.length
      });
      
      return member_ids;
    } catch (error) {
      // ✅ PHASE 4: Re-throw AbortError para preservar o cancelamento
      if (error instanceof Error && error.message === 'AbortError') {
        throw error;
      }
      console.warn('⚠️ [loadPipelineMembers] Erro ao carregar membros da pipeline:', error);
      return [];
    }
  };

  // ✅ CORREÇÃO EXHAUSTIVE-DEPS: Handler do submit memoizado com useCallback
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ GUARD: Detectar origem do submit e bloquear submits automáticos indesejados
    const eventTarget = e.target as HTMLElement;
    const eventType = e.type;
    const activeElement = document.activeElement as HTMLElement;
    
    smartLogger.logStateChange({
      eventType,
      eventTarget: eventTarget?.tagName || 'unknown',
      activeElement: activeElement?.tagName || 'unknown',
      hasUnsavedChanges,
      isDistributionInitializing: distributionState.isInitializing,
      formDataKeys: Object.keys(formData),
      pipelineId: pipeline?.id
    }, 'submit-detected');
    
    // ✅ GUARD: Bloquear submit se for durante inicialização de distribuição
    if (distributionState.isInitializing) {
      console.log('❌ [SUBMIT BLOCKED] Distribuição está inicializando');
      smartLogger.logStateChange({
        pipelineId: pipeline?.id,
        isInitializing: distributionState.isInitializing,
        reason: 'blocked_during_initialization'
      }, 'submit-blocked');
      return;
    }
    
    // ✅ GUARD: Bloquear submit se for mudança de navegação
    if (isNavigationChange) {
      console.log('❌ [SUBMIT BLOCKED] Mudança de navegação detectada');
      smartLogger.logStateChange({
        pipelineId: pipeline?.id,
        isNavigationChange,
        reason: 'blocked_navigation_change'
      }, 'submit-blocked');
      return;
    }
    
    // ✅ ETAPA 2: Forçar flush de todos os campos pendentes antes da normalização
    console.log('🧹 [handleSubmit] Forçando flush de todos os campos antes da normalização de dados');
    try {
      if (simpleMotivesManagerRef.current) {
        simpleMotivesManagerRef.current.forceFlushAllFields();
        console.log('✅ [handleSubmit] Flush dos motivos concluído com sucesso');
      } else {
        console.warn('⚠️ [handleSubmit] simpleMotivesManagerRef.current é null - não foi possível fazer flush');
      }
    } catch (error) {
      console.error('❌ [handleSubmit] Erro ao forçar flush dos campos:', error);
      // Não bloquear o save por erro de flush - apenas logar
    }
    
    // ✅ GUARD: Verificar se realmente há mudanças válidas para submeter
    const hasAnyChanges = hasUnsavedChanges || distributionState.hasChanges || hasQualificationChanges || hasMotivesChanges;
    const isNewPipeline = !pipeline?.id;
    
    loggers.modernPipelineCreator.smartLog('Verificação de mudanças antes do save', {
      hasUnsavedChanges,
      distributionChanges: distributionState.hasChanges,
      hasQualificationChanges,
      hasMotivesChanges,
      hasAnyChanges,
      isNewPipeline,
      pipelineName: formData.name,
      shouldProceed: isNewPipeline || hasAnyChanges
    });
    
    if (!hasAnyChanges && pipeline?.id) {
      smartLogger.logStateChange({
        hasUnsavedChanges,
        distributionChanges: distributionState.hasChanges,
        hasQualificationChanges,
        hasMotivesChanges,
        pipelineId: pipeline?.id,
        reason: 'no_changes_to_save'
      }, 'submit-blocked');
      console.log('❌ [SUBMIT BLOCKED] Nenhuma mudança detectada para pipeline existente');
      return;
    }
    
    console.log('🔍 [DEBUG] Validação do nome:', {
      canSubmit: pipelineNameValidation.canSubmit,
      isValid: pipelineNameValidation.isValid,
      hasError: pipelineNameValidation.hasError,
      error: pipelineNameValidation.error,
      name: pipelineNameValidation.name
    });
    
    if (!pipelineNameValidation.canSubmit) {
      console.log('❌ [SUBMIT BLOCKED] Validação do nome falhou');
      showWarningToast('Validação', 'Verifique se o nome da pipeline é válido e único');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // ✅ TRACKING: Log crítico antes do envio para backend (apenas em desenvolvimento)
      if (COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.enabled) {
        console.log('📤 [SUBMIT-TRACKING] Enviando dados para backend:', {
          pipeline_id: pipeline?.id?.substring(0, 8) || 'N/A',
          formData_member_ids: formData.member_ids,
          member_ids_count: formData.member_ids?.length || 0,
          member_ids_sample: formData.member_ids?.slice(0, 3).map(id => id.substring(0, 8)) || [],
          formData_name: formData.name,
          timestamp: new Date().toISOString(),
          source: 'handleSubmit'
        });
      }
      
      console.log('📤 [ModernPipelineCreatorRefactored] Enviando dados do formulário - SUBMIT AUTORIZADO');
      console.log('🔍 [DEBUG] FormData completo:', {
        name: formData.name,
        description: formData.description,
        stages: formData.stages?.length,
        customFields: formData.custom_fields?.length,
        qualification_rules: formData.qualification_rules, // ✅ CORREÇÃO: Nome correto da propriedade
        outcome_reasons: formData.outcome_reasons, // ✅ CORREÇÃO: Nome correto da propriedade
        memberIds: formData.member_ids?.length,
        cadence_configs: formData.cadence_configs?.length,
        distribution_rule: formData.distribution_rule
      });
      
      await onSubmit(formData, true);
      console.log('✅ [PIPELINE CREATED] Pipeline criada com sucesso!');
      markFormClean();
      
    } catch (error) {
      logPipelineError('submit', error, true);
      showErrorToast('Erro no envio', 'Falha ao salvar pipeline');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [
    distributionState.isInitializing,
    distributionState.hasChanges,
    isNavigationChange,
    hasUnsavedChanges,
    hasQualificationChanges,
    hasMotivesChanges,
    pipeline?.id,
    pipelineNameValidation,
    formData,
    onSubmit,
    markFormClean,
    smartLogger,
    logPipelineError,
    dispatch,
    showWarningToast,
    showErrorToast
  ]);

  // Render da aba básico
  const renderBasicTab = () => (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-slate-50 to-white border-slate-200/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Configurações Básicas</h3>
              <p className="text-sm text-slate-500">Defina as informações fundamentais da pipeline</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campo Nome da Pipeline */}
          <BlurFade delay={0.05} direction="up" blur="2px" className="space-y-2">
            <Label htmlFor="pipeline-name" className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              Nome da Pipeline *
            </Label>
{/* ✅ FASE 3C: Renderização condicional com guard de dados válidos */}
            {state.initializationState.phase === 'completed' || state.initializationState.phase === 'idle' ? (
              <Input
                id="pipeline-name"
                value={pipelineNameValidation.name || formData.name || ''}
                onChange={(e) => {
                  pipelineNameValidation.updateName(e.target.value);
                  handleNameChange(e.target.value);
                }}
                onBlur={pipelineNameValidation.validateImmediately}
                placeholder="Ex: Vendas B2B, Leads Qualificados..."
                className={`transition-all duration-300 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                  pipelineNameValidation.hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30' : 
                  pipelineNameValidation.isValid ? 'border-green-400 focus:border-green-500 focus:ring-green-100 bg-green-50/30' : ''
                }`}
              />
            ) : (
              <div className="h-10 bg-slate-100 border border-slate-200 rounded-md animate-pulse flex items-center px-3">
                <div className="h-4 bg-slate-300 rounded w-48 animate-pulse"></div>
              </div>
            )}
            {pipelineNameValidation.showValidation && pipelineNameValidation.hasError && (
              <MotionWrapper variant="slideDown" duration={0.2}>
                <div className="text-sm text-red-600 flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                  {pipelineNameValidation.error}
                </div>
              </MotionWrapper>
            )}
            {pipelineNameValidation.showValidation && pipelineNameValidation.isValid && !pipelineNameValidation.isEditMode && (
              <MotionWrapper variant="slideDown" duration={0.2}>
                <div className="text-sm text-green-600 flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                  Nome disponível
                </div>
              </MotionWrapper>
            )}
          </BlurFade>

          {/* Separador visual sutil */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

          {/* Campo Descrição */}
          <BlurFade delay={0.1} direction="up" blur="2px" className="space-y-2">
            <Label htmlFor="pipeline-description" className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
              Descrição
            </Label>
{/* ✅ FASE 3C: Renderização condicional com guard de dados válidos */}
            {state.initializationState.phase === 'completed' || state.initializationState.phase === 'idle' ? (
              <Textarea
                id="pipeline-description"
                value={formData.description || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Descreva o propósito e funcionamento do pipeline..."
                rows={3}
                className="transition-all duration-300 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            ) : (
              <div className="h-[76px] bg-slate-100 border border-slate-200 rounded-md animate-pulse flex items-center px-3">
                <div className="space-y-2 w-full">
                  <div className="h-4 bg-slate-300 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-slate-300 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            )}
          </BlurFade>

          {/* Separador visual sutil */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

          {/* Campo Vendedores */}
          <BlurFade delay={0.15} direction="up" blur="2px" className="space-y-3">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              Vendedores Vinculados *
            </Label>
            {membersLoading ? (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl">
                <div className="flex items-center gap-3 text-blue-800">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Carregando vendedores...</span>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Aguarde enquanto carregamos os vendedores disponíveis.
                    </p>
                  </div>
                </div>
              </div>
            ) : salesMembers.length === 0 ? (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 rounded-xl">
                <div className="flex items-center gap-3 text-amber-800">
                  <div className="p-1.5 bg-amber-100 rounded-lg">
                    <Settings className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">Nenhum vendedor encontrado</span>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Cadastre vendedores no módulo "Vendedores" para vinculá-los às pipelines.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>{formData.member_ids.length} de {salesMembers.length} selecionados</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'SET_FORM_DATA', payload: { member_ids: salesMembers.map(m => m.id).filter(Boolean) as readonly string[] } })}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Selecionar todos
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'SET_FORM_DATA', payload: { member_ids: [] } })}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50/30">
                  <div className="p-2 space-y-1">
                    {salesMembers.map((member, index) => {
                      const isChecked = formData.member_ids.includes(member.id);
                      
                      return (
                        <BlurFade key={member.id} delay={0.2 + (index * 0.02)} direction="up" blur="1px">
                          <div className="flex items-center p-2 rounded hover:bg-white/80 transition-colors cursor-pointer">
                            <Checkbox
                              id={`member-${member.id}`}
                              checked={isChecked}
                              onCheckedChange={() => handleMemberToggle(member.id)}
                              className="mr-3"
                            />
                            <Label 
                              htmlFor={`member-${member.id}`} 
                              className="text-sm text-slate-700 cursor-pointer flex-1"
                            >
                              {member.first_name} {member.last_name}
                            </Label>
                          </div>
                        </BlurFade>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </BlurFade>
        </CardContent>
      </Card>
    </div>
  );

  // ✅ CORREÇÃO CRÍTICA: Mover useMemo para o nível do componente (não dentro de função)
  const totalChanges = React.useMemo(() => {
    const changes = new Set<string>();
    
    // Contar mudanças específicas primeiro
    if (distributionState.hasChanges) changes.add('distribution');
    if (hasQualificationChanges) changes.add('qualification');  
    if (hasMotivesChanges) changes.add('motives');
    
    // ✅ INTELIGENTE: Só contar hasUnsavedChanges se não há mudanças específicas
    // Isso evita contagem dupla quando distributionState.hasChanges já está ativo
    if (hasUnsavedChanges && changes.size === 0) {
      changes.add('general');
    }
    
    return changes.size;
  }, [hasUnsavedChanges, distributionState.hasChanges, hasQualificationChanges, hasMotivesChanges]);

  // ✅ OTIMIZAÇÃO: Estado para tempo desde último salvamento com atualizações periódicas
  const [timeSinceLastSave, setTimeSinceLastSave] = useState<number | null>(null);

  // ✅ OTIMIZAÇÃO: Atualizar tempo desde último salvamento a cada 5 segundos (evitar re-renders constantes)
  useEffect(() => {
    const updateTimeSinceLastSave = () => {
      if (lastSavedAt) {
        const seconds = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
        setTimeSinceLastSave(seconds);
      } else {
        setTimeSinceLastSave(null);
      }
    };

    // Atualizar imediatamente
    updateTimeSinceLastSave();

    // Configurar intervalo para atualizar a cada 5 segundos
    const interval = setInterval(updateTimeSinceLastSave, 5000);

    return () => clearInterval(interval);
  }, [lastSavedAt]);

  // ✅ CORREÇÃO LOOP INFINITO: Footer memoizado sem recriação constante
  const renderFooter = useCallback(() => {
    // ✅ DETERMINAR ESTADO E VISÃO GERAL MELHORADA
    const shouldShowButton = !pipeline || (pipeline && (hasUnsavedChanges || distributionState.hasChanges || hasQualificationChanges || hasMotivesChanges));
    
    return (
      <div className="p-6 bg-gradient-to-r from-gray-50/80 to-slate-50/80 border-t border-gray-200/60 rounded-b-lg backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {/* LADO ESQUERDO: Status Melhorado com Animações */}
          <div className="flex items-center gap-3 text-sm">
            {isSaving ? (
              <div className="text-blue-600 dark:text-blue-400 flex items-center gap-3 animate-pulse">
                <div className="relative">
                  <div className="w-5 h-5 border-2 border-blue-200 rounded-full" />
                  <div className="absolute top-0 left-0 w-5 h-5 border-2 border-transparent border-t-blue-600 rounded-full animate-spin" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Salvando alterações...</span>
                  <span className="text-xs text-blue-500/70">Processando dados da pipeline</span>
                </div>
              </div>
            ) : (hasUnsavedChanges || distributionState.hasChanges || hasQualificationChanges || hasMotivesChanges) ? (
              <div className="text-amber-600 dark:text-amber-400 flex items-center gap-3">
                <div className="relative">
                  <AlertCircle className="h-5 w-5 animate-pulse" />
                  {totalChanges > 1 && (
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {totalChanges}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Alterações pendentes</span>
                  <span className="text-xs text-amber-500/70">
                    {totalChanges === 1 ? '1 seção modificada' : `${totalChanges} seções modificadas`}
                  </span>
                </div>
              </div>
            ) : pipeline ? (
              <div className="text-green-600 dark:text-green-400 flex items-center gap-3">
                <div className="relative">
                  <CheckCircle className="h-5 w-5" />
                  <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Tudo salvo</span>
                  <span className="text-xs text-green-500/70">
                    {timeSinceLastSave !== null && (
                      timeSinceLastSave < 60 
                        ? `Salvo há ${timeSinceLastSave}s`
                        : `Salvo há ${Math.floor(timeSinceLastSave / 60)}min`
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-600">Pronto para criar</span>
                  <span className="text-xs text-gray-400">Preencha os campos obrigatórios</span>
                </div>
              </div>
            )}
          </div>
          
          {/* LADO DIREITO: Botão Aprimorado com Estados Visuais */}
          {shouldShowButton && (
            <div className="flex items-center gap-3">
              {/* ✅ CONTADOR DE MUDANÇAS (quando há múltiplas alterações) */}
              {pipeline && totalChanges > 1 && (
                <div className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {totalChanges} pendentes
                </div>
              )}
              
              {/* ✅ BOTÃO PRINCIPAL MELHORADO */}
              <Button
                type="button"
                disabled={loading || isSaving || (!pipeline && !pipelineNameValidation.canSubmit)}
                className={`min-w-[140px] transition-all duration-200 ${
                  isSaving 
                    ? 'bg-blue-500 hover:bg-blue-600 scale-105' 
                    : (totalChanges > 0) 
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-lg' 
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={pipeline ? handleSaveChanges : async (e) => {
                  e.preventDefault();
                  console.log('🖱️ [Button] Clique explícito no botão Criar Pipeline');
                  dispatch({ type: 'SET_IS_INTENTIONAL_SUBMIT', payload: true });
                  dispatch({ type: 'SET_IS_EXPLICIT_BUTTON_CLICK', payload: true });
                  
                  // ✅ CORREÇÃO: Como botão está fora do form, chamar handleSubmit diretamente
                  console.log('📋 [Pipeline Creator] Disparando handleSubmit diretamente (botão fora do form)');
                  
                  // Criar evento sintético para handleSubmit
                  const syntheticEvent = {
                    preventDefault: () => {},
                    target: e.currentTarget,
                    type: 'submit'
                  } as React.FormEvent;
                  
                  try {
                    await handleSubmit(syntheticEvent);
                  } catch (error) {
                    console.error('❌ [Pipeline Creator] Erro ao criar pipeline:', error);
                  }
                }}
              >
                {(loading || isSaving) ? (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-4 h-4 border-2 border-white/30 rounded-full" />
                      <div className="absolute top-0 left-0 w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                    </div>
                    <span className="font-medium">
                      {pipeline ? 'Salvando...' : 'Criando...'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {pipeline ? (
                      totalChanges > 0 ? (
                        <>
                          <Save className="h-4 w-4" />
                          <span className="font-medium">Salvar Alterações</span>
                          {totalChanges > 1 && (
                            <div className="ml-1 bg-white/20 text-xs px-2 py-0.5 rounded-full">
                              {totalChanges}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">Salvo</span>
                        </>
                      )
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span className="font-medium">{submitText}</span>
                      </>
                    )}
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>
        
        {/* ✅ BARRA DE PROGRESSO VISUAL (quando salvando) */}
        {isSaving && (
          <div className="mt-3 w-full">
            <div className="w-full bg-blue-100 rounded-full h-1">
              <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}
      </div>
    );
  }, [
    isSaving,
    hasUnsavedChanges,
    distributionState.hasChanges,
    hasQualificationChanges,
    hasMotivesChanges,
    totalChanges,
    pipeline,
    loading,
    pipelineNameValidation.canSubmit,
    submitText,
    timeSinceLastSave, // ✅ OTIMIZAÇÃO: Usar estado memoizado em vez de lastSavedAt
    handleSaveChanges,
    handleSubmit
  ]); // ✅ CORREÇÃO LOOP INFINITO: Removido lastSavedAt que causava recriação constante

  // ✅ NOVO: Notificar o PipelineModal sobre o footer (com dependências otimizadas)
  useEffect(() => {
    if (onFooterRender) {
      onFooterRender(renderFooter());
    }
  }, [
    onFooterRender,
    isSaving,
    hasUnsavedChanges,
    distributionState.hasChanges,
    hasQualificationChanges,
    hasMotivesChanges,
    timeSinceLastSave
  ]); // ✅ CORREÇÃO LOOP INFINITO: Dependências específicas sem renderFooter

  return (
    <>
      {/* Conteúdo Principal com Scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-4">
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={(value) => dispatch({ type: 'SET_ACTIVE_TAB', payload: value })} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-slate-100/60 rounded-xl">
            <TabsTrigger value="basic" className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Settings className="h-4 w-4" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="stages" className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Target className="h-4 w-4" />
              Etapas
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Database className="h-4 w-4" />
              Campos
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <RotateCcw className="h-4 w-4" />
              Distribuição
            </TabsTrigger>
            <TabsTrigger value="cadence" className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Zap className="h-4 w-4" />
              Cadência
              {savingActivities && (
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin ml-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="qualification" className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" />
              Qualificação
            </TabsTrigger>
            <TabsTrigger value="motives" className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Trophy className="h-4 w-4" />
              Motivos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            {renderBasicTab()}
          </TabsContent>

          <TabsContent value="stages">
            <StageManagerRender stageManager={stageManager} pipelineId={pipeline?.id} />
          </TabsContent>

          <TabsContent value="fields">
            <CustomFieldsManagerRender fieldsManager={fieldsManager} />
          </TabsContent>

          <TabsContent value="distribution">
            <DistributionManagerRender distributionManager={distributionManager} />
          </TabsContent>

          <TabsContent value="cadence">
            <CadenceManagerRender 
              cadenceManager={cadenceManager} 
              availableStages={(stageManager.stages || [])
                .filter(isNonFinalStage) // ✅ CORREÇÃO: Usar função utilitária para filtrar etapas não-finais
                .map((s: PipelineStage) => ({ 
                  name: s.name, 
                  order_index: s.order_index 
                }))} 
              // ✅ NOVO: Props para integração com API
              isLoading={cadenceManager.cadenceConfigs ? false : true}
              isApiEnabled={!!pipeline?.id}
            />
          </TabsContent>

          <TabsContent value="qualification">
            <QualificationManager
              pipelineId={pipeline?.id}
              qualificationRules={formData.qualification_rules || { mql: [], sql: [] }}
              onQualificationRulesChange={handleQualificationChange}
              isEditMode={!!pipeline?.id}
              availableFields={getAvailableFields()}
            />
          </TabsContent>

          <TabsContent value="motives">
            {/* ✅ CORREÇÃO ETAPA 2: Debug com debouncing para evitar logs repetitivos */}
            {(() => {
              const debugData = {
                pipeline_id: formatLeadIdForLog(pipeline?.id) || 'NEW_PIPELINE',
                pipeline_name: pipeline?.name || formData.name || 'SEM_NOME',
                formData_outcome_reasons: formData.outcome_reasons,
                formData_outcome_reasons_type: typeof formData.outcome_reasons,
                formData_outcome_reasons_keys: formData.outcome_reasons ? Object.keys(formData.outcome_reasons) : null,
                ganho_reasons_length: formData.outcome_reasons?.ganho_reasons?.length || 0,
                perdido_reasons_length: formData.outcome_reasons?.perdido_reasons?.length || 0,
                ganho_reasons_sample: formData.outcome_reasons?.ganho_reasons?.slice(0, 2).map(r => r?.reason_text?.substring(0, 20)) || [],
                perdido_reasons_sample: formData.outcome_reasons?.perdido_reasons?.slice(0, 2).map(r => r?.reason_text?.substring(0, 20)) || [],
                isEditMode: !!pipeline?.id,
                currentActiveTab: 'motives'
                // Removido timestamp para permitir deduplicação adequada
              };
              
              // ✅ ETAPA 4: Sistema de log Winston estruturado com debouncing inteligente
              if (motivesLogDebouncer.shouldLog(debugData, 1000)) {
                loggers.modernPipelineCreator.smartLog('Estado antes do SimpleMotivesManager', {
                  component: 'SimpleMotivesManager',
                  phase: 'pre-render-debug',
                  ...debugData
                });
              }
              
              return null;
            })()}

            {/* ✅ CORREÇÃO ETAPA 2: Render debug com debouncing */}
            {(() => {
              const propsData = formData.outcome_reasons || { ganho_reasons: [], perdido_reasons: [] };
              const renderData = {
                propsData_length: (propsData.ganho_reasons?.length || 0) + (propsData.perdido_reasons?.length || 0),
                componentWillRender: (propsData.ganho_reasons?.length || 0) + (propsData.perdido_reasons?.length || 0) > 0,
                ganho_reasons: propsData.ganho_reasons?.map(r => r.reason_text) || [],
                perdido_reasons: propsData.perdido_reasons?.map(r => r.reason_text) || [],
                formData_source: 'formData.outcome_reasons carregado via loadOutcomeReasons'
              };
              
              // ✅ ETAPA 4: Sistema de log Winston estruturado com debouncing inteligente
              if (renderLogDebouncer.shouldLog(renderData, 1000)) {
                loggers.modernPipelineCreator.smartLog('Render debug para SimpleMotivesManager', {
                  component: 'SimpleMotivesManager',
                  phase: 'render-debug',
                  ...renderData,
                  localState_length: 'N/A - dados diretos do formData'
                });
              }
              return null;
            })()}
            
            <SimpleMotivesManager
              ref={simpleMotivesManagerRef}
              outcomeReasons={formData.outcome_reasons || { ganho_reasons: [], perdido_reasons: [] }}
              onOutcomeReasonsChange={handleMotivesChange}
              isEditMode={!!pipeline?.id}
            />
          </TabsContent>
          
        </Tabs>

        {/* ✅ REMOVIDO: Botão movido para footer fixo */}
          </form>
        </div>
      </div>

      {/* ✅ NOVO: AlertDialog para confirmar fechamento com mudanças não salvas */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={(open) => dispatch({ type: 'SET_SHOW_UNSAVED_DIALOG', payload: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você fez alterações que ainda não foram salvas. O que deseja fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleCancelClose}>
              Cancelar
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={handleDiscardAndClose}
              className="text-red-600 hover:text-red-700"
            >
              Descartar alterações
            </Button>
            <AlertDialogAction 
              onClick={handleSaveAndClose}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Salvar e fechar
                </div>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ModernPipelineCreatorRefactored;