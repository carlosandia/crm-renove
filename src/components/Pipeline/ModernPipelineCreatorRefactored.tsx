import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// ✅ NOVA ABA: Componente Email existente
import EmailComposeModal from '../Leads/EmailComposeModal';

// ✅ NOVA ABA: API de integração email
import { emailIntegrationApi } from '../../services/emailIntegrationApi';

// Icons
import { 
  Settings, 
  Target, 
  Sliders, 
  Zap, 
  Save,
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
  Mail,
  Send,
  MessageCircle,
  FileText,
  Eye,
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cacheManager = useIntelligentCache(true); // Debug mode ativo
  
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

  // ✅ NOVA ABA EMAIL: Estados para funcionalidade de email
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [loadingEmailHistory, setLoadingEmailHistory] = useState(false);
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string>('');

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

  // Callbacks para mudanças que marcam o formulário como dirty
  const handleStagesChange = useCallback((customStages: PipelineStage[]) => {
    console.log('🔄 [handleStagesChange] Recebido:', {
      customStagesCount: customStages.length,
      isEditMode: !!pipeline?.id,
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
      console.log('🆕 [handleStagesChange] Marcando mudança como ação de stage');
    }
  }, [pipeline?.id, markFormDirty]);

  const handleFieldsUpdate = useCallback((custom_fields: LocalCustomField[]) => {
    console.log('🔄 [handleFieldsUpdate] Atualizando campos:', {
      fieldsCount: custom_fields.length,
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
        // ✅ CORREÇÃO: Usar valores capturados para comparação precisa
        const changeType = currentCount > previousCount ? 'adição' : 'exclusão';
        console.log('🔄 [PipelineCreator] Cadências:', {
          count: currentCount,
          change: changeType,
          diff: Math.abs(currentCount - previousCount)
        });
      }, 2000); // Aumentado de 1s para 2s
      
      // ✅ CRÍTICO: Atualizar referência APÓS capturar os valores para comparação
      lastCadenceCountRef.current = currentCount;
    }
    
    setFormData(prev => ({ ...prev, cadence_configs }));
    if (pipeline?.id) markFormDirty();
  }, [pipeline?.id, markFormDirty]);

  const handleDistributionRuleChange = useCallback((distribution_rule: DistributionRule, isNavChange = false) => {
    console.log('🔄 [handleDistributionRuleChange] Atualizando distribuição', { isNavChange });
    
    // ✅ CRÍTICO: Definir flag de navegação antes de qualquer operação
    setIsNavigationChange(isNavChange);
    setFormData(prev => ({ ...prev, distribution_rule }));
    
    // ✅ CORREÇÃO CRÍTICA: Só marcar como dirty se não for mudança de navegação e não estiver inicializando
    const isDistributionInitializing = distributionManagerRef.current?.isInitializing;
    if (pipeline?.id && !isDistributionInitializing && !isNavChange) {
      markFormDirty();
      // ✅ NOVO: Marcar que há mudanças de distribuição
      setHasDistributionChanges(true);
      console.log('📝 [handleDistributionRuleChange] Formulário e distribuição marcados como modificados');
    } else if (isDistributionInitializing) {
      console.log('🔇 [handleDistributionRuleChange] Mudança durante inicialização do distributionManager (ignorada)');
    } else if (isNavChange) {
      console.log('🔇 [handleDistributionRuleChange] Mudança de navegação entre modos (ignorada)');
    }
    
    // ✅ CRÍTICO: Reset da flag após um breve delay para evitar submits automáticos
    if (isNavChange) {
      setTimeout(() => {
        setIsNavigationChange(false);
        console.log('🔄 [handleDistributionRuleChange] Flag de navegação resetada');
      }, 100);
    }
  }, [pipeline?.id, markFormDirty]);

  const handleTemperatureConfigChange = useCallback((temperature_config: TemperatureConfig) => {
    console.log('🌡️ [handleTemperatureConfigChange] Recebido:', temperature_config);
    setFormData(prev => ({ ...prev, temperature_config }));
    if (pipeline?.id) markFormDirty();
  }, [pipeline?.id, markFormDirty]);

  const handleQualificationChange = useCallback((qualification_rules: QualificationRules) => {
    console.log('🔄 [handleQualificationChange] Atualizando qualificação');
    setFormData(prev => ({ ...prev, qualification_rules }));
    
    // ✅ CORREÇÃO CRÍTICA: Usar flag específica ao invés de markFormDirty para evitar fechamento do modal
    if (pipeline?.id) {
      setHasQualificationChanges(true);
      console.log('📝 [handleQualificationChange] Qualificação marcada como modificada (sem fechar modal)');
    }
  }, [pipeline?.id]);

  const handleMotivesChange = useCallback((outcome_reasons: OutcomeReasons) => {
    console.log('🔄 [handleMotivesChange] Atualizando motivos');
    setFormData(prev => ({ ...prev, outcome_reasons }));
    setHasMotivesChanges(true); // ✅ NOVO: Flag específica para motivos
    if (pipeline?.id) markFormDirty();
  }, [pipeline?.id, markFormDirty]);

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
      console.log('💾 [handleSaveAndClose] Salvando mudanças antes de fechar');
      
      await onSubmit(formData, false);
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
    
    try {
      setLoading(true);
      setIsSaving(true);
      console.log('💾 [handleSaveChanges] Salvando mudanças em modo edição - MODAL PERMANECE ABERTO');
      
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
      if (hasMotivesChanges && formData.outcome_reasons) {
        console.log('🔄 [handleSaveChanges] Salvando motivos de ganho/perda...');
        await saveOutcomeReasons(pipeline.id, formData.outcome_reasons);
        setHasMotivesChanges(false); // ✅ CORREÇÃO: Limpar flag após salvar
        console.log('✅ [handleSaveChanges] Motivos salvos');
      }
      
      // ✅ CORREÇÃO: Receber pipeline atualizada do onSubmit 
      const updatedPipeline = await onSubmit(formData, false);
      
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
      showSuccessToast('Alterações salvas', 'Pipeline atualizada com sucesso. Modal permanece aberto para edições adicionais.');
      
      console.log('✅ [handleSaveChanges] Cache invalidado, dados atualizados e MODAL MANTIDO ABERTO');
      
      // ❌ CORREÇÃO PRINCIPAL: REMOVIDO onCancel() - modal permanece aberto
      // onCancel(); ← Esta linha causava o fechamento automático
      
    } catch (error) {
      console.error('❌ [handleSaveChanges] Erro ao salvar:', error);
      showErrorToast('Erro ao salvar', 'Não foi possível salvar as mudanças');
    } finally {
      setLoading(false);
      setIsSaving(false);
    }
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
        
        // ✅ NOVA ABA EMAIL: Carregar histórico de emails
        await loadEmailHistory(pipeline.id);

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

  // ✅ NOVA ABA EMAIL: Função para carregar histórico de emails
  const loadEmailHistory = async (pipelineId?: string) => {
    if (!pipelineId) return;
    
    setLoadingEmailHistory(true);
    try {
      console.log('📧 [loadEmailHistory] Carregando histórico...');
      const response = await emailIntegrationApi.getEmailHistory({ 
        pipeline_id: pipelineId, 
        limit: 10 
      });
      
      if (response.success && response.data) {
        setEmailHistory(response.data);
        console.log('✅ [loadEmailHistory] Histórico carregado:', response.data.length);
      }
    } catch (error) {
      console.warn('⚠️ [loadEmailHistory] Erro ao carregar histórico:', error);
    } finally {
      setLoadingEmailHistory(false);
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
      await cacheManager.handleMotivesSave(user?.tenant_id || '', pipelineId);

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

  // ✅ NOVA ABA EMAIL: Render da aba de email
  const renderEmailTab = () => {
    // Templates de email padrão do mercado
    const emailTemplates = [
      {
        id: 'follow-up',
        name: 'Follow-up',
        icon: MessageCircle,
        description: 'Dar seguimento ao contato',
        subject: 'Seguimento da nossa conversa',
        preview: 'Olá! Gostaria de dar seguimento...'
      },
      {
        id: 'proposal',
        name: 'Proposta Comercial',
        icon: FileText,
        description: 'Enviar proposta personalizada',
        subject: 'Proposta Comercial - {{empresa}}',
        preview: 'Prezado(a) {{nome}}, segue nossa proposta...'
      },
      {
        id: 'thank-you',
        name: 'Agradecimento',
        icon: Send,
        description: 'Agradecer pelo tempo dedicado',
        subject: 'Obrigado pelo seu tempo',
        preview: 'Obrigado pela atenção dedicada...'
      }
    ];

    return (
      <BlurFade delay={0.1} inView>
        <div className="space-y-6">
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Comunicação por Email
              </CardTitle>
              <CardDescription>
                Configurações e templates para comunicação automatizada via email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Header da aba */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Templates de Email</h3>
                      <p className="text-sm text-gray-600">Escolha um template ou crie seu próprio email</p>
                    </div>
                  </div>
                  <PulsatingButton
                    onClick={() => setEmailModalOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                    pulseColor="rgba(59, 130, 246, 0.5)"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Novo Email
                  </PulsatingButton>
                </div>

                {/* Templates rápidos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {emailTemplates.map((template) => {
                    const IconComponent = template.icon;
                    return (
                      <div
                        key={template.id}
                        className="group relative overflow-hidden border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 rounded-lg p-4 cursor-pointer"
                        onClick={() => {
                          setSelectedEmailTemplate(template.id);
                          setEmailModalOpen(true);
                        }}
                      >
                        <BorderBeam 
                          size={60} 
                          duration={12} 
                          delay={template.id === 'follow-up' ? 0 : template.id === 'proposal' ? 4 : 8}
                          colorFrom="rgba(59, 130, 246, 0.3)"
                          colorTo="rgba(147, 51, 234, 0.3)"
                        />
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <IconComponent className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                              {template.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {template.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-2 truncate">
                              "{template.preview}"
                            </p>
                          </div>
                        </div>
                        
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300 -skew-x-12 transform translate-x-full group-hover:translate-x-[-100%]" />
                      </div>
                    );
                  })}
                </div>

                {/* Histórico de emails */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Histórico de Emails
                    </h4>
                    {loadingEmailHistory && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    {loadingEmailHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-500">Carregando histórico...</span>
                      </div>
                    ) : emailHistory.length > 0 ? (
                      <div className="space-y-3">
                        {emailHistory.map((email, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{email.subject}</p>
                              <p className="text-sm text-gray-500">Para: {email.to}</p>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(email.sent_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 mb-2">Nenhum email enviado ainda</p>
                        <p className="text-sm text-gray-400">
                          Os emails enviados através desta pipeline aparecerão aqui
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estatísticas rápidas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Emails Enviados</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                      <NumberTicker value={emailHistory.length} />
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Taxa de Sucesso</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700 mt-1">
                      <NumberTicker value={emailHistory.length > 0 ? 100 : 0} />%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </div>
      </BlurFade>
    );
  };

  // Render da aba básico
  const renderBasicTab = () => (
    <BlurFade delay={0.1} inView>
      <div className="space-y-6">
        <AnimatedCard>
          <CardHeader>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pipeline-name">Nome da Pipeline *</Label>
              <Input
                id="pipeline-name"
                value={pipelineNameValidation.name}
                onChange={(e) => {
                  pipelineNameValidation.updateName(e.target.value);
                  handleNameChange(e.target.value);
                }}
                onBlur={pipelineNameValidation.validateImmediately}
                placeholder="Ex: Vendas B2B, Leads Qualificados..."
                className={`mt-1 ${
                  pipelineNameValidation.hasError ? 'border-red-500' : 
                  pipelineNameValidation.isValid ? 'border-green-500' : ''
                }`}
              />
              {pipelineNameValidation.hasError && (
                <p className="text-sm text-red-600 mt-1">Nome inválido ou já existe</p>
              )}
              {pipelineNameValidation.isValid && (
                <p className="text-sm text-green-600 mt-1">Nome disponível</p>
              )}
            </div>

            <div>
              <Label htmlFor="pipeline-description">Descrição</Label>
              <Textarea
                id="pipeline-description"
                value={formData.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Descreva o propósito e funcionamento do pipeline..."
                rows={3}
              />
            </div>

            <div>
              <Label>Vendedores Vinculados *</Label>
              {members.length === 0 ? (
                <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Nenhum vendedor encontrado</span>
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    Cadastre vendedores no módulo "Vendedores" para vinculá-los às pipelines.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={formData.member_ids.includes(member.id)}
                        onCheckedChange={() => handleMemberToggle(member.id)}
                      />
                      <Label htmlFor={`member-${member.id}`} className="text-sm">
                        {member.first_name} {member.last_name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </AnimatedCard>
      </div>
    </BlurFade>
  );

  // ✅ NOVO: Footer unificado com status à esquerda e botão à direita
  const renderFooter = () => {
    // ✅ NOVO: Determinar se deve mostrar botão (criação OU edição com alterações)
    const shouldShowButton = !pipeline || (pipeline && (hasUnsavedChanges || hasDistributionChanges || hasQualificationChanges || hasMotivesChanges));
    
    return (
      <div className="p-6 bg-gray-50/50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          {/* LADO ESQUERDO: Status */}
          <div className="flex items-center gap-2 text-sm">
            {isSaving ? (
              <div className="text-blue-600 dark:text-blue-400 flex items-center gap-2 animate-pulse">
                <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <span>Salvando alterações...</span>
              </div>
            ) : (hasUnsavedChanges || hasDistributionChanges || hasQualificationChanges || hasMotivesChanges) ? (
              <div className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Você tem alterações não salvas</span>
              </div>
            ) : pipeline ? (
              <div className="text-green-600 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>
                  Todas as alterações foram salvas
                  {lastSavedAt && (
                    <span className="text-green-500/70 ml-2">
                      • há {Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)}s
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <div className="text-gray-600 flex items-center gap-2">
                <span>Preencha os campos para criar a pipeline</span>
              </div>
            )}
          </div>
          
          {/* LADO DIREITO: Botão de Ação */}
          {shouldShowButton && (
            <Button
              type={pipeline ? "button" : "submit"}
              disabled={loading || isSaving || (!pipeline && !pipelineNameValidation.canSubmit)}
              className="min-w-[120px]"
              onClick={pipeline ? handleSaveChanges : () => {
                console.log('🖱️ [Button] Clique explícito no botão Criar Pipeline');
                setIsIntentionalSubmit(true);
                setIsExplicitButtonClick(true);
              }}
            >
              {(loading || isSaving) ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  {pipeline ? 'Salvando...' : 'Criando...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {pipeline ? 'Salvar Alterações' : submitText}
                </div>
              )}
            </Button>
          )}
        </div>
        
        {/* ✅ DICA: Apenas para modo edição */}
        {pipeline && !hasUnsavedChanges && lastSavedAt && (
          <div className="flex items-center justify-center pt-2">
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              💡 Modal permanece aberto para edições adicionais
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
    pipeline,
    loading,
    pipelineNameValidation.canSubmit,
    submitText
  ]);

  return (
    <>
      {/* Conteúdo Principal com Scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-4">
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="stages" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Etapas
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Campos
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Distribuição
            </TabsTrigger>
            <TabsTrigger value="cadence" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Cadência
              {savingActivities && (
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin ml-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="qualification" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Qualificação
            </TabsTrigger>
            <TabsTrigger value="motives" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Motivos
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              E-mail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            {renderBasicTab()}
          </TabsContent>

          <TabsContent value="stages">
            <StageManagerRender stageManager={stageManager} />
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
          
          <TabsContent value="email">
            {renderEmailTab()}
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

      {/* ✅ NOVA ABA EMAIL: Modal de composição de email */}
      {pipeline && (
        <EmailComposeModal
          isOpen={emailModalOpen}
          onClose={() => {
            setEmailModalOpen(false);
            setSelectedEmailTemplate('');
            // Recarregar histórico após envio
            loadEmailHistory(pipeline.id);
          }}
          lead={{
            id: pipeline.id,
            custom_data: {
              nome_lead: pipeline.name || 'Pipeline',
              email_lead: 'contato@pipeline.com',
              empresa: pipeline.name || 'Empresa',
              nome_empresa: pipeline.name || 'Empresa'
            }
          } as any}
          selectedTemplate={selectedEmailTemplate}
        />
      )}
      
    </>
  );
};

export default ModernPipelineCreatorRefactored;