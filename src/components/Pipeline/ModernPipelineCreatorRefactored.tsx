import React, { useState, useEffect, useCallback } from 'react';
import { Pipeline, PipelineStage, CustomField } from '../../types/Pipeline';
import { User } from '../../types/User';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePipelineNameValidation } from '../../hooks/usePipelineNameValidation';
import { showErrorToast, showWarningToast } from '../../hooks/useToast';

// AIDEV-NOTE: Helper para logging consolidado - evita spam no console
const logPipelineError = (context: string, error: any, isCritical = false) => {
  if (process.env.NODE_ENV === 'development') {
    if (isCritical) {
      console.error(`❌ [PipelineCreator:${context}] Erro crítico:`, error.message || error);
    } else {
      console.warn(`⚠️ [PipelineCreator:${context}] Aviso (não crítico):`, error.message || error);
    }
  }
};

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';

// Magic UI components
import { AnimatedCard } from '../ui/animated-card';
import { BlurFade } from '../ui/blur-fade';
// ShimmerButton removido - usando Button padrão do shadcn/ui

// Subcomponentes especializados
import { useStageManager, StageManagerRender } from './stages/ImprovedStageManager';
import { useCustomFieldsManager, CustomFieldsManagerRender } from './fields';
import { useCadenceManager, CadenceManagerRender } from './cadence';
import { useLocalDistributionManager, DistributionManagerRender, DistributionRule } from './distribution';
import { useTemperatureConfig, TemperatureConfigRender } from './temperature';
// ✅ OUTCOME REASONS: Importar componente e hook
import OutcomeReasonsConfiguration from './configuration/OutcomeReasonsConfiguration';
import { useOutcomeReasonsManager } from '../../hooks/useOutcomeReasonsManager';
// ✅ QUALIFICATION: Importar componente de qualificação
import QualificationRulesManager from './configuration/QualificationRulesManager';

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
} from 'lucide-react';

// Shared components
import { SectionHeader } from './shared/SectionHeader';

// Constants
import { PIPELINE_UI_CONSTANTS } from '../../styles/pipeline-constants';

