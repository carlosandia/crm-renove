import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Pipeline, PipelineStage, CustomField } from '../../types/Pipeline';
import { User } from '../../types/User';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { usePipelineNameValidation } from '../../hooks/usePipelineNameValidation';
import { showErrorToast, showWarningToast, showSuccessToast } from '../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { withSilentRetry } from '../../utils/supabaseRetry';
import { useIntelligentCache } from '../../utils/intelligentCache';

// AIDEV-NOTE: Helper para logging estruturado usando logger
import { loggers } from '../../utils/logger';

// ✅ CORREÇÃO: Importar CadenceApiService para uso consistente
import { CadenceApiService } from '../../services/cadenceApiService';

// ✅ PERFORMANCE: Sistema de debouncing para eliminar logs duplicados
const createLogDebouncer = () => {
  const logCache = new Map<string, { lastLog: number; count: number }>();
  const DEBOUNCE_DELAY = 3000; // 3 segundos
  
  return (logKey: string, logFn: () => void) => {
    const now = Date.now();
    const cached = logCache.get(logKey);
    
    if (!cached || (now - cached.lastLog) > DEBOUNCE_DELAY) {
      logFn();
      logCache.set(logKey, { lastLog: now, count: 1 });
    } else {
      cached.count++;
      // Log apenas se há mudanças significativas (mais de 3 eventos ignorados)
      if (cached.count >= 3) {
        logFn();
        logCache.set(logKey, { lastLog: now, count: 1 });
      }
    }
  };
};

const debouncedLog = createLogDebouncer();

// ✅ PERFORMANCE: Import do performance monitoring
import { usePerformanceMonitor } from '../../shared/utils/performance';

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
import { useCustomFieldsManager, CustomFieldsManagerRender } from './fields';
import { useCadenceManager, CadenceManagerRender } from './cadence';
import { useLocalDistributionManager, DistributionManagerRender, DistributionRule } from './distribution';
import { useTemperatureConfig, TemperatureConfigRender } from './temperature';

// ✅ NOVAS ABAS: Importar os 2 novos componentes para as abas expandidas
import QualificationManager, { QualificationRules } from './QualificationManager';
import MotivesManager, { OutcomeReasons } from './MotivesManager';


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
    loggers.apiError(`PipelineCreator:${context}`, error, { 
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
  const finalStageNames = [
    'Ganho', 'Perdido', 
    'Closed Won', 'Closed Lost',
    'Ganha', 'Perdida',
    'Won', 'Lost',
    'Finalizado', 'Cancelado'
  ];
  
  const stageName = stage.name?.trim().toLowerCase();
  const isFinalByName = finalStageNames.some(finalName => 
    stageName === finalName.toLowerCase()
  );
  
  if (isFinalByName) {
    return false;
  }
  
  // ✅ CRITÉRIO 3: Etapas do sistema marcadas como finais
  if (stage.is_system_stage && (stageName.includes('won') || stageName.includes('lost'))) {
    return false;
  }
  
  return true;
};

// Interfaces
interface LocalCustomField {
  id?: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
  show_in_card: boolean;
}

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
  tasks: CadenceTask[];
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
  member_ids: string[];
  stages: Omit<PipelineStage, 'id' | 'pipeline_id' | 'created_at' | 'updated_at'>[];
  custom_fields: LocalCustomField[];
  cadence_configs: CadenceConfig[];
  distribution_rule?: LocalDistributionRule;
  temperature_config?: TemperatureConfig;
  // ✅ NOVAS ABAS: Campos das 2 novas abas
  qualification_rules?: QualificationRules;
  outcome_reasons?: OutcomeReasons;
}

interface ModernPipelineCreatorProps {
  members: User[];
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
}