// Interfaces
interface CustomField {
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

interface DistributionRule {
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
  custom_fields: CustomField[];
  cadence_configs: CadenceConfig[];
  distribution_rule?: DistributionRule;
  temperature_config?: TemperatureConfig;
  outcome_reasons?: {
    won_reasons: Array<{ reason_text: string; display_order: number; }>;
    lost_reasons: Array<{ reason_text: string; display_order: number; }>;
  };
  qualification_rules?: {
    mql: Array<{ name: string; conditions: any[]; is_active: boolean; }>;
    sql: Array<{ name: string; conditions: any[]; is_active: boolean; }>;
  };
}

interface ModernPipelineCreatorProps {
  members: User[];
  pipeline?: Pipeline;
  onSubmit: (data: PipelineFormData, shouldRedirect?: boolean) => void;
  onCancel: () => void;
  title: string;
  submitText: string;
  onDuplicatePipeline?: () => Promise<void>;
  onArchivePipeline?: () => Promise<void>;
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
}) => {
  const { user } = useAuth();
  
  // ✅ CORREÇÃO 3: Hook de validação de nome único
  // Para edição, não passar nome inicial para evitar validação automática
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
    outcome_reasons: {
      won_reasons: [],
      lost_reasons: []
    },
    qualification_rules: {
      mql: [],
      sql: []
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [isIntentionalSubmit, setIsIntentionalSubmit] = useState(false);
  const [isExplicitButtonClick, setIsExplicitButtonClick] = useState(false);

  // ✅ CORREÇÃO CRÍTICA: Callback com debounce para evitar múltiplas chamadas
  const handleStagesChangeDebounced = React.useRef<NodeJS.Timeout | null>(null);
  
  const handleStagesChange = React.useCallback((customStages: PipelineStage[]) => {
    console.log('🔄 [handleStagesChange] Recebido:', {
      customStagesCount: customStages.length,
      customStages: customStages.map((s: PipelineStage) => ({ name: s.name, order: s.order_index })),
      isEditMode: !!pipeline?.id,
      pipelineId: pipeline?.id
    });
    
    // ✅ CORREÇÃO CRÍTICA: No modo criação, não atualizar formData para evitar disparo de useEffects
    // As etapas serão aplicadas apenas no submit manual
    if (!pipeline?.id) {
      console.log('⚠️ [handleStagesChange] BLOQUEADO: Não atualizar formData em modo criação:', {
        pipelineId: pipeline?.id,
        isCreationMode: !pipeline?.id,
        customStagesCount: customStages.length,
        reason: 'Evitar disparo de auto-save durante criação'
      });
      return;
    }
    
    // Limpar timeout anterior
    if (handleStagesChangeDebounced.current) {
      clearTimeout(handleStagesChangeDebounced.current);
    }
    
    // ✅ CORREÇÃO: Reduzir debounce para 100ms para melhor responsividade no drag
    handleStagesChangeDebounced.current = setTimeout(() => {
      console.log('🔄 [handleStagesChange] Executando callback debounced (edit mode)...', {
        isEditMode: !!pipeline?.id,
        pipelineId: pipeline?.id
      });
      
      setFormData(prev => {
        const systemStages = prev.stages.filter(stage => stage.is_system_stage);
        const allStages = [...systemStages, ...customStages];
        
        console.log('🔄 [handleStagesChange] Atualizando formData.stages (edit mode):', {
          prevStagesCount: prev.stages.length,
          systemStagesCount: systemStages.length,
          customStagesCount: customStages.length,
          totalStages: allStages.length,
          allStages: allStages.map(s => ({ name: s.name, order: s.order_index, isSystem: s.is_system_stage }))
        });
        
        return { ...prev, stages: allStages };
      });
      
      console.log('✅ [handleStagesChange] FormData atualizado, auto-save será executado (edit mode)');
    }, 100); // Reduzido de 500ms para 100ms
  }, [pipeline?.id]);

  // ✅ CORREÇÃO CRÍTICA: Memoizar initialStages para evitar loop infinito
  const initialCustomStages = React.useMemo(() => {
    console.log('🔍 [ModernPipelineCreatorRefactored] Calculando initialCustomStages:', {
      totalStages: formData.stages?.length || 0,
      allStages: formData.stages?.map(s => ({ name: s.name, isSystem: s.is_system_stage })) || [],
      customStages: formData.stages?.filter(stage => !stage.is_system_stage)?.length || 0
    });
    return formData.stages.filter(stage => !stage.is_system_stage);
  }, [formData.stages]);
  
  // ✅ CLEANUP: Limpar timeout quando componente desmontar
  React.useEffect(() => {
    return () => {
      if (handleStagesChangeDebounced.current) {
        clearTimeout(handleStagesChangeDebounced.current);
      }
    };
  }, []);

  // Inicializar managers especializados
  const stageManager = useStageManager({
    initialStages: initialCustomStages,
    onStagesChange: handleStagesChange
  });

  // ✅ CORREÇÃO CRÍTICA: Callback para atualização de campos que bloqueia em modo criação
  const handleFieldsUpdate = useCallback((custom_fields: CustomField[]) => {
    // ✅ CORREÇÃO: No modo criação, não atualizar formData para evitar disparo de useEffects
    if (!pipeline?.id) {
      console.log('⚠️ [handleFieldsUpdate] BLOQUEADO: Não atualizar formData em modo criação:', {
        pipelineId: pipeline?.id,
        isCreationMode: !pipeline?.id,
        fieldsCount: custom_fields.length,
        reason: 'Evitar disparo de auto-save durante criação'
      });
      return;
    }
    
    console.log('🔄 [handleFieldsUpdate] Atualizando campos em modo edição:', {
      pipelineId: pipeline?.id,
      fieldsCount: custom_fields.length
    });
    
    setFormData(prev => ({ ...prev, custom_fields }));
  }, [pipeline?.id]);

  const fieldsManager = useCustomFieldsManager({
    customFields: formData.custom_fields,
    onFieldsUpdate: handleFieldsUpdate
  });

  // ✅ CORREÇÃO CRÍTICA: Callback para cadências que bloqueia em modo criação
  const handleCadencesChange = useCallback((cadence_configs: any[]) => {
    // ✅ CORREÇÃO: No modo criação, não atualizar formData para evitar disparo de useEffects
    if (!pipeline?.id) {
      console.log('⚠️ [handleCadencesChange] BLOQUEADO: Não atualizar formData em modo criação:', {
        pipelineId: pipeline?.id,
        isCreationMode: !pipeline?.id,
        cadencesCount: cadence_configs.length,
        reason: 'Evitar disparo de auto-save durante criação'
      });
      return;
    }
    
    console.log('🔄 [handleCadencesChange] Atualizando cadências em modo edição:', {
      pipelineId: pipeline?.id,
      cadencesCount: cadence_configs.length
    });
    
    setFormData(prev => ({ ...prev, cadence_configs }));
  }, [pipeline?.id]);

  const cadenceManager = useCadenceManager({
    initialCadences: formData.cadence_configs,
    availableStages: stageManager.stages,
    onCadencesChange: handleCadencesChange
  });

  // ✅ CORREÇÃO CRÍTICA: Callback para distribuição que bloqueia em modo criação
  const handleDistributionRuleChange = useCallback((distribution_rule: DistributionRule) => {
    // ✅ CORREÇÃO: No modo criação, não atualizar formData para evitar disparo de useEffects
    if (!pipeline?.id) {
      console.log('⚠️ [handleDistributionRuleChange] BLOQUEADO: Não atualizar formData em modo criação:', {
        pipelineId: pipeline?.id,
        isCreationMode: !pipeline?.id,
        distributionRule: distribution_rule,
        reason: 'Evitar disparo de auto-save durante criação'
      });
      return;
    }
    
    console.log('🔄 [handleDistributionRuleChange] Atualizando distribuição em modo edição:', {
      pipelineId: pipeline?.id,
      distributionRule: distribution_rule
    });
    
    setFormData(prev => ({ ...prev, distribution_rule }));
  }, [pipeline?.id]);

  const distributionManager = useLocalDistributionManager({
    pipelineId: pipeline?.id || '',
    onRuleChange: handleDistributionRuleChange
  });

  // Callback para mudanças de temperatura
  const handleTemperatureConfigChange = useCallback((temperature_config: TemperatureConfig) => {
    console.log('🌡️ [handleTemperatureConfigChange] Recebido:', {
      temperature_config,
      isEditMode: !!pipeline?.id,
      pipelineId: pipeline?.id
    });
    
    // ✅ CORREÇÃO: Só atualizar formData se estivermos em modo edição
    // Durante criação, temperatura é apenas local e não deve disparar auto-save
    if (pipeline?.id) {
      console.log('✅ [handleTemperatureConfigChange] Modo edição: atualizando formData');
      setFormData(prev => ({ ...prev, temperature_config }));
    } else {
      console.log('⚠️ [handleTemperatureConfigChange] Modo criação: ignorando atualização para evitar auto-save indevido');
      // Em modo criação, não atualizar formData para evitar auto-save
      // A configuração será aplicada quando o usuário clicar em "Criar Pipeline"
    }
  }, [pipeline?.id]);

  const temperatureManager = useTemperatureConfig({
    pipelineId: pipeline?.id,
    tenantId: user?.tenant_id,
    initialConfig: formData.temperature_config,
    onConfigChange: handleTemperatureConfigChange
  });

  // ✅ OUTCOME REASONS: Memoizar initialData para evitar re-criação
  const initialOutcomeData = React.useMemo(() => {
    if (!formData.outcome_reasons) return undefined;
    
    return {
      won_reasons: formData.outcome_reasons.won_reasons.map((reason, index) => ({
        reason_text: reason.reason_text,
        display_order: reason.display_order,
        is_active: true
      })),
      lost_reasons: formData.outcome_reasons.lost_reasons.map((reason, index) => ({
        reason_text: reason.reason_text,
        display_order: reason.display_order,
        is_active: true
      }))
    };
  }, [formData.outcome_reasons]);

  // ✅ OUTCOME REASONS: Manager para motivos de ganho/perda
  const outcomeReasonsManager = useOutcomeReasonsManager({
    initialData: initialOutcomeData,
    pipelineId: pipeline?.id
  });

  // ✅ QUALIFICATION: Callback para mudanças nas regras de qualificação
  const handleQualificationRulesChange = useCallback((qualification_rules: any) => {
    // ✅ CORREÇÃO: No modo criação, não atualizar formData para evitar disparo de useEffects
    if (!pipeline?.id) {
      console.log('⚠️ [handleQualificationRulesChange] BLOQUEADO: Não atualizar formData em modo criação:', {
        pipelineId: pipeline?.id,
        isCreationMode: !pipeline?.id,
        rulesCount: (qualification_rules.mql?.length || 0) + (qualification_rules.sql?.length || 0),
        reason: 'Evitar disparo de auto-save durante criação'
      });
      return;
    }
    
    console.log('🔄 [handleQualificationRulesChange] Atualizando regras de qualificação em modo edição:', {
      pipelineId: pipeline?.id,
      mqlRules: qualification_rules.mql?.length || 0,
      sqlRules: qualification_rules.sql?.length || 0
    });
    
    setFormData(prev => ({ ...prev, qualification_rules }));
  }, [pipeline?.id]);
  
  // ✅ CORREÇÃO: Função para aplicar configuração de temperatura no submit manual
  const applyTemperatureConfigOnSubmit = useCallback(() => {
    if (!pipeline?.id && temperatureManager.temperatureConfig) {
      console.log('🌡️ [applyTemperatureConfigOnSubmit] Aplicando configuração de temperatura no submit manual:', temperatureManager.temperatureConfig);
      setFormData(prev => ({ 
        ...prev, 
        temperature_config: temperatureManager.temperatureConfig 
      }));
    }
  }, [pipeline?.id, temperatureManager.temperatureConfig]);

  // ✅ CORREÇÃO CRÍTICA: Auto-salvamento quando etapas são modificadas (APENAS NA EDIÇÃO)
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // ✅ CORREÇÃO: Usar referência estabilizada para stages para evitar useEffect indevido
  const stagesRef = React.useRef(formData.stages);
  const stagesStringified = JSON.stringify(formData.stages?.map(s => ({ name: s.name, order: s.order_index, isSystem: s.is_system_stage })) || []);
  
  React.useEffect(() => {
    // ✅ CORREÇÃO CRÍTICA: Só executar se stages realmente mudaram, não apenas formData
    const currentStagesStringified = JSON.stringify(formData.stages?.map(s => ({ name: s.name, order: s.order_index, isSystem: s.is_system_stage })) || []);
    const previousStagesStringified = JSON.stringify(stagesRef.current?.map(s => ({ name: s.name, order: s.order_index, isSystem: s.is_system_stage })) || []);
    
    if (currentStagesStringified === previousStagesStringified) {
      return;
    }
    
    stagesRef.current = formData.stages;
    
    // ============================================
    // OTIMIZADO: Logs removidos para evitar HMR excessivo
    // ============================================
    
    // ✅ CORREÇÃO CRÍTICA: Auto-save APENAS para edição (quando pipeline.id existe)
    // Na criação (pipeline === undefined), não deve haver auto-save
    if (!pipeline?.id) {
      return;
    }
    
    // Só auto-salvar se há etapas para salvar
    if (!formData.stages?.length) {
      return;
    }
    
    const customStages = formData.stages.filter(stage => !stage.is_system_stage);
    
    // Só auto-salvar se há etapas customizadas
    if (customStages.length === 0) {
      return;
    }
    
    // Auto-save timer iniciado
    
    // Limpar timeout anterior
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // ✅ CORREÇÃO: Reduzir tempo de auto-save para 500ms para melhor responsividade no drag
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        // Auto-save de etapas em execução
        await onSubmit(formData, false, { isUpdate: true });
        // Auto-salvamento de etapas concluído
      } catch (error) {
        // AIDEV-NOTE: Silenciar erro de auto-salvamento para evitar spam no console
        // O erro não afeta a funcionalidade principal
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Auto-salvamento falhou (não crítico):', error.message);
        }
      }
    }, 500);
    
    // Cleanup do timeout
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [stagesStringified, pipeline?.id, onSubmit]);

  // ✅ CORREÇÃO CRÍTICA: Auto-salvamento quando campos customizados são modificados (APENAS NA EDIÇÃO)
  const customFieldsRef = React.useRef(formData.custom_fields);
  const customFieldsStringified = JSON.stringify(formData.custom_fields?.map(f => ({ name: f.field_name, label: f.field_label, type: f.field_type, required: f.is_required })) || []);
  
  React.useEffect(() => {
    // ✅ CORREÇÃO CRÍTICA: Só executar se campos realmente mudaram, não apenas formData
    const currentFieldsStringified = JSON.stringify(formData.custom_fields?.map(f => ({ name: f.field_name, label: f.field_label, type: f.field_type, required: f.is_required })) || []);
    const previousFieldsStringified = JSON.stringify(customFieldsRef.current?.map(f => ({ name: f.field_name, label: f.field_label, type: f.field_type, required: f.is_required })) || []);
    
    if (currentFieldsStringified === previousFieldsStringified) {
      console.log('⚪ [Auto-save Fields] Campos não mudaram, ignorando useEffect');
      return;
    }
    
    customFieldsRef.current = formData.custom_fields;
    
    console.log('🔍 [Auto-save Fields] Executando useEffect - campos realmente mudaram:', {
      pipelineId: pipeline?.id,
      isEditMode: !!pipeline?.id,
      customFieldsLength: formData.custom_fields?.length || 0
    });
    
    // ✅ CORREÇÃO CRÍTICA: Auto-save APENAS para edição (quando pipeline.id existe)
    // Na criação (pipeline === undefined), não deve haver auto-save
    if (!pipeline?.id) {
      console.log('⚠️ [Auto-save Fields] BLOQUEADO: modo criação (sem pipeline ID)', {
        pipelineId: pipeline?.id,
        isCreationMode: !pipeline?.id,
        reason: 'Auto-save de campos não permitido durante criação'
      });
      return;
    }
    
    // Só auto-salvar se há campos customizados para salvar
    if (!formData.custom_fields?.length) {
      console.log('⚠️ [Auto-save Fields] Cancelado: sem campos customizados', {
        pipelineId: pipeline?.id,
        fieldsLength: formData.custom_fields?.length
      });
      return;
    }
    
    // Filtrar apenas campos personalizados (não obrigatórios do sistema)
    const systemRequiredFields = ['nome_lead', 'email_lead', 'telefone_lead'];
    const customFields = formData.custom_fields.filter(field => 
      !systemRequiredFields.includes(field.field_name)
    );
    
    // Só auto-salvar se há campos customizados
    if (customFields.length === 0) {
      console.log('⚠️ [Auto-save Fields] Cancelado: sem campos customizados reais');
      return;
    }
    
    console.log('🔄 [Auto-save Fields] Iniciando auto-save timer...', {
      pipelineId: pipeline.id,
      customFieldsCount: customFields.length,
      fields: customFields.map(f => ({ name: f.field_name, label: f.field_label, type: f.field_type }))
    });
    
    // Limpar timeout anterior
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Auto-salvar após 3 segundos de inatividade (aumentado para reduzir conflitos)
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const autosaveOptions = { onlyCustomFields: true, isUpdate: true, isAutoSave: true };
        console.log('🔄 [Auto-save Fields] Executando auto-save de campos:', {
          pipelineId: pipeline.id,
          customFieldsCount: customFields.length,
          autosaveOptions,
          timestamp: new Date().toISOString()
        });
        
        await onSubmit(formData, false, autosaveOptions);
        console.log('✅ Auto-salvamento de campos customizados concluído!');
      } catch (error: any) {
        console.warn('⚠️ Erro no auto-salvamento de campos (não crítico):', error.message);
      }
    }, 3000);
    
    // Cleanup do timeout
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [customFieldsStringified, pipeline?.id, onSubmit]);

  // ✅ CORREÇÃO: Auto-salvamento de cadências desabilitado para evitar erro durante carregamento
  // O auto-save de cadências será feito apenas no submit manual
  // React.useEffect(() => {
  //   // Auto-save temporariamente desabilitado
  // }, [formData.cadence_configs, pipeline?.id, onSubmit]);

  const loadPipelineData = useCallback(async () => {
    if (!pipeline || !pipeline.id) {
      console.warn('⚠️ [loadPipelineData] Pipeline ou ID não fornecido:', { pipeline, id: pipeline?.id });
      return;
    }
    
    setLoading(true);
    try {
      // Carregando dados da pipeline: ${pipeline.id}
      
      // ✅ CARREGAR VENDEDORES VINCULADOS DA PIPELINE
      let memberIds: string[] = [];
      try {
        const { data: pipelineMembers, error: membersError } = await supabase
          .from('pipeline_members')
          .select('member_id')
          .eq('pipeline_id', pipeline.id);

        if (membersError) {
          console.warn('⚠️ [loadPipelineData] Erro ao carregar vendedores vinculados:', membersError);
        } else if (pipelineMembers) {
          memberIds = pipelineMembers.map(pm => pm.member_id);
          // Vendedores vinculados carregados
        }
      } catch (error) {
        logPipelineError('loadMembers', error, true);
      }

      setFormData(prev => ({
        ...prev,
        name: pipeline.name,
        description: pipeline.description || '',
        member_ids: memberIds
      }));

      // ✅ INICIALIZAR VALIDADOR COM NOME DA PIPELINE SEM VALIDAR
      pipelineNameValidation.initializeName(pipeline.name);

      // ✅ CORREÇÃO 5: Carregar etapas com tratamento de erro específico
      try {
        const { data: stages, error: stagesError } = await supabase
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', pipeline.id)
          .order('order_index');

        if (stagesError) {
          console.warn('⚠️ [loadPipelineData] Erro ao carregar etapas:', stagesError);
        } else if (stages) {
          const stageData = stages.map(stage => ({
            name: stage.name,
            color: stage.color,
            order_index: stage.order_index,
            is_system_stage: stage.is_system_stage || false
          }));
          
          // Etapas carregadas e setadas no formData
          
          setFormData(prev => ({ ...prev, stages: stageData }));
          // Etapas carregadas: ${stages.length}
        }
      } catch (error) {
        logPipelineError('loadStages', error, true);
      }

      // ✅ CORREÇÃO 5: Carregar campos customizados com tratamento de erro
      try {
        const { data: fields, error: fieldsError } = await supabase
          .from('pipeline_custom_fields')
          .select('*')
          .eq('pipeline_id', pipeline.id)
          .order('field_order');

        if (fieldsError) {
          console.warn('⚠️ [loadPipelineData] Erro ao carregar campos customizados:', fieldsError);
        } else if (fields) {
          setFormData(prev => ({ ...prev, custom_fields: fields }));
          // Campos customizados carregados: ${fields.length}
        }
      } catch (error) {
        logPipelineError('loadCustomFields', error, true);
      }

      // ✅ CORREÇÃO: Carregar cadências com tasks em JSONB
      try {
        const { data: cadences, error: cadencesError } = await supabase
          .from('cadence_configs')
          .select('*')
          .eq('pipeline_id', pipeline.id);

        if (cadencesError) {
          console.warn('⚠️ [loadPipelineData] Erro ao carregar cadências:', cadencesError);
          setFormData(prev => ({ ...prev, cadence_configs: [] }));
        } else if (cadences && cadences.length > 0) {
          const cadenceData = cadences.map(cadence => ({
            id: cadence.id,
            stage_name: cadence.stage_name,
            stage_order: cadence.stage_order,
            tasks: Array.isArray(cadence.tasks) ? cadence.tasks : (typeof cadence.tasks === 'string' && cadence.tasks !== '[]' ? JSON.parse(cadence.tasks) : []),
            is_active: cadence.is_active
          }));
          
          setFormData(prev => ({ ...prev, cadence_configs: cadenceData }));
          console.log('✅ [loadPipelineData] Cadências carregadas:', {
            count: cadences.length,
            cadences: cadenceData.map(c => ({ stage: c.stage_name, tasks: c.tasks.length, active: c.is_active }))
          });
        } else {
          setFormData(prev => ({ ...prev, cadence_configs: [] }));
          console.log('ℹ️ [loadPipelineData] Nenhuma cadência encontrada');
        }
      } catch (error) {
        logPipelineError('loadCadences', error, true);
        setFormData(prev => ({ ...prev, cadence_configs: [] }));
      }

      // ✅ QUALIFICATION: Carregar regras de qualificação existentes
      try {
        if (pipeline.qualification_rules) {
          const qualificationRules = typeof pipeline.qualification_rules === 'string' 
            ? JSON.parse(pipeline.qualification_rules) 
            : pipeline.qualification_rules;
          
          setFormData(prev => ({ ...prev, qualification_rules: qualificationRules }));
          console.log('✅ [loadPipelineData] Regras de qualificação carregadas:', {
            mqlRules: qualificationRules.mql?.length || 0,
            sqlRules: qualificationRules.sql?.length || 0
          });
        } else {
          setFormData(prev => ({ 
            ...prev, 
            qualification_rules: { mql: [], sql: [] }
          }));
          console.log('ℹ️ [loadPipelineData] Nenhuma regra de qualificação encontrada');
        }
      } catch (error) {
        logPipelineError('loadQualificationRules', error, false);
        setFormData(prev => ({ 
          ...prev, 
          qualification_rules: { mql: [], sql: [] }
        }));
      }

      // Carregamento concluído da pipeline

    } catch (error) {
      logPipelineError('loadPipelineData', error, true);
      showErrorToast(
        'Erro ao carregar dados',
        'Erro ao carregar dados da pipeline. Alguns dados podem não estar disponíveis.'
      );
    } finally {
      setLoading(false);
    }
  }, [pipeline]);

  // ✅ CORREÇÃO: useEffect para carregar dados quando pipeline é fornecida
  useEffect(() => {
    // ✅ CORREÇÃO CRÍTICA: Aguardar um tick para garantir que pipeline foi definida
    const timer = setTimeout(() => {
      if (pipeline && pipeline.id) {
        // Carregando dados da pipeline para edição
        loadPipelineData();
      } else if (pipeline === null) {
        // Modo criação: resetando formulário
        // Reset form para modo criação
        setFormData({
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
          qualification_rules: {
            mql: [],
            sql: []
          }
        });
      } else {
        // Aguardando pipeline ser definida
      }
    }, 100); // Aguardar 100ms para pipeline ser definida

    return () => clearTimeout(timer);
  }, [pipeline, loadPipelineData]);

  const validateForm = () => {
    console.log('🔍 [validateForm] Validando formulário:', {
      canSubmit: pipelineNameValidation.canSubmit,
      isNameEmpty: pipelineNameValidation.isNameEmpty,
      hasError: pipelineNameValidation.hasError,
      isValidating: pipelineNameValidation.isValidating,
      name: pipelineNameValidation.name,
      formDataName: formData.name,
      error: pipelineNameValidation.error,
      memberIds: formData.member_ids?.length || 0
    });

    // ✅ CORREÇÃO 3: Usar validação de nome integrada
    if (!pipelineNameValidation.canSubmit) {
      if (pipelineNameValidation.isNameEmpty) {
        console.log('❌ [validateForm] Nome vazio');
        showWarningToast('Campo obrigatório', 'Nome do pipeline é obrigatório');
      } else if (pipelineNameValidation.hasError) {
        console.log('❌ [validateForm] Erro na validação:', pipelineNameValidation.error);
        showErrorToast('Nome inválido', pipelineNameValidation.error || 'Nome do pipeline inválido');
      } else if (pipelineNameValidation.isValidating) {
        console.log('❌ [validateForm] Ainda validando');
        showWarningToast('Validação em andamento', 'Aguarde a validação do nome ser concluída');
      } else {
        console.log('❌ [validateForm] Motivo desconhecido canSubmit=false');
        showErrorToast('Nome inválido', 'Nome do pipeline inválido');
      }
      return false;
    }
    
    if (formData.member_ids.length === 0) {
      showWarningToast('Seleção obrigatória', 'Selecione pelo menos um vendedor');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 [handleSubmit] Iniciando submit do formulário:', {
      isIntentionalSubmit,
      isExplicitButtonClick,
      isCreationMode: !pipeline?.id,
      formData: {
        name: formData.name,
        memberIds: formData.member_ids?.length || 0,
        stagesCount: formData.stages?.length || 0,
        fieldsCount: formData.custom_fields?.length || 0,
        cadencesCount: formData.cadence_configs?.length || 0
      }
    });
    
    // ✅ CORREÇÃO CRÍTICA: No modo criação, só permitir submit se foi clique explícito no botão
    if (!pipeline?.id && !isExplicitButtonClick) {
      console.log('🚫 [handleSubmit] BLOQUEADO: Submit automático no modo criação cancelado:', {
        isCreationMode: !pipeline?.id,
        isExplicitButtonClick,
        reason: 'Criação deve ser apenas via clique no botão'
      });
      return;
    }
    
    if (!validateForm()) {
      console.log('❌ [handleSubmit] Validação falhou, cancelando submit');
      return;
    }
    
    console.log('✅ [handleSubmit] Validação passou, continuando...');
    
    // ✅ CORREÇÃO: Aplicar configuração de temperatura antes do submit em modo criação
    applyTemperatureConfigOnSubmit();
    
    // ✅ CORREÇÃO CRÍTICA: Em modo criação, coletar dados diretamente dos managers
    // para evitar dependência do formData que foi bloqueado
    let finalStages = formData.stages;
    let finalCustomFields = formData.custom_fields;
    let finalCadenceConfigs = formData.cadence_configs;
    let finalDistributionRule = formData.distribution_rule;
    
    if (!pipeline?.id) {
      // Modo criação: coletar dados diretamente dos managers
      
      // 1. Etapas do stageManager
      const systemStages = [
        { name: 'Lead', color: '#3B82F6', order_index: 0, is_system_stage: true },
        { name: 'Ganho', color: '#10B981', order_index: 998, is_system_stage: true },
        { name: 'Perdido', color: '#EF4444', order_index: 999, is_system_stage: true }
      ];
      const customStages = stageManager.stages.filter(s => !s.is_system_stage);
      finalStages = [...systemStages, ...customStages];
      
      // 2. Campos customizados (se houver interface no fieldsManager)
      // Para campos, vamos manter o formData pois não há interação que cause problemas
      
      // 3. Cadências do cadenceManager
      finalCadenceConfigs = cadenceManager.cadences || [];
      
      // 4. Distribuição do distributionManager
      finalDistributionRule = distributionManager.rule || formData.distribution_rule;
      
      console.log('🔄 [handleSubmit] Coletando dados dos managers para criação:', {
        stagesData: {
          systemStagesCount: systemStages.length,
          customStagesCount: customStages.length,
          totalStages: finalStages.length
        },
        fieldsData: {
          customFieldsCount: finalCustomFields.length
        },
        cadenceData: {
          cadenceConfigsCount: finalCadenceConfigs.length
        },
        distributionData: {
          distributionRule: finalDistributionRule
        }
      });
    }
    
    // ✅ CORREÇÃO: Garantir que usamos dados atualizados de todos os managers
    const finalFormData = {
      ...formData,
      stages: finalStages,
      custom_fields: finalCustomFields,
      cadence_configs: finalCadenceConfigs,
      distribution_rule: finalDistributionRule,
      temperature_config: temperatureManager.temperatureConfig,
      outcome_reasons: outcomeReasonsManager.getFormattedDataForAPI(),
      qualification_rules: formData.qualification_rules
    };
    
    console.log('🚀 [handleSubmit] FormData final com dados completos:', {
      ...finalFormData,
      temperature_config: finalFormData.temperature_config,
      outcome_reasons: finalFormData.outcome_reasons
    });
    
    setLoading(true);
    try {
      // ✅ CORREÇÃO: Usar flags corretas para criação vs edição
      if (pipeline?.id) {
        // Modo edição
        await onSubmit(finalFormData, isIntentionalSubmit, { isUpdate: true });
      } else {
        // Modo criação
        await onSubmit(finalFormData, isIntentionalSubmit, { isCreate: true });
      }
      setIsIntentionalSubmit(false); // Reset após submit
      setIsExplicitButtonClick(false); // Reset após submit
      // ✅ CORREÇÃO 5: Feedback de sucesso será tratado pelo componente pai
    } catch (error: any) {
      logPipelineError('handleSubmit', error, true);
      
      // ✅ CORREÇÃO 5: Tratamento de erros específicos
      let errorMessage = 'Erro inesperado ao salvar pipeline. Tente novamente.';
      
      if (error?.message) {
        if (error.message.includes('Nome já existe') || error.message.includes('already exists')) {
          errorMessage = 'Este nome de pipeline já existe. Escolha outro nome.';
        } else if (error.message.includes('Validation failed')) {
          errorMessage = 'Dados inválidos. Verifique os campos e tente novamente.';
        } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('Unauthorized') || error.message.includes('403')) {
          errorMessage = 'Você não tem permissão para esta ação.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showErrorToast('Erro ao salvar', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(memberId)
        ? prev.member_ids.filter(id => id !== memberId)
        : [...prev.member_ids, memberId]
    }));
  };

  // ✅ DROPDOWN ACTIONS: Callback para duplicar pipeline (via props)
  const handleDuplicatePipelineInternal = async () => {
    if (onDuplicatePipeline) {
      await onDuplicatePipeline();
    }
  };

  // ✅ DROPDOWN ACTIONS: Função para duplicar pipeline (mantida para compatibilidade)
  const handleDuplicatePipeline = async () => {
    if (!pipeline?.id || !user?.tenant_id) {
      showErrorToast('Erro', 'Pipeline não encontrada para duplicação');
      return;
    }

    try {
      setLoading(true);
      
      // Gerar nome único para a cópia
      const originalName = pipeline.name;
      let duplicateName = `${originalName} - Cópia`;
      
      // Verificar se já existe uma pipeline com este nome
      const { data: existingPipelines } = await supabase
        .from('pipelines')
        .select('name')
        .eq('tenant_id', user.tenant_id)
        .ilike('name', `${originalName}%`);
      
      // Se existir, encontrar próximo número disponível
      if (existingPipelines && existingPipelines.length > 0) {
        const existingNames = existingPipelines.map(p => p.name);
        let counter = 2;
        
        while (existingNames.includes(duplicateName)) {
          duplicateName = `${originalName} (${counter})`;
          counter++;
        }
      }

      // 1. Duplicar pipeline principal
      const { data: newPipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          name: duplicateName,
          description: `${pipeline.description || ''} (Duplicada)`,
          tenant_id: user.tenant_id,
          created_by: user.id,
          is_active: true,
          qualification_rules: pipeline.qualification_rules
        })
        .select()
        .single();

      if (pipelineError) throw pipelineError;
      
      const newPipelineId = newPipeline.id;

      // 2. Duplicar etapas
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline.id);
      
      if (stages && stages.length > 0) {
        const newStages = stages.map(stage => ({
          pipeline_id: newPipelineId,
          name: stage.name,
          color: stage.color,
          order_index: stage.order_index,
          is_system_stage: stage.is_system_stage
        }));
        
        await supabase.from('pipeline_stages').insert(newStages);
      }

      // 3. Duplicar campos customizados
      const { data: customFields } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipeline.id);
      
      if (customFields && customFields.length > 0) {
        const newCustomFields = customFields.map(field => ({
          pipeline_id: newPipelineId,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: field.field_options,
          is_required: field.is_required,
          field_order: field.field_order,
          placeholder: field.placeholder,
          show_in_card: field.show_in_card
        }));
        
        await supabase.from('pipeline_custom_fields').insert(newCustomFields);
      }

      // 4. Duplicar vendedores vinculados
      const { data: members } = await supabase
        .from('pipeline_members')
        .select('member_id')
        .eq('pipeline_id', pipeline.id);
      
      if (members && members.length > 0) {
        const newMembers = members.map(member => ({
          pipeline_id: newPipelineId,
          member_id: member.member_id
        }));
        
        await supabase.from('pipeline_members').insert(newMembers);
      }

      // 5. Duplicar regras de distribuição (se existirem)
      const { data: distributionRules } = await supabase
        .from('pipeline_distribution_rules')
        .select('*')
        .eq('pipeline_id', pipeline.id);
      
      if (distributionRules && distributionRules.length > 0) {
        const newDistributionRules = distributionRules.map(rule => ({
          pipeline_id: newPipelineId,
          mode: rule.mode,
          is_active: rule.is_active,
          working_hours_only: rule.working_hours_only,
          skip_inactive_members: rule.skip_inactive_members,
          fallback_to_manual: rule.fallback_to_manual
        }));
        
        await supabase.from('pipeline_distribution_rules').insert(newDistributionRules);
      }

      // 6. Duplicar cadências (se existirem)
      const { data: cadences } = await supabase
        .from('cadence_configs')
        .select('*')
        .eq('pipeline_id', pipeline.id);
      
      if (cadences && cadences.length > 0) {
        const newCadences = cadences.map(cadence => ({
          pipeline_id: newPipelineId,
          stage_name: cadence.stage_name,
          stage_order: cadence.stage_order,
          tasks: cadence.tasks,
          is_active: cadence.is_active
        }));
        
        await supabase.from('cadence_configs').insert(newCadences);
      }

      showErrorToast('Pipeline duplicada', `"${duplicateName}" criada com sucesso!`);
      
      // Redirecionar para a nova pipeline ou recarregar lista
      if (onCancel) {
        onCancel(); // Voltar para a lista
      }
      
    } catch (error: any) {
      logPipelineError('handleDuplicatePipeline', error, true);
      showErrorToast('Erro ao duplicar', error.message || 'Erro inesperado ao duplicar pipeline');
    } finally {
      setLoading(false);
    }
  };

  // ✅ DROPDOWN ACTIONS: Callback para arquivar pipeline (via props)
  const handleArchivePipelineInternal = async () => {
    if (onArchivePipeline) {
      await onArchivePipeline();
    }
  };

  // ✅ DROPDOWN ACTIONS: Função para arquivar pipeline (mantida para compatibilidade)
  const handleArchivePipeline = async () => {
    if (!pipeline?.id) {
      showErrorToast('Erro', 'Pipeline não encontrada para arquivamento');
      return;
    }

    // Confirmação antes de arquivar
    const confirmed = window.confirm(
      `Tem certeza que deseja arquivar a pipeline "${pipeline.name}"?\n\nEsta ação pode ser revertida posteriormente.`
    );
    
    if (!confirmed) return;

    try {
      setLoading(true);
      
      // Marcar pipeline como inativa (arquivada)
      const { error } = await supabase
        .from('pipelines')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', pipeline.id);

      if (error) throw error;

      showErrorToast('Pipeline arquivada', `"${pipeline.name}" foi arquivada com sucesso!`);
      
      // Voltar para a lista
      if (onCancel) {
        onCancel();
      }
      
    } catch (error: any) {
      logPipelineError('handleArchivePipeline', error, true);
      showErrorToast('Erro ao arquivar', error.message || 'Erro inesperado ao arquivar pipeline');
    } finally {
      setLoading(false);
    }
  };

  // ✅ DROPDOWN ACTIONS: Funções exportadas via props (removido header duplicado)

  const renderBasicTab = () => (
    <BlurFade delay={0.05} inView>
      <div className={PIPELINE_UI_CONSTANTS.spacing.section}>
        <SectionHeader
          icon={Settings}
          title="Informações Básicas"
        />
        
        <AnimatedCard>
          <CardContent className={PIPELINE_UI_CONSTANTS.spacing.form}>
            <div>
              <Label htmlFor="pipeline-name" className={`block text-sm font-medium ${PIPELINE_UI_CONSTANTS.spacing.labelSpacing}`}>
                Nome do Pipeline *
              </Label>
              <div className="relative">
                <Input
                  id="pipeline-name"
                  value={pipelineNameValidation.name}
                  onChange={(e) => {
                    pipelineNameValidation.updateName(e.target.value);
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                  }}
                  onBlur={pipelineNameValidation.validateImmediately}
                  placeholder="Ex: Vendas Consultivas"
                  className={`pr-10 ${
                    pipelineNameValidation.showValidation
                      ? pipelineNameValidation.isValid
                        ? 'border-green-500 focus:ring-green-500'
                        : 'border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                />
                {/* ✅ Ícone de status da validação */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {pipelineNameValidation.isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : pipelineNameValidation.showValidation ? (
                    pipelineNameValidation.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )
                  ) : null}
                </div>
              </div>
              
              {/* ✅ Feedback de validação */}
              {pipelineNameValidation.showValidation && (
                <div className="mt-2 space-y-2">
                  {pipelineNameValidation.hasError && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {pipelineNameValidation.error}
                    </p>
                  )}
                  
                  {pipelineNameValidation.isValid && pipelineNameValidation.showValidation && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Nome disponível!
                    </p>
                  )}
                  
                  {pipelineNameValidation.suggestion && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-yellow-800">
                            Sugestão: <strong>{pipelineNameValidation.suggestion}</strong>
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={pipelineNameValidation.applySuggestion}
                            className="mt-2 h-7 text-xs"
                          >
                            Usar sugestão
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {pipelineNameValidation.similarNames.length > 0 && (
                    <div className="text-xs text-gray-600">
                      Nomes similares: {pipelineNameValidation.similarNames.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="pipeline-description" className={`block text-sm font-medium ${PIPELINE_UI_CONSTANTS.spacing.labelSpacing}`}>
                Descrição
              </Label>
              <Textarea
                id="pipeline-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o propósito e funcionamento do pipeline..."
                rows={3}
              />
            </div>

            <div>
              <Label>Vendedores Vinculados *</Label>
              {/* ✅ CORREÇÃO: Feedback quando não há membros */}
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

  return (
    <div className="space-y-6 p-6">
      {/* ✅ DROPDOWN HEADER: Header removido - agora está no Modal */}

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
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
            </TabsTrigger>
            <TabsTrigger value="qualification" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Qualificação
            </TabsTrigger>
            <TabsTrigger value="motivos" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Motivos
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
              availableStages={stageManager.allStages
                .filter((s: PipelineStage) => s.name !== 'Ganho' && s.name !== 'Perdido' && s.name !== 'Closed Won' && s.name !== 'Closed Lost')
                .map((s: PipelineStage) => ({ 
                  name: s.name, 
                  order_index: s.order_index 
                }))} 
            />
          </TabsContent>

          <TabsContent value="qualification">
            <QualificationRulesManager
              initialRules={formData.qualification_rules}
              customFields={formData.custom_fields.map(field => ({
                field_name: field.field_name,
                field_label: field.field_label,
                field_type: field.field_type
              }))}
              onRulesChange={handleQualificationRulesChange}
              isEditMode={!!pipeline?.id}
              temperatureManager={temperatureManager}
            />
          </TabsContent>

          <TabsContent value="motivos">
            <OutcomeReasonsConfiguration
              value={outcomeReasonsManager.outcomeReasonsData}
              onChange={outcomeReasonsManager.updateOutcomeReasons}
              pipelineId={pipeline?.id || 'temp-pipeline'} // temp ID para criação
              isEditMode={!!pipeline?.id} // modo edição quando pipeline existe
            />
          </TabsContent>
        </Tabs>

        {/* Botões apenas para criação de pipeline, não para edição */}
        {!pipeline && (
          <div className="flex justify-end pt-6">
            <Button
              type="submit"
              disabled={loading || !pipelineNameValidation.canSubmit}
              className="min-w-[120px]"
              onClick={() => {
                console.log('🖱️ [Button] Clique explícito no botão Criar Pipeline');
                setIsIntentionalSubmit(true);
                setIsExplicitButtonClick(true);
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {submitText}
                </div>
              )}
            </Button>
          </div>
        )}
        
        {/* Mensagem informativa para modo de edição */}
        {pipeline && (
          <div className="pt-6">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Save className="h-4 w-4" />
              <span>Suas alterações são salvas automaticamente</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ModernPipelineCreatorRefactored; 