const ModernPipelineCreatorRefactored: React.FC<ModernPipelineCreatorProps> = ({
  members,
  pipeline,
  onSubmit,
  onCancel,
  title,
  submitText,
  onDuplicatePipeline,
  onArchivePipeline,
  onPipelineUpdated,
  onFooterRender,
}) => {
  // ✅ CORREÇÃO: Log removido para evitar spam no console durante re-renders frequentes
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cacheManager = useIntelligentCache(true); // Debug mode ativo
  
  // ✅ PERFORMANCE: Integração do performance monitoring
  const performanceMonitor = usePerformanceMonitor('ModernPipelineCreatorRefactored');
  
  // ✅ NOVO: Estado simples para detectar mudanças não salvas
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Hook de validação de nome único
  const pipelineNameValidation = usePipelineNameValidation(
    '', // Não passar nome inicial para evitar validação automática
    pipeline?.id
  );
  
  // Estados principais
  const [formData, setFormData] = useState<PipelineFormData>({
    name: '',
    description: '',
    member_ids: [],
    stages: [],
    custom_fields: [],
    cadence_configs: [],
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
    // ✅ NOVAS ABAS: Inicialização dos campos das novas abas
    qualification_rules: { mql: [], sql: [] },
    outcome_reasons: { won: [], lost: [] }
  });
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // ✅ NOVA: Estados para feedback visual de salvamento
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // ✅ NOVA: Referência para evitar re-inicialização desnecessária
  const lastInitializedPipelineId = useRef<string | null>(null);
  const [isIntentionalSubmit, setIsIntentionalSubmit] = useState(false);
  
  // ✅ OTIMIZAÇÃO: Sistema de debouncing para handlers frequentes
  const debounceTimeouts = useRef<{[key: string]: NodeJS.Timeout}>({});
  
  const debounceHandler = useCallback((key: string, fn: () => void, delay: number = 500) => {
    if (debounceTimeouts.current[key]) {
      clearTimeout(debounceTimeouts.current[key]);
    }
    
    debounceTimeouts.current[key] = setTimeout(() => {
      fn();
      delete debounceTimeouts.current[key];
    }, delay);
  }, []);
  const [isExplicitButtonClick, setIsExplicitButtonClick] = useState(false);
  const [savingActivities, setSavingActivities] = useState(false);
  const [isStageAction, setIsStageAction] = useState(false);
  const [isNavigationChange, setIsNavigationChange] = useState(false);
  
  // ✅ NOVO: Flag para detectar mudanças de distribuição
  const [hasDistributionChanges, setHasDistributionChanges] = useState(false);
  
  // ✅ NOVO: Flag para detectar mudanças de qualificação
  const [hasQualificationChanges, setHasQualificationChanges] = useState(false);
  
  // ✅ NOVO: Flag para detectar mudanças de motivos
  const [hasMotivesChanges, setHasMotivesChanges] = useState(false);


  // ✅ NOVO: Função para marcar formulário como modificado (só após inicialização)
  const markFormDirty = useCallback(() => {
    if (!hasUnsavedChanges && isInitialized) {
      setHasUnsavedChanges(true);
      console.log('📝 [Form] Marcado como modificado');
    }
  }, [hasUnsavedChanges, isInitialized]);

  // ✅ NOVO: Função para limpar estado de mudanças
  const markFormClean = useCallback(() => {
    setHasUnsavedChanges(false);
    setHasDistributionChanges(false);
    setHasQualificationChanges(false);
    console.log('✅ [Form] Marcado como limpo (incluindo distribuição e qualificação)');
  }, []);

  // ✅ NOVO: Referência para acessar estado do distributionManager
  const distributionManagerRef = useRef<{ isInitializing: boolean } | null>(null);
  
  // ✅ CORREÇÃO: Proteção contra duplo clique/salvamento
  const isSavingRef = useRef<boolean>(false);

  // Callbacks para mudanças que marcam o formulário como dirty
  const handleStagesChange = useCallback((customStages: PipelineStage[]) => {
    // ✅ PERFORMANCE: Debounced logging para eliminar duplicações
    debouncedLog('handleStagesChange', () => {
      console.log('🔄 [handleStagesChange] Stages atualizados:', {
        customStagesCount: customStages.length,
        isEditMode: !!pipeline?.id,
      });
    });
    
    setFormData(prev => {
      const systemStages = prev.stages.filter(stage => stage.is_system_stage);
      const allStages = [...systemStages, ...customStages];
      return { ...prev, stages: allStages };
    });
    
    if (pipeline?.id) {
      markFormDirty();
      // ✅ CRÍTICO: Flag para identificar mudanças de stage
      setIsStageAction(true);
      debouncedLog('stageActionFlag', () => {
        console.log('🆕 [handleStagesChange] Ação de stage detectada');
      });
    }
  }, [pipeline?.id, markFormDirty]);

  const handleFieldsUpdate = useCallback((custom_fields: LocalCustomField[]) => {
    // ✅ PERFORMANCE: Debounced logging para campos
    debouncedLog('handleFieldsUpdate', () => {
      console.log('🔄 [handleFieldsUpdate] Campos atualizados:', {
        fieldsCount: custom_fields.length,
      });
    });
    
    setFormData(prev => ({ ...prev, custom_fields }));
    // ✅ CORREÇÃO CRÍTICA: NÃO marcar formulário como dirty para campos customizados
    // Campos customizados são salvos via API própria, não devem afetar estado do pipeline
    // if (pipeline?.id) markFormDirty(); // REMOVIDO: Causa fechamento automático do modal
  }, [pipeline?.id]);

  // ✅ NOVO: Throttling para evitar logs repetitivos
  const cadenceLogThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const lastCadenceCountRef = useRef<number>(0);

  const handleCadencesChange = useCallback((cadence_configs: any[]) => {
    // ✅ CORREÇÃO: Capturar valor anterior ANTES da comparação
    const previousCount = lastCadenceCountRef.current;
    const currentCount = cadence_configs.length;
    
    // ✅ OTIMIZADO: Log apenas quando há mudanças significativas com throttling robusto
    if (currentCount !== previousCount) {
      if (cadenceLogThrottleRef.current) {
        clearTimeout(cadenceLogThrottleRef.current);
      }
      
      cadenceLogThrottleRef.current = setTimeout(() => {
        // ✅ OTIMIZADO: Log apenas mudanças significativas (±2 ou mais items)
        const diff = Math.abs(currentCount - previousCount);
        if (diff >= 2 || process.env.NODE_ENV === 'development') {
          const changeType = currentCount > previousCount ? 'adição' : 'exclusão';
          console.log('🔄 [PipelineCreator] Cadências:', {
            count: currentCount,
            change: changeType,
            diff
          });
        }
      }, 5000); // ✅ OTIMIZADO: Aumentado para 5s para reduzir ruído
      
      // ✅ CRÍTICO: Atualizar referência APÓS capturar os valores para comparação
      lastCadenceCountRef.current = currentCount;
    }
    
    setFormData(prev => ({ ...prev, cadence_configs }));
    if (pipeline?.id) markFormDirty();
  }, [pipeline?.id, markFormDirty]);

  const handleDistributionRuleChange = useCallback((distribution_rule: DistributionRule, isNavChange = false) => {
    // ✅ OTIMIZADO: Log com throttling condicional apenas em desenvolvimento
    debounceHandler('distribution-log', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [handleDistributionRuleChange] Atualizando distribuição', { isNavChange });
      }
    }, 2000);
    
    // ✅ CRÍTICO: Definir flag de navegação antes de qualquer operação
    setIsNavigationChange(isNavChange);
    setFormData(prev => ({ ...prev, distribution_rule }));
    
    // ✅ CORREÇÃO CRÍTICA: Marcar como dirty para TODAS as mudanças reais, incluindo navegação
    const isDistributionInitializing = distributionManagerRef.current?.isInitializing;
    if (pipeline?.id && !isDistributionInitializing) {
      markFormDirty();
      // ✅ NOVO: Marcar que há mudanças de distribuição
      setHasDistributionChanges(true);
      debounceHandler('distribution-dirty-log', () => {
        if (process.env.NODE_ENV === 'development') {
          const changeType = isNavChange ? 'navegação' : 'configuração';
          console.log(`📝 [handleDistributionRuleChange] Mudança de ${changeType} - formulário marcado como modificado`);
        }
      }, 2000);
    } else if (process.env.NODE_ENV === 'development') {
      debounceHandler('distribution-ignore-log', () => {
        if (isDistributionInitializing) {
          console.log('🔇 [handleDistributionRuleChange] Mudança durante inicialização do distributionManager (ignorada)');
        }
      }, 2000);
    }
    
    // ✅ CRÍTICO: Reset da flag após um breve delay para evitar submits automáticos
    if (isNavChange) {
      setTimeout(() => {
        setIsNavigationChange(false);
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [handleDistributionRuleChange] Flag de navegação resetada');
        }
      }, 100);
    }
  }, [pipeline?.id, markFormDirty, debounceHandler]);

  const handleTemperatureConfigChange = useCallback((temperature_config: TemperatureConfig) => {
    debounceHandler('temperature-log', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🌡️ [handleTemperatureConfigChange] Recebido:', temperature_config);
      }
    }, 2000);
    setFormData(prev => ({ ...prev, temperature_config }));
    if (pipeline?.id) markFormDirty();
  }, [pipeline?.id, markFormDirty, debounceHandler]);

  const handleQualificationChange = useCallback((qualification_rules: QualificationRules) => {
    debounceHandler('qualification-log', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [handleQualificationChange] Atualizando qualificação');
      }
    }, 2000);
    setFormData(prev => ({ ...prev, qualification_rules }));
    
    // ✅ CORREÇÃO CRÍTICA: Usar flag específica ao invés de markFormDirty para evitar fechamento do modal
    if (pipeline?.id) {
      setHasQualificationChanges(true);
      debounceHandler('qualification-dirty-log', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('📝 [handleQualificationChange] Qualificação marcada como modificada (sem fechar modal)');
        }
      }, 2000);
    }
  }, [pipeline?.id, debounceHandler]);

  const handleMotivesChange = useCallback((outcome_reasons: OutcomeReasons) => {
    // Atualizar estado imediatamente
    setFormData(prev => ({ ...prev, outcome_reasons }));
    setHasMotivesChanges(true); // ✅ NOVO: Flag específica para motivos
    
    // Logs com debouncing para evitar spam
    debounceHandler('motives-change', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [handleMotivesChange] Motivos atualizados (debounced):', {
          wonCount: outcome_reasons.won.length,
          lostCount: outcome_reasons.lost.length,
          pipelineId: pipeline?.id?.substring(0, 8)
        });
      }
    }, 2000);
    
    if (pipeline?.id) markFormDirty();
  }, [pipeline?.id, markFormDirty, debounceHandler]);

  // ✅ NOVO: Handlers para campos básicos com debounce
  const handleNameChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
    // Sincronizar com hook de validação se necessário
    if (pipelineNameValidation.name !== value) {
      pipelineNameValidation.updateName(value);
    }
    if (pipeline?.id) markFormDirty();
  }, [pipeline?.id, markFormDirty, pipelineNameValidation]);

  const handleDescriptionChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
    if (pipeline?.id) markFormDirty();
  }, [pipeline?.id, markFormDirty]);

  const handleMemberToggle = useCallback((memberId: string) => {
    setFormData(prev => {
      const newMemberIds = prev.member_ids.includes(memberId)
        ? prev.member_ids.filter(id => id !== memberId)
        : [...prev.member_ids, memberId];
      return { ...prev, member_ids: newMemberIds };
    });
    if (pipeline?.id) markFormDirty();
  }, [pipeline?.id, markFormDirty]);

  // Inicializar managers especializados
  const initialCustomStages = React.useMemo(() => {
    return formData.stages.filter(stage => !stage.is_system_stage);
  }, [formData.stages]);
  
  const stageManager = useStageManager({
    initialStages: initialCustomStages,
    onStagesChange: handleStagesChange
  });

  const fieldsManager = useCustomFieldsManager({
    customFields: formData.custom_fields,
    onFieldsUpdate: handleFieldsUpdate,
    pipelineId: pipeline?.id
  });

  const cadenceManager = useCadenceManager({
    initialCadences: formData.cadence_configs,
    availableStages: stageManager.stages,
    onCadencesChange: handleCadencesChange,
    // ✅ NOVO: Habilitar integração com API se pipeline existir
    pipelineId: pipeline?.id,
    tenantId: user?.tenant_id,
    enableApiIntegration: !!pipeline?.id
  });

  const distributionManager = useLocalDistributionManager({
    pipelineId: pipeline?.id || '',
    onRuleChange: handleDistributionRuleChange
  });

  // ✅ NOVO: Atualizar referência para o estado do distributionManager
  useEffect(() => {
    distributionManagerRef.current = { isInitializing: distributionManager.isInitializing };
  }, [distributionManager.isInitializing]);

  // ✅ AUTOSAVE: Salvar automaticamente mudanças de stages
  useEffect(() => {
    if (!isStageAction || !pipeline?.id) return;
    
    // Debounce para evitar salvamentos excessivos
    const timeoutId = setTimeout(async () => {
      try {
        console.log('🔄 [AutoSave-Stages] Salvando mudanças de stages automaticamente...');
        await handleSaveChanges();
        console.log('✅ [AutoSave-Stages] Mudanças de stages salvas com sucesso');
      } catch (error) {
        console.error('❌ [AutoSave-Stages] Erro ao salvar stages:', error);
      }
    }, 1000); // Aguarda 1 segundo após a última mudança

    return () => clearTimeout(timeoutId);
  }, [isStageAction, pipeline?.id]); // Monitora mudanças de stages

  const temperatureManager = useTemperatureConfig({
    pipelineId: pipeline?.id,
    tenantId: user?.tenant_id,
    initialConfig: formData.temperature_config,
    onConfigChange: handleTemperatureConfigChange
  });

  // ✅ CORRIGIDO: Usar apenas campos do fieldsManager (já inclui sistema + customizados)
  const getAvailableFields = useCallback(() => {
    // fieldsManager.customFields já inclui campos sistema + customizados
    return (fieldsManager.customFields || [])
      .filter(field => field.field_name && field.field_label) // Garantir que têm nome e label
      .map(field => ({
        value: field.field_name,
        label: field.field_label,
        type: field.field_type
      }));
  }, [fieldsManager.customFields]);

  // ✅ NOVO: Handler para fechar modal com verificação de mudanças
  const handleCloseAttempt = useCallback(() => {
    if (hasUnsavedChanges && pipeline?.id) {
      setShowUnsavedDialog(true);
    } else {
      onCancel();
    }
  }, [hasUnsavedChanges, pipeline?.id, onCancel]);

  // ✅ NOVO: Salvar mudanças e fechar
  const handleSaveAndClose = useCallback(async () => {
    if (!pipeline?.id) return;
    
    try {
      setLoading(true);
      // ✅ PERFORMANCE: Debounced logging para save operations
      debouncedLog('handleSaveAndClose', () => {
        console.log('💾 [handleSaveAndClose] Salvando mudanças antes de fechar');
      });
      
      await onSubmit(formData, true); // ✅ CORREÇÃO: manter modal aberto após salvar
      markFormClean();
      setShowUnsavedDialog(false);
      onCancel();
    } catch (error) {
      console.error('❌ [handleSaveAndClose] Erro ao salvar:', error);
      showErrorToast('Erro ao salvar', 'Não foi possível salvar as mudanças');
    } finally {
      setLoading(false);
    }
  }, [pipeline?.id, formData, onSubmit, markFormClean, onCancel]);

  // ✅ NOVO: Salvar mudanças sem fechar (modo edição) - CORREÇÃO PRINCIPAL
  const handleSaveChanges = useCallback(async () => {
    if (!pipeline?.id) return;
    
    // ✅ CORREÇÃO CRÍTICA: Proteção contra duplo clique/execução
    if (isSavingRef.current) {
      debouncedLog('saveBlocked', () => {
        console.log('🚫 [handleSaveChanges] BLOQUEADO - Salvamento já em andamento');
      });
      return;
    }
    
    // ✅ PERFORMANCE: Iniciar medição de performance
    return await performanceMonitor.measureAsync('saveChanges', async () => {
      try {
        // Marcar início do salvamento
        isSavingRef.current = true;
        setLoading(true);
        setIsSaving(true);
        // ✅ PERFORMANCE: Debounced logging para save operations
        debouncedLog('saveStart', () => {
          console.log('💾 [handleSaveChanges] Iniciando salvamento');
        });
      
      // ✅ NOVO: Salvar configurações de distribuição antes de salvar pipeline
      if (hasDistributionChanges && distributionManager.handleSave) {
        console.log('🔄 [handleSaveChanges] Salvando configurações de distribuição primeiro...');
        await distributionManager.handleSave();
        setHasDistributionChanges(false); // ✅ CORREÇÃO: Limpar flag após salvar
        console.log('✅ [handleSaveChanges] Configurações de distribuição salvas');
      }

      // ✅ NOVO: Salvar regras de qualificação se houver mudanças
      if (hasQualificationChanges && formData.qualification_rules) {
        console.log('🔄 [handleSaveChanges] Salvando regras de qualificação...');
        await saveQualificationRules(pipeline.id, formData.qualification_rules);
        setHasQualificationChanges(false); // ✅ CORREÇÃO: Limpar flag após salvar
        console.log('✅ [handleSaveChanges] Regras de qualificação salvas');
      }

      // ✅ NOVO: Salvar motivos de ganho/perda se houver mudanças
      console.log('🔍 [handleSaveChanges] Verificando salvamento de motivos:', {
        hasMotivesChanges,
        hasOutcomeReasons: !!formData.outcome_reasons,
        outcomeReasons: formData.outcome_reasons,
        pipelineId: pipeline?.id
      });
      
      if (hasMotivesChanges && formData.outcome_reasons) {
        console.log('🔄 [handleSaveChanges] INICIANDO salvamento de motivos de ganho/perda...');
        try {
          await saveOutcomeReasons(pipeline.id, formData.outcome_reasons);
          setHasMotivesChanges(false); // ✅ CORREÇÃO: Limpar flag após salvar
          console.log('✅ [handleSaveChanges] Motivos salvos COM SUCESSO');
        } catch (error) {
          console.error('❌ [handleSaveChanges] Erro ao salvar motivos:', error);
          throw error;
        }
      } else if (hasMotivesChanges && !formData.outcome_reasons) {
        console.warn('⚠️ [handleSaveChanges] hasMotivesChanges=true mas outcome_reasons está vazio');
      } else if (!hasMotivesChanges && formData.outcome_reasons) {
        console.log('ℹ️ [handleSaveChanges] Motivos existem mas hasMotivesChanges=false - sem salvamento');
      }
      
      // ✅ CORREÇÃO: Receber pipeline atualizada do onSubmit - manter modal aberto
      const updatedPipeline = await onSubmit(formData, false); // false = não redirecionar, manter modal aberto
      
      // ✅ CRÍTICO: Limpar flag após uso
      if (isStageAction) {
        setIsStageAction(false);
        console.log('🧹 [handleSaveChanges] Flag isStageAction limpo após salvamento');
      }
      
      // ✅ CRÍTICO: Atualização otimista do cache React Query ANTES da invalidation
      if (updatedPipeline && user?.tenant_id) {
        console.log('⚡ [handleSaveChanges] Aplicando update otimista no cache...');
        
        // Update otimista da lista de pipelines
        const existingPipelines = queryClient.getQueryData(['pipelines', user.tenant_id]) as Pipeline[] | undefined;
        if (existingPipelines) {
          const updatedPipelines = existingPipelines.map(p => 
            p.id === updatedPipeline.id ? updatedPipeline : p
          );
          queryClient.setQueryData(['pipelines', user.tenant_id], updatedPipelines);
          console.log('⚡ [handleSaveChanges] Cache atualizado otimisticamente');
        }
        
        // Update otimista da pipeline individual
        queryClient.setQueryData(['pipeline', pipeline.id], updatedPipeline);
        
        // Notificar componente local
        if (onPipelineUpdated) {
          onPipelineUpdated(updatedPipeline);
          console.log('🔄 [handleSaveChanges] Pipeline local atualizada:', {
            name: updatedPipeline.name,
            description: updatedPipeline.description
          });
        }
      }
      
      // ✅ OTIMIZADO: Cache inteligente com estratégias específicas por contexto
      console.log('🧠 [handleSaveChanges] Executando cache strategy inteligente...', {
        tenantId: user?.tenant_id,
        pipelineId: pipeline?.id,
        pipelineName: pipeline?.name
      });
      
      // ✅ CORRIGIDO: Usar variável correta 'pipeline' ao invés de 'editingPipeline'
      if (pipeline?.id && user?.tenant_id) {
        await cacheManager.handlePipelineSave(user.tenant_id, pipeline.id);
        console.log('✅ [handleSaveChanges] Cache strategy executada com sucesso');
      } else {
        console.warn('⚠️ [handleSaveChanges] Pulando cache strategy - dados insuficientes:', {
          hasPipelineId: !!pipeline?.id,
          hasTenantId: !!user?.tenant_id
        });
      }
      
      // ✅ FINAL: Disparar evento para notificar toda a aplicação
      if (updatedPipeline) {
        window.dispatchEvent(new CustomEvent('pipeline-updated', {
          detail: {
            pipeline: updatedPipeline,
            source: 'save-changes',
            timestamp: new Date().toISOString()
          }
        }));
        console.log('📡 [handleSaveChanges] Evento pipeline-updated disparado');
      }
      
      markFormClean();
      setHasDistributionChanges(false); // ✅ CORREÇÃO: Limpar flag de distribuição
      // ✅ NOVO: Marcar campos como salvos (stages são gerenciados pelo pai)
      if (fieldsManager.handleSaveAllChanges) {
        fieldsManager.handleSaveAllChanges();
      }
      // ✅ NOVA: Salvar configurações de cadência no banco
      if (cadenceManager.handleSaveAllChanges) {
        console.log('💾 [handleSaveChanges] Salvando configurações de cadência...');
        await cadenceManager.handleSaveAllChanges();
        console.log('✅ [handleSaveChanges] Configurações de cadência salvas');
      }
      setLastSavedAt(new Date()); // ✅ NOVA: Registrar timestamp do salvamento
      // ✅ CORREÇÃO: Remover notificação duplicada - feedback visual no rodapé já é suficiente
      
      console.log('✅ [handleSaveChanges] Cache invalidado, dados atualizados e MODAL MANTIDO ABERTO');
      
      // ❌ CORREÇÃO PRINCIPAL: REMOVIDO onCancel() - modal permanece aberto
      // onCancel(); ← Esta linha causava o fechamento automático
      
      } catch (error) {
        console.error('❌ [handleSaveChanges] Erro ao salvar:', error);
        showErrorToast('Erro ao salvar', 'Não foi possível salvar as mudanças');
      } finally {
        // ✅ CORREÇÃO CRÍTICA: Liberar proteção contra duplo clique
        isSavingRef.current = false;
        setLoading(false);
        setIsSaving(false);
        console.log('🔓 [handleSaveChanges] Proteção contra duplo clique liberada');
      }
    });
  }, [pipeline?.id, formData, onSubmit, markFormClean, queryClient, user?.tenant_id, onPipelineUpdated]);

  // ✅ NOVO: Descartar mudanças e fechar
  const handleDiscardAndClose = useCallback(() => {
    console.log('🗑️ [handleDiscardAndClose] Descartando mudanças');
    markFormClean();
    setShowUnsavedDialog(false);
    onCancel();
  }, [markFormClean, onCancel]);

  // ✅ NOVO: Cancelar fechamento
  const handleCancelClose = useCallback(() => {
    setShowUnsavedDialog(false);
  }, []);

  // ✅ MELHORADO: Inicialização inteligente dos dados do pipeline
  useEffect(() => {
    if (!pipeline) return;

    const initializePipelineData = async () => {
      try {
        // ✅ NOVA: Verificar se já está inicializado para esta pipeline
        const isAlreadyInitialized = formData.name && 
          pipeline.id === lastInitializedPipelineId.current &&
          !hasUnsavedChanges;
        
        // ✅ PROTEÇÃO: Não reinicializar se há mudanças de distribuição pendentes
        const hasDistributionPending = hasDistributionChanges || distributionManagerRef.current?.isInitializing;
          
        if (isAlreadyInitialized) {
          console.log('🚫 [ModernPipelineCreatorRefactored] Pipeline já inicializada, ignorando re-inicialização:', pipeline.id);
          return;
        }
        
        if (hasDistributionPending) {
          console.log('🚫 [ModernPipelineCreatorRefactored] Mudanças de distribuição pendentes, evitando reload:', {
            hasDistributionChanges,
            isDistributionInitializing: distributionManagerRef.current?.isInitializing
          });
          return;
        }
        
        console.log('🔄 [ModernPipelineCreatorRefactored] Inicializando dados da pipeline:', pipeline.id);
        lastInitializedPipelineId.current = pipeline.id;

        const customFields = await loadCustomFields(pipeline.id);
        const cadenceConfigs = await loadCadenceConfigs(pipeline.id);
        const distributionRule = await loadDistributionRule(pipeline.id);
        const temperatureConfig = await loadTemperatureConfig(pipeline.id);
        const qualificationRules = await loadQualificationRules(pipeline.id);
        const outcomeReasons = await loadOutcomeReasons(pipeline.id);
        const pipelineMembers = await loadPipelineMembers(pipeline.id);
        

        setFormData({
          name: pipeline.name || '',
          description: pipeline.description || '',
          member_ids: pipelineMembers,
          stages: pipeline.stages || [],
          custom_fields: customFields,
          cadence_configs: cadenceConfigs,
          distribution_rule: distributionRule,
          temperature_config: temperatureConfig,
          qualification_rules: qualificationRules,
          outcome_reasons: outcomeReasons
        });

        // Validar nome inicialmente e sincronizar com hook
        if (pipeline.name) {
          pipelineNameValidation.updateName(pipeline.name);
        }

        // ✅ CRÍTICO: Marcar como inicializado após carregar todos os dados
        setIsInitialized(true);
        console.log('✅ [Form] Inicialização completa - pronto para detectar mudanças');

      } catch (error) {
        logPipelineError('initialization', error, true);
        showErrorToast('Erro de carregamento', 'Falha ao carregar dados da pipeline');
        // Mesmo com erro, marcar como inicializado para evitar problemas
        setIsInitialized(true);
      }
    };

    initializePipelineData();
  }, [pipeline?.id]); // ✅ CORREÇÃO: Dependência apenas do ID

  // Funções de carregamento de dados (simplificadas)
  const loadCustomFields = async (pipelineId: string): Promise<LocalCustomField[]> => {
    try {
      const { data: fields, error } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('field_order');

      if (error) throw error;
      return fields || [];
    } catch (error) {
      console.warn('⚠️ [loadCustomFields] Erro ao carregar campos:', error);
      return [];
    }
  };

  const loadCadenceConfigs = async (pipelineId: string): Promise<CadenceConfig[]> => {
    try {
      // ✅ CORREÇÃO: Usar CadenceApiService para consistência com API backend
      console.log('🔄 [loadCadenceConfigs] Carregando via CadenceApiService:', { pipelineId: pipelineId.substring(0, 8) });
      const configs = await CadenceApiService.loadCadenceForPipeline(pipelineId);
      console.log('✅ [loadCadenceConfigs] Configurações carregadas:', { count: configs.length });
      return configs;
    } catch (error) {
      console.warn('⚠️ [loadCadenceConfigs] Erro ao carregar cadências:', error);
      return [];
    }
  };


  const loadDistributionRule = async (pipelineId: string): Promise<LocalDistributionRule> => {
    try {
      const { data: rule, error } = await supabase
        .from('pipeline_distribution_rules')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .single();

      if (error) throw error;
      
      // ✅ CORREÇÃO: Verificar especificamente se rule e rule.mode existem
      if (!rule || !rule.mode) {
        console.log('⚠️ [loadDistributionRule] Rule não encontrada ou sem mode, usando fallback manual');
        return {
          mode: 'manual',
          is_active: true,
          working_hours_only: false,
          skip_inactive_members: true,
          fallback_to_manual: true
        };
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

  const loadTemperatureConfig = async (pipelineId: string): Promise<TemperatureConfig> => {
    try {
      const { data: config, error } = await supabase
        .from('temperature_config')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .single();

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

  const loadQualificationRules = async (pipelineId: string): Promise<QualificationRules> => {
    try {
      // ✅ MIGRADO: Usar Backend API como outras abas (Distribuição, Cadência, etc.)
      const { QualificationApiService } = await import('../../services/qualificationApi');
      const qualificationRules = await QualificationApiService.loadQualificationRules(pipelineId);
      
      console.log('✅ [loadQualificationRules] Regras carregadas via Backend API:', {
        mqlCount: qualificationRules.mql.length,
        sqlCount: qualificationRules.sql.length
      });
      
      return qualificationRules;
    } catch (error: any) {
      console.warn('⚠️ [loadQualificationRules] Erro ao carregar regras:', error.message);
      return { mql: [], sql: [] };
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

      // ✅ NOVO: Cache strategy específica para qualificação
      await cacheManager.handleQualificationSave(user?.tenant_id || '', pipelineId);

    } catch (error: any) {
      console.error('❌ [saveQualificationRules] Erro ao salvar regras via Backend API:', error.message);
      throw error;
    }
  };

  // ✅ NOVO: Função para salvar motivos de ganho/perda via Backend API
  const saveOutcomeReasons = async (pipelineId: string, outcomeReasons: OutcomeReasons) => {
    try {
      console.log('🔄 [saveOutcomeReasons] Salvando via Backend API:', {
        pipelineId,
        wonCount: outcomeReasons.won.length,
        lostCount: outcomeReasons.lost.length
      });

      // ✅ MIGRADO: Usar Backend API como outras abas (Distribuição, Cadência, Qualificação)
      const { OutcomeReasonsApiService } = await import('../../services/outcomeReasonsApi');
      await OutcomeReasonsApiService.saveOutcomeReasons(pipelineId, outcomeReasons);
      
      console.log('✅ [saveOutcomeReasons] Motivos salvos com sucesso via Backend API:', {
        wonCount: outcomeReasons.won.length,
        lostCount: outcomeReasons.lost.length
      });

      // ✅ NOVO: Cache strategy específica para motivos
      // TODO: Comentado temporariamente para debuggar problema de salvamento
      // await cacheManager.handleMotivesSave(user?.tenant_id || '', pipelineId);

    } catch (error: any) {
      console.error('❌ [saveOutcomeReasons] Erro ao salvar motivos via Backend API:', error.message);
      throw error;
    }
  };

  const loadOutcomeReasons = async (pipelineId: string): Promise<OutcomeReasons> => {
    try {
      console.log('🔄 [loadOutcomeReasons] Carregando via Backend API:', {
        pipelineId
      });

      // ✅ MIGRADO: Usar Backend API como outras abas (Distribuição, Cadência, Qualificação)
      const { OutcomeReasonsApiService } = await import('../../services/outcomeReasonsApi');
      const outcomeReasons = await OutcomeReasonsApiService.loadOutcomeReasons(pipelineId);
      
      console.log('✅ [loadOutcomeReasons] Motivos carregados com sucesso via Backend API:', {
        wonCount: outcomeReasons.won.length,
        lostCount: outcomeReasons.lost.length
      });
      
      return outcomeReasons;
    } catch (error: any) {
      console.error('❌ [loadOutcomeReasons] Erro ao carregar motivos via Backend API:', error.message);
      return { won: [], lost: [] };
    }
  };

  // ✅ CORREÇÃO: Carregar member_ids da tabela pipeline_members
  const loadPipelineMembers = async (pipelineId: string): Promise<string[]> => {
    try {
      console.log('🔄 [loadPipelineMembers] Carregando membros da pipeline:', pipelineId);
      
      const { data: pipelineMembers, error } = await supabase
        .from('pipeline_members')
        .select('member_id')
        .eq('pipeline_id', pipelineId);

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
      console.warn('⚠️ [loadPipelineMembers] Erro ao carregar membros da pipeline:', error);
      return [];
    }
  };

  // Handler do submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ GUARD: Detectar origem do submit e bloquear submits automáticos indesejados
    const eventTarget = e.target as HTMLElement;
    const eventType = e.type;
    const activeElement = document.activeElement as HTMLElement;
    
    console.log('🔍 [handleSubmit] Submit detectado:', {
      eventType,
      eventTarget: eventTarget?.tagName || 'unknown',
      activeElement: activeElement?.tagName || 'unknown',
      hasUnsavedChanges,
      isDistributionInitializing: distributionManagerRef.current?.isInitializing,
      formDataKeys: Object.keys(formData),
      stackTrace: new Error().stack?.split('\n').slice(0, 5)
    });
    
    // ✅ GUARD: Bloquear submit se for durante inicialização de distribuição
    if (distributionManagerRef.current?.isInitializing) {
      console.log('🚫 [handleSubmit] BLOQUEADO: Submit durante inicialização do distributionManager');
      return;
    }
    
    // ✅ GUARD: Bloquear submit se for mudança de navegação
    if (isNavigationChange) {
      console.log('🚫 [handleSubmit] BLOQUEADO: Submit é mudança de navegação');
      return;
    }
    
    // ✅ GUARD: Verificar se realmente há mudanças válidas para submeter
    const hasAnyChanges = hasUnsavedChanges || hasDistributionChanges || hasQualificationChanges || hasMotivesChanges;
    if (!hasAnyChanges && pipeline?.id) {
      console.log('🚫 [handleSubmit] BLOQUEADO: Sem mudanças não salvas para submeter', {
        hasUnsavedChanges,
        hasDistributionChanges,
        hasQualificationChanges,
        hasMotivesChanges
      });
      return;
    }
    
    if (!pipelineNameValidation.canSubmit) {
      showWarningToast('Validação', 'Verifique se o nome da pipeline é válido e único');
      return;
    }

    try {
      setLoading(true);
      console.log('📤 [ModernPipelineCreatorRefactored] Enviando dados do formulário - SUBMIT AUTORIZADO');
      
      await onSubmit(formData, true);
      markFormClean();
      
    } catch (error) {
      logPipelineError('submit', error, true);
      showErrorToast('Erro no envio', 'Falha ao salvar pipeline');
    } finally {
      setLoading(false);
    }
  };

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
            <Input
              id="pipeline-name"
              value={pipelineNameValidation.name}
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
            {pipelineNameValidation.showValidation && pipelineNameValidation.hasError && (
              <MotionWrapper variant="slideDown" duration={0.2}>
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                  {pipelineNameValidation.error}
                </p>
              </MotionWrapper>
            )}
            {pipelineNameValidation.showValidation && pipelineNameValidation.isValid && !pipelineNameValidation.isEditMode && (
              <MotionWrapper variant="slideDown" duration={0.2}>
                <p className="text-sm text-green-600 flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                  Nome disponível
                </p>
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
            <Textarea
              id="pipeline-description"
              value={formData.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Descreva o propósito e funcionamento do pipeline..."
              rows={3}
              className="transition-all duration-300 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </BlurFade>

          {/* Separador visual sutil */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

          {/* Campo Vendedores */}
          <BlurFade delay={0.15} direction="up" blur="2px" className="space-y-3">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              Vendedores Vinculados *
            </Label>
            {members.length === 0 ? (
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
                  <span>{formData.member_ids.length} de {members.length} selecionados</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, member_ids: members.map(m => m.id) }))}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Selecionar todos
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, member_ids: [] }))}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50/30">
                  <div className="p-2 space-y-1">
                    {members.map((member, index) => (
                      <BlurFade key={member.id} delay={0.2 + (index * 0.02)} direction="up" blur="1px">
                        <div className="flex items-center p-2 rounded hover:bg-white/80 transition-colors cursor-pointer">
                          <Checkbox
                            id={`member-${member.id}`}
                            checked={formData.member_ids.includes(member.id)}
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
                    ))}
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
    if (hasDistributionChanges) changes.add('distribution');
    if (hasQualificationChanges) changes.add('qualification');  
    if (hasMotivesChanges) changes.add('motives');
    
    // ✅ INTELIGENTE: Só contar hasUnsavedChanges se não há mudanças específicas
    // Isso evita contagem dupla quando hasDistributionChanges já está ativo
    if (hasUnsavedChanges && changes.size === 0) {
      changes.add('general');
    }
    
    return changes.size;
  }, [hasUnsavedChanges, hasDistributionChanges, hasQualificationChanges, hasMotivesChanges]);

  // ✅ NOVO: Footer unificado with status à esquerda e botão à direita
  const renderFooter = () => {
    // ✅ DETERMINAR ESTADO E VISÃO GERAL MELHORADA
    const shouldShowButton = !pipeline || (pipeline && (hasUnsavedChanges || hasDistributionChanges || hasQualificationChanges || hasMotivesChanges));
    const timeSinceLastSave = lastSavedAt ? Math.floor((Date.now() - lastSavedAt.getTime()) / 1000) : null;
    
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
            ) : (hasUnsavedChanges || hasDistributionChanges || hasQualificationChanges || hasMotivesChanges) ? (
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
                type={pipeline ? "button" : "submit"}
                disabled={loading || isSaving || (!pipeline && !pipelineNameValidation.canSubmit)}
                className={`min-w-[140px] transition-all duration-200 ${
                  isSaving 
                    ? 'bg-blue-500 hover:bg-blue-600 scale-105' 
                    : (totalChanges > 0) 
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-lg' 
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={pipeline ? handleSaveChanges : () => {
                  console.log('🖱️ [Button] Clique explícito no botão Criar Pipeline');
                  setIsIntentionalSubmit(true);
                  setIsExplicitButtonClick(true);
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
  };

  // ✅ NOVO: Notificar o PipelineModal sobre o footer
  useEffect(() => {
    if (onFooterRender) {
      onFooterRender(renderFooter());
    }
  }, [
    onFooterRender,
    isSaving,
    hasUnsavedChanges,
    hasDistributionChanges,
    hasQualificationChanges,
    hasMotivesChanges,
    totalChanges, // ✅ CORREÇÃO: Incluir totalChanges nas dependências
    pipeline,
    loading,
    pipelineNameValidation.canSubmit,
    submitText,
    lastSavedAt // ✅ CORREÇÃO: Incluir lastSavedAt para atualizações de tempo
  ]);

  return (
    <>
      {/* Conteúdo Principal com Scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-4">
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
            <MotivesManager
              pipelineId={pipeline?.id}
              outcomeReasons={formData.outcome_reasons || { won: [], lost: [] }}
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
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
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