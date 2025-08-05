import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, User, Mail, ThumbsUp, ThumbsDown, Clock, Phone, Building, DollarSign, MapPin, Calendar, Target, Thermometer, Globe, FileText, Activity, ChevronDown, CheckCircle, AlertCircle, PlayCircle, ArrowRight, Zap, Edit, Check, X as XIcon, Flame, Snowflake, ThermometerSnowflake, Star, Trophy, MoreVertical, Trash2, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTemperatureAPI } from '../../hooks/useTemperatureAPI';
import { generateTemperatureBadge } from '../../utils/temperatureUtils';
// ✅ IMPORTAR NOVOS COMPONENTES DOS BLOCOS
import LeadDataBlock from './blocks/LeadDataBlock';
import InteractiveMenuBlock from './blocks/InteractiveMenuBlock';
import HistoryBlock from './blocks/HistoryBlock';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast } from '../../hooks/useToast';
import { logger } from '../../utils/logger';
import { Lead, CustomField } from '../../types/Pipeline';
// ✅ MÁSCARAS: Componentes de input com máscaras brasileiras
import { 
  PhoneInput, 
  CurrencyInput, 
  OpportunityNameInput,
  TextLimitInput 
} from '../ui/masked-input';
import { registerFeedback, registerStageMove } from '../../utils/historyUtils';
import { checkHistoryTable } from '../../utils/fixHistoryTables';
import { useLeadTasks, LeadTask } from '../../hooks/useLeadTasks';
import { useLeadFeedbacks } from '../../hooks/useLeadFeedbacks';
import { useLeadHistory } from '../../hooks/useLeadHistory';
// ✅ REMOVIDO: useCadenceActivityGenerator - agora usa automação do backend
import { useQualificationEvaluation } from '../../hooks/useQualificationEvaluation';
import { StageSelector } from './StageSelector';
import { MinimalHorizontalStageSelector } from './MinimalHorizontalStageSelector';
import { EnhancedGoogleCalendarTab } from '../meetings/EnhancedGoogleCalendarTab';
import AddManualActivityModal from '../Activities/AddManualActivityModal';
import CustomActivityModal from './components/CustomActivityModal';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { api } from '../../lib/api';
import { 
  translateAction, 
  getActionIcon, 
  getActionColor, 
  getChannelIcon, 
  getChannelColor, 
  formatDate,
  getValueChangeInfo,
  getTaskStatusInfo,
  formatTaskDate,
  getFieldIcon
} from '../../utils/leadDetailsUtils';
// ✅ OUTCOME REASONS: Importado nos componentes dos blocos

// AIDEV-NOTE: Sistema de debugging removido para otimizar performance

// AIDEV-NOTE: Hook useThrottledState removido - causava complexidade desnecessária

// 🚀 OTIMIZAÇÃO PERFORMANCE: Objetos estáticos fora do componente para evitar re-renders
const STATIC_FIELD_MAPPINGS = {
  'nome_oportunidade': ['nome_oportunidade', 'titulo_oportunidade', 'titulo', 'name'],
  'titulo_oportunidade': ['titulo_oportunidade', 'nome_oportunidade', 'titulo', 'name'],
  'titulo': ['titulo', 'nome_oportunidade', 'titulo_oportunidade', 'name'],
  'nome_lead': ['nome_lead', 'nome_contato', 'contato', 'nome', 'lead_name'],
  'nome_contato': ['nome_contato', 'nome_lead', 'contato', 'nome', 'lead_name'],
  'email': ['email', 'email_contato'],
  'telefone': ['telefone', 'telefone_contato', 'celular', 'phone'],
  'valor': ['valor', 'valor_oportunidade', 'valor_proposta', 'value'],
  'empresa': ['empresa', 'empresa_contato', 'company']
};

// ✅ Helper para logs estruturados movido para dentro do componente

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null; // ✅ CORREÇÃO: Permitir null para evitar crashes
  customFields?: CustomField[]; // ✅ CORREÇÃO: Tornar opcional com fallback
  pipelineId?: string; // Pipeline ID para carregar configuração de temperatura
  onUpdate?: (leadId: string, updatedData: any) => void;
  activeTab?: string;
  isUpdatingStage?: boolean;
  onForceClose?: () => void;
}


interface Feedback {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
  feedback_type?: 'positive' | 'negative';
}

// ✅ ETAPA 3: Interface expandida para histórico enriquecido
interface HistoryEntry {
  id: string;
  lead_id: string;
  action: string;
  description: string;
  user_name: string;
  user_role?: string;
  user_email?: string;
  created_at: string;
  old_values?: any;
  new_values?: any;
}

// ✅ FASE 2B: StageSelector agora importado de arquivo separado

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  customFields = [], // ✅ CORREÇÃO: Fallback para array vazio
  pipelineId,
  onUpdate,
  activeTab: externalActiveTab,
  isUpdatingStage = false,
  onForceClose
}) => {
  // AIDEV-NOTE: Refs de debugging removidos para otimização de performance
  
  // Hooks principais sem logging desnecessário
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Hook para configuração de temperatura personalizada
  const { config: temperatureConfig } = useTemperatureAPI({ 
    pipelineId: pipelineId || lead?.pipeline_id || '',
    autoLoad: true 
  });
  
  // AIDEV-NOTE: Estados consolidados com useReducer para otimizar performance
  
  // Estados consolidados de UI usando useReducer
  const [uiState, setUIState] = React.useReducer(
    (state: any, action: any) => ({ ...state, ...action }),
    {
      showDeleteDialog: false,
      deleting: false,
      showAddManualActivityModal: false,
      showCustomActivityModal: false,
      showStageSelector: false,
      loadingStages: false,
      cadenceLoading: false
    }
  );

  // Estados consolidados de edição usando useReducer
  const [editState, setEditState] = React.useReducer(
    (state: any, action: any) => ({ ...state, ...action }),
    {
      editing: {},
      editValues: {},
      saving: {}
    }
  );

  // Estados simples mantidos
  const [activeInteractiveTab, setActiveInteractiveTab] = useState(externalActiveTab || 'anotacoes');
  const [localLeadData, setLocalLeadData] = useState(lead || {
    id: '',
    nome_lead: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    stage_id: '',
    pipeline_id: '',
    lead_master_id: '',
    lifecycle_stage: 'lead',
    temperature_level: 'normal',
    custom_data: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as any);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);

  // ✅ CORREÇÃO CRÍTICA: TODOS OS HOOKS MOVIDOS PARA ANTES DO EARLY RETURN
  
  // ✅ SINCRONIZAÇÃO: Atualizar aba quando prop externo mudar
  useEffect(() => {
    if (!lead?.id) return; // ✅ GUARD: Verificar lead.id específico
    
    if (externalActiveTab && externalActiveTab !== activeInteractiveTab) {
      setActiveInteractiveTab(externalActiveTab);
    }
  }, [externalActiveTab, lead?.id]); // ✅ CORREÇÃO: Usar lead.id específico para evitar re-renders desnecessários



  const handleCloseAddManualActivity = useCallback(() => {
    setUIState({ showAddManualActivityModal: false });
  }, []);

  const handleOpenCustomActivity = useCallback(() => {
    setUIState({ showCustomActivityModal: true });
  }, []);


  // AIDEV-NOTE: Monitoring de dependências circulares removido para performance
  
  // ✅ ETAPA 1: Função de fechamento simplificada (sistema de bloqueio removido)
  const protectedOnClose = React.useCallback(() => {
    // Verificar apenas se está atualizando etapa
    if (isUpdatingStage) {
      return;
    }
    
    onClose();
  }, [onClose, isUpdatingStage]);

  // ✅ CORREÇÃO TEMPORAL DEAD ZONE: handleInputChange deve estar ANTES do renderEditableField
  // 🚀 OTIMIZAÇÃO: Reduzir logs para melhorar performance
  const handleInputChange = useCallback((field: string, value: string) => {
    // Handling input change otimizado
    setEditState({ 
      editValues: { ...editState.editValues, [field]: value }
    });
  }, [editState.editValues]);

  const startEditing = useCallback((field: string, currentValue: string) => {
    // Starting field edit otimizado
    setEditState({
      editing: { ...editState.editing, [field]: true },
      editValues: { ...editState.editValues, [field]: currentValue || '' }
    });
  }, [editState.editing, editState.editValues]);

  const cancelEditing = useCallback((field: string) => {
    // Canceling field edit otimizado
    setEditState({
      editing: { ...editState.editing, [field]: false },
      editValues: { ...editState.editValues, [field]: '' }
    });
  }, [editState.editing, editState.editValues]);

  // ✅ NOVO: Detectar tipo de máscara baseado no nome do campo
  const getFieldMaskType = useCallback((fieldName: string): 'phone' | 'currency' | 'opportunity-name' | 'email' | 'text' => {
    // Telefone
    if (fieldName.toLowerCase().includes('telefone') || fieldName.toLowerCase().includes('phone')) {
      return 'phone';
    }
    // Moeda/Valor
    if (fieldName.toLowerCase().includes('valor') || fieldName.toLowerCase().includes('value') || fieldName.toLowerCase().includes('price')) {
      return 'currency';
    }
    // Nome da oportunidade (limite de 22 caracteres)
    if (fieldName.toLowerCase().includes('nome_oportunidade') || fieldName.toLowerCase().includes('titulo_oportunidade') || fieldName.toLowerCase().includes('titulo')) {
      return 'opportunity-name';
    }
    // E-mail (sem máscara, apenas validação)
    if (fieldName.toLowerCase().includes('email')) {
      return 'email';
    }
    // Padrão texto
    return 'text';
  }, []);

  // ✅ NOVO: Renderizar input com máscara apropriada
  const renderMaskedInput = useCallback((
    fieldName: string,
    maskType: 'phone' | 'currency' | 'opportunity-name' | 'email' | 'text',
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    isSaving: boolean,
    onKeyDown: (e: React.KeyboardEvent) => void
  ) => {
    const commonProps = {
      value,
      placeholder,
      disabled: isSaving,
      autoFocus: true,
      onKeyDown,
      className: "flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    };

    switch (maskType) {
      case 'phone':
        return (
          <PhoneInput
            {...commonProps}
            onValueChange={(values) => {
              // react-number-format retorna objeto com formattedValue, value, etc.
              onChange(values.formattedValue || '');
            }}
          />
        );
        
      case 'currency':
        return (
          <CurrencyInput
            {...commonProps}
            onValueChange={(values) => {
              onChange(values.formattedValue || '');
            }}
          />
        );
        
      case 'opportunity-name':
        return (
          <OpportunityNameInput
            {...commonProps}
            onValueChange={(value) => onChange(value)}
          />
        );
        
      case 'email':
        return (
          <input
            {...commonProps}
            type="email"
            onChange={(e) => onChange(e.target.value)}
          />
        );
        
      default:
        return (
          <input
            {...commonProps}
            type="text"
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  }, []);

  // ✅ IMPLEMENTAÇÃO ROBUSTA: Sistema de fallback RPC + SQL direto para salvamento seguro
  const saveField = useCallback(async (fieldName: string) => {
    // 🚀 Log essencial - sempre manter para debugging de salvamento
    // Salvando campo otimizado
    
    if (!localLeadData?.id) {
      console.error('❌ [LeadDetailsModal] ID do lead não encontrado');
      return;
    }

    try {
      setEditState({ saving: { ...editState.saving, [fieldName]: true } });
      
      const inputValue = editState.editValues[fieldName] || '';
      const fieldMapping = FIELD_MAPPING[fieldName as keyof typeof FIELD_MAPPING];
      const isLeadsMaster = fieldMapping && fieldMapping.table === 'leads_master';
      
      console.log('🎯 [LeadDetailsModal] Tentando salvar com 3 métodos de fallback');
      
      let result: any = null;
      let usedMethod = 'RPC';
      
      // ✅ MÉTODO 1: RPC (preferencial)
      try {
        result = await executeRpcSave(fieldName, inputValue, isLeadsMaster);
      } catch (rpcError: any) {
        console.warn('⚠️ [LeadDetailsModal] RPC falhou, tentando SQL fallback');
        usedMethod = 'SQL';
        
        // ✅ MÉTODO 2: SQL Fallback
        try {
          result = await executeSqlFallback(fieldName, inputValue, isLeadsMaster);
        } catch (sqlError: any) {
          console.warn('⚠️ [LeadDetailsModal] SQL falhou, usando update direto');
          usedMethod = 'Direct';
          
          // ✅ MÉTODO 3: Update Direto (último recurso)
          result = await executeDirectUpdate(fieldName, inputValue, isLeadsMaster);
        }
      }
      
      if (!result?.success) {
        console.error('❌ [LeadDetailsModal] Função retornou erro:', result?.message);
        throw new Error(result?.message || 'Erro desconhecido na função');
      }
      
      console.log(`✅ [LeadDetailsModal] Campo salvo via ${usedMethod}:`, result);
      
      // ✅ CORREÇÃO CRÍTICA: Atualizar estado local E invalidar cache
      
      // 1. Atualizar estado local sincronizado
      setLocalLeadData(prev => {
        // ✅ CORREÇÃO: Mapear nome_oportunidade para o campo correto no custom_data
        const customDataKey = fieldName === 'nome_oportunidade' ? 'nome' : fieldName;
        
        const updatedLead = {
          ...prev,
          custom_data: {
            ...prev.custom_data,
            [customDataKey]: inputValue
          }
        };
        
        // Para campos não-custom_data (tabela leads_master)
        if (isLeadsMaster && fieldMapping) {
          return {
            ...updatedLead,
            [fieldMapping.field || fieldName]: inputValue
          };
        }
        
        return updatedLead;
      });
      
      // 2. Invalidar cache React Query para propagação imediata
      queryClient.invalidateQueries({ 
        queryKey: ['leads'], 
        refetchType: 'active' 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['pipeline-leads'], 
        refetchType: 'active' 
      });
      
      // 3. Sair do modo de edição - CORREÇÃO: usar setEditState ao invés de setEditing
      setEditState({ editing: { ...editState.editing, [fieldName]: false } });
      
      // 4. Feedback visual
      showSuccessToast(
        'Campo salvo!', 
        `${fieldName} atualizado via ${usedMethod}${usedMethod !== 'RPC' ? ' (modo compatibilidade)' : ''}`
      );
      
    } catch (error: any) {
      console.error('❌ [LeadDetailsModal] Erro ao salvar campo:', fieldName, error);
      
      // Tratamento específico de erros conhecidos
      if (error?.code === '27000') {
        showErrorToast('Conflito de triggers', 'Sistema ocupado. Aguarde e tente novamente.');
      } else if (error?.code === 'PGRST202') {
        showErrorToast('Erro de cache', 'Cache do sistema desatualizado. Recarregue a página.');
      } else if (error?.message?.includes('Function not found')) {
        showErrorToast('Função indisponível', 'Sistema em manutenção. Tente novamente em alguns minutos.');
      } else {
        showErrorToast('Erro ao salvar', error?.message || 'Não foi possível salvar as mudanças');
      }
    } finally {
      setEditState({ saving: { ...editState.saving, [fieldName]: false } });
    }
  }, [editState.editValues, editState.saving, localLeadData, showSuccessToast, showErrorToast, queryClient, editState.editing]);

  // ✅ PERFORMANCE: useCallback para estabilizar função de delete
  // CORREÇÃO 1: Função de delete usando Supabase direto (padrão ModernPipelineCreatorRefactored)
  const handleDeleteOpportunity = useCallback(async () => {
    if (!lead || !localLeadData?.id) return;
    
    try {
      setUIState({ deleting: true, showDeleteDialog: false });
      
      // Excluindo oportunidade via Supabase
      
      // ✅ CORREÇÃO 1: Usar Supabase direto seguindo padrão do ModernPipelineCreatorRefactored
      const { error } = await supabase
        .from('pipeline_leads')
        .delete()
        .eq('id', localLeadData.id)
        .eq('tenant_id', user?.tenant_id); // Segurança: filtrar por tenant
      
      if (error) {
        throw new Error(error.message);
      }
      
      // ✅ CORREÇÃO 1: Cache invalidation manual seguindo padrão do sistema
      await queryClient.invalidateQueries({ 
        queryKey: ['pipeline-leads', localLeadData.pipeline_id] 
      });
      
      await queryClient.invalidateQueries({ 
        queryKey: ['pipeline', localLeadData.pipeline_id] 
      });
      
      // Cache invalidado
      
      showSuccessToast('Oportunidade excluída com sucesso! Lead mantido para reutilização.');
      
      // Fechar modal após exclusão bem-sucedida
      setTimeout(() => {
        protectedOnClose();
      }, 1000);
      
    } catch (error: any) {
      // Erro ao excluir oportunidade
      showErrorToast('Erro ao excluir oportunidade. Tente novamente.');
    } finally {
      setUIState({ deleting: false });
    }
  }, [lead, localLeadData?.id, localLeadData?.pipeline_id, user?.tenant_id, protectedOnClose, queryClient]);

  // ✅ HOOKS CUSTOMIZADOS: Usando hooks customizados para dados do lead (com guards)
  const {
    feedbacks,
    loading: feedbacksLoading,
    newFeedback,
    setNewFeedback,
    feedbackType,
    setFeedbackType,
    loadFeedbacks,
    handleAddFeedback
  } = useLeadFeedbacks(localLeadData?.id || '');

  const {
    history,
    historyLoading,
    loadHistory
  } = useLeadHistory(localLeadData?.id || '');

  // ✅ REMOVIDO: Hook de geração manual - backend já faz automação na mudança de etapa
  // const { generateActivities, isGenerating: isGeneratingActivities } = useCadenceActivityGenerator();

  // ✅ CORREÇÃO CRÍTICA: MOVER TODOS OS HOOKS PARA ANTES DO EARLY RETURN
  
  // ✅ CORREÇÃO CRÍTICA: leadDataUpdated listener simplificado e otimizado
  React.useEffect(() => {
    if (!lead?.id) return; // ✅ GUARD: Verificar lead.id específico
    
    // ✅ CORREÇÃO CRÍTICA: Função regular dentro de useEffect (sem useCallback)
    const handleLeadDataUpdate = (event: CustomEvent) => {
      const { 
        leadMasterId, 
        pipelineLeadIds = [], 
        cardData, 
        timestamp,
        source 
      } = event.detail;
      
      // ✅ IDENTIFICAÇÃO OTIMIZADA: Verificar se é este lead
      const isThisLead = 
        (leadMasterId && localLeadData?.lead_master_id === leadMasterId) ||
        (pipelineLeadIds.length > 0 && pipelineLeadIds.includes(localLeadData?.id));
      
      if (isThisLead && cardData) {
        // ✅ LOGGING REMOVIDO: Para reduzir spam no console
        
        // ✅ ATUALIZAÇÃO OTIMIZADA sem logs excessivos
        setLocalLeadData(prevLead => ({
          ...prevLead,
          lead_master_id: leadMasterId,
          custom_data: {
            ...prevLead.custom_data,
            ...(cardData || {}),
            last_sync_at: timestamp || new Date().toISOString(),
            sync_source: source || 'unknown'
          }
        }));
      }
    };

    // Registrar listener
    window.addEventListener('leadDataUpdated', handleLeadDataUpdate as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('leadDataUpdated', handleLeadDataUpdate as EventListener);
    };
  }, [lead?.id]); // ✅ CORREÇÃO: Dependência específica apenas no lead.id

  // AIDEV-NOTE: Monitoring leadDataUpdated removido para performance

  // ✅ CORREÇÃO CRÍTICA: SINCRONIZAR ESTADO LOCAL QUANDO LEAD PROP MUDAR
  React.useEffect(() => {
    if (!lead?.id) return; // ✅ GUARD: Verificar lead.id específico
    
    // ✅ CORREÇÃO: Só atualizar se o lead realmente mudou e for diferente
    if (lead.id !== localLeadData?.id) {
      setLocalLeadData(lead);
    }
  }, [lead?.id]); // ✅ OTIMIZADO: Apenas lead.id para evitar re-renders por updated_at

  // ✅ CORREÇÃO: Função duplicada removida - usando apenas handleDeleteOpportunity

  // ✅ ETAPA 1: Sistema de controle isolado removido - usando apenas props
  // React.useEffect(() => {
  //   // Sistema simplificado sem modalControl
  // }, [isOpen, lead.id]); // ✅ CORREÇÃO: useEffect vazio removido para evitar re-renders desnecessários

  
  // ✅ BADGES MEMOIZADAS PARA PERFORMANCE OTIMIZADA
  
  // CORREÇÃO 2: Sistema de qualificação usando hook personalizado integrado com Supabase
  const qualificationEvaluation = useQualificationEvaluation(
    localLeadData?.pipeline_id, 
    localLeadData
  );
  
  // Badge de qualificação baseado na avaliação real das regras configuradas via hook
  const qualificationBadge = useMemo(() => {
    const evaluation = qualificationEvaluation.data;
    const isLoading = qualificationEvaluation.isLoading;
    
    if (isLoading) {
      return {
        label: 'Avaliando...',
        color: 'bg-gray-100 text-gray-600 border-gray-300',
        icon: <Clock className="w-3 h-3 animate-spin" />,
        tooltip: 'Avaliando qualificação com base nas regras configuradas...'
      };
    }

    if (!evaluation) {
      return {
        label: 'Lead',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <User className="w-3 h-3" />,
        tooltip: 'Dados insuficientes para avaliação de qualificação'
      };
    }

    switch (evaluation.qualification_level) {
      case 'MQL':
        return {
          label: 'MQL',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: <Star className="w-3 h-3" />,
          tooltip: `Marketing Qualified Lead (Score: ${evaluation.score}) - ${evaluation.reasoning}`
        };
      case 'SQL':
        return {
          label: 'SQL',
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: <Trophy className="w-3 h-3" />,
          tooltip: `Sales Qualified Lead (Score: ${evaluation.score}) - ${evaluation.reasoning}`
        };
      case 'Hot':
        return {
          label: 'Hot',
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: <Flame className="w-3 h-3" />,
          tooltip: `Lead Quente (Score: ${evaluation.score}) - ${evaluation.reasoning}`
        };
      case 'Warm':
        return {
          label: 'Warm',
          color: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: <Thermometer className="w-3 h-3" />,
          tooltip: `Lead Morno (Score: ${evaluation.score}) - ${evaluation.reasoning}`
        };
      case 'Cold':
        return {
          label: 'Cold',
          color: 'bg-blue-200 text-blue-800 border-blue-400',
          icon: <Snowflake className="w-3 h-3" />,
          tooltip: `Lead Frio (Score: ${evaluation.score}) - ${evaluation.reasoning}`
        };
      default:
        return {
          label: 'Lead',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <User className="w-3 h-3" />,
          tooltip: `Lead Básico (Score: ${evaluation.score}) - ${evaluation.reasoning}`
        };
    }
  }, [qualificationEvaluation.data, qualificationEvaluation.isLoading]);

  // Badge de temperatura com configuração personalizada (SINCRONIZADO COM LEADCARD)
  const temperatureBadge = useMemo(() => {
    // ✅ MESMA ORDEM DE PRIORIDADE DO LEADCARD
    const leadCustomData = localLeadData.custom_data || {};
    const temperatura = localLeadData.temperature_level || 
                       leadCustomData.temperatura || 
                       leadCustomData.lead_temperature || 
                       'hot';
    
    const badge = generateTemperatureBadge(temperatura, temperatureConfig ?? null);
    
    // Converter ícones emoji para componentes React
    let iconComponent;
    switch (badge.icon) {
      case '🔥':
        iconComponent = <Flame className="w-3 h-3" />;
        break;
      case '🌡️':
        iconComponent = <Thermometer className="w-3 h-3" />;
        break;
      case '❄️':
        iconComponent = <Snowflake className="w-3 h-3" />;
        break;
      case '🧊':
        iconComponent = <ThermometerSnowflake className="w-3 h-3" />;
        break;
      default:
        iconComponent = <Thermometer className="w-3 h-3" />;
    }
    
    return {
      ...badge,
      icon: iconComponent
    };
  }, [localLeadData?.temperature_level, localLeadData?.custom_data?.temperatura, localLeadData?.custom_data?.lead_temperature, temperatureConfig]);

  // ✅ SISTEMA DE ACTIVETAB REMOVIDO - Nova interface de 3 blocos não usa tabs

  // 🚀 OTIMIZAÇÃO PERFORMANCE: Usar objeto estático ao invés de useMemo
  const fieldMappings = STATIC_FIELD_MAPPINGS;

  // ✅ CORREÇÃO PERFORMANCE: Memoizar função getLeadData com dependências otimizadas
  const getLeadData = useCallback((key: string): any => {
    // ⚡ OTIMIZAÇÃO: Usar valores específicos ao invés do objeto completo
    const customData = localLeadData.custom_data || {};
    const leadData = (localLeadData as any).lead_data || {};
    
    // ✅ CORREÇÃO CRÍTICA: Mapeamento de campos para dados reais do DB
    // Quando buscar nome_oportunidade, tentar primeiro os campos que existem
    if (key === 'nome_oportunidade') {
      return customData.nome_oportunidade || 
             customData.titulo_oportunidade || 
             customData.titulo || 
             customData.nome ||  // ✅ Campo real do DB
             '';
    }
    
    // ✅ CORREÇÃO VALOR: Tratar especialmente o campo valor
    if (key === 'valor') {
      const valor = customData.valor || customData.valor_oportunidade || (localLeadData as any).estimated_value || 0;
      // ✅ THROTTLING: Log apenas quando valor realmente muda
      // AIDEV-NOTE: Debug logging removido para performance
      return valor;
    }
    
    // ✅ ORDEM OTIMIZADA: Campos mais comuns primeiro
    // 1. Verificar custom_data diretamente
    if (customData[key] !== undefined && customData[key] !== null) {
      return customData[key];
    }
    
    // 2. Verificar lead_data se existir
    if (leadData[key] !== undefined && leadData[key] !== null) {
      return leadData[key];
    }
    
    // 3. Verificar propriedades diretas do lead
    if ((localLeadData as any)[key] !== undefined && (localLeadData as any)[key] !== null) {
      return (localLeadData as any)[key];
    }
    
    // 4. Buscar usando mapeamentos memoizados
    const possibleFields = fieldMappings[key];
    if (possibleFields) {
      for (const fieldName of possibleFields) {
        if (customData[fieldName] !== undefined && customData[fieldName] !== null) {
          return customData[fieldName];
        }
        if (leadData[fieldName] !== undefined && leadData[fieldName] !== null) {
          return leadData[fieldName];
        }
      }
    }
    
    return null;
  }, [localLeadData?.custom_data, localLeadData?.id, fieldMappings]); // ✅ Deps específicas

  // ✅ CORREÇÃO TEMPORAL DEAD ZONE: renderEditableField deve estar ANTES dos useMemo que a referenciam
  const renderEditableField = useCallback((
    fieldName: string,
    label: string,
    icon: React.ReactNode,
    placeholder: string = '',
    disabled: boolean = false
  ) => {
    const currentValue = getLeadData(fieldName) || '';
    const isEditing = editState.editing[fieldName];
    const isSaving = editState.saving[fieldName];
    const maskType = getFieldMaskType(fieldName);
    
    return (
      <div className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors group">
        {icon}
        <div className="flex-1 min-w-0 flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 flex-shrink-0">{label}:</span>
          {isEditing ? (
            <div className="flex items-center space-x-2 flex-1">
              {renderMaskedInput(
                fieldName,
                maskType,
                editState.editValues[fieldName] || '',
                (value) => handleInputChange(fieldName, value),
                placeholder,
                isSaving,
                (e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    saveField(fieldName);
                  } else if (e.key === 'Escape') {
                    cancelEditing(fieldName);
                  }
                }
              )}
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <button 
                    onClick={() => saveField(fieldName)}
                    className="p-1 hover:bg-green-100 rounded transition-colors"
                    title="Salvar alterações"
                  >
                    <Check className="h-3 w-3 text-green-600" />
                  </button>
                  <button 
                    onClick={() => cancelEditing(fieldName)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    title="Cancelar edição"
                  >
                    <XIcon className="h-3 w-3 text-red-600" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between flex-1">
              <span className="text-sm text-gray-900">
                {currentValue || <span className="italic text-gray-500">Não informado</span>}
              </span>
              {!disabled && (
                <button 
                  onClick={() => startEditing(fieldName, currentValue)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
                  title="Editar campo"
                >
                  <Edit className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }, [editState.editing, editState.saving, editState.editValues, getLeadData, handleInputChange, saveField, startEditing, cancelEditing, getFieldMaskType, renderMaskedInput]);

  // Valores memoizados para otimizar performance
  const leadDisplayName = useMemo(() => {
    return getLeadData('nome_lead') || getLeadData('nome_contato') || 'Lead sem nome';
  }, [getLeadData]);

  const leadEmail = useMemo(() => {
    return getLeadData('email') || '';
  }, [getLeadData]);

  const leadPhone = useMemo(() => {
    return getLeadData('telefone') || getLeadData('phone') || '';
  }, [getLeadData]);

  // Memoizar props para componentes filhos
  const leadDataBlockProps = useMemo(() => ({
    lead: localLeadData,
    customFields: customFields,
    editing: editState.editing,
    saving: editState.saving,
    editValues: editState.editValues,
    getLeadData: getLeadData,
    renderEditableField: renderEditableField,
    createdByUser: {
      name: user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user?.first_name || 'Usuário',
      email: user?.email || undefined
    }
  }), [localLeadData, customFields, editState.editing, editState.saving, editState.editValues, getLeadData, renderEditableField, user]);

  const interactiveMenuProps = useMemo(() => ({
    activeTab: activeInteractiveTab,
    onTabChange: setActiveInteractiveTab,
    leadId: localLeadData.id,
    leadType: localLeadData.lifecycle_stage,
    pipelineId: pipelineId,
    leadTasks: leadTasks,
    cadenceLoading: uiState.cadenceLoading,
    loadLeadTasks: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['card-tasks', localLeadData.id, user?.tenant_id],
      });
    }
  }), [activeInteractiveTab, localLeadData.id, localLeadData.lifecycle_stage, pipelineId, leadTasks, uiState.cadenceLoading, queryClient, user?.tenant_id]);

  // AIDEV-NOTE: useEffect de debug removido para otimização

  // Função para formatar data no horário do Brasil
  // Função formatDate movida para utils/leadDetailsUtils.ts

  // Função translateAction movida para utils/leadDetailsUtils.ts

  // Função getActionIcon movida para utils/leadDetailsUtils.ts

  // Função getActionColor movida para utils/leadDetailsUtils.ts

  // Função formatValueChange movida para utils/leadDetailsUtils.ts

  // Função getFieldIcon disponível em utils/leadDetailsUtils.ts

  // Função getChannelIcon movida para utils/leadDetailsUtils.ts

  // Função getChannelColor movida para utils/leadDetailsUtils.ts

  // Função getStatusBadge movida para utils/leadDetailsUtils.ts

  // Função formatTaskDate movida para utils/leadDetailsUtils.ts

  // Funções que retornam JSX (mantidas localmente)
  // ✅ CORREÇÃO REACT ERROR: Memoizar formatValueChange
  const formatValueChange = useCallback((oldValues: any, newValues: any, action: string) => {
    const changeInfo = getValueChangeInfo(oldValues, newValues, action);
    if (!changeInfo) return null;

    if (changeInfo.type === 'stage_change') {
      return (
        <div className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded">
          <span className="font-medium">{changeInfo.message}</span>
        </div>
      );
    }

    if (changeInfo.type === 'field_changes' && changeInfo.changes) {
      const changes = changeInfo.changes.map(({ key, value }) => (
        <div key={key} className="text-xs text-gray-600">
          <span className="font-medium">{key}:</span> {value}
        </div>
      ));
      
      return (
        <div className="mt-1 p-2 bg-gray-50 rounded">
          {changes}
        </div>
      );
    }

    return null;
  }, []); // ✅ Função pura, não precisa de dependências

  // ✅ CORREÇÃO REACT ERROR: Memoizar getStatusBadge
  const getStatusBadge = useCallback((task: LeadTask) => {
    const statusInfo = getTaskStatusInfo(task);
    if (!statusInfo) return null;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  }, []);

  // ✅ CORREÇÃO REACT ERROR: Memoizar renderChannelIcon
  const renderChannelIcon = useCallback((canal: string) => {
    switch (canal) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      case 'ligacao': return <Phone className="w-4 h-4" />;
      case 'sms': return <MessageCircle className="w-4 h-4" />;
      case 'tarefa': return <FileText className="w-4 h-4" />;
      case 'visita': return <MapPin className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  }, []);

  // Carregar tarefas do lead
  const loadLeadTasks = useCallback(async () => {
    try {
      setUIState({ cadenceLoading: true });
      // Debug logs removidos para corrigir erro TypeScript
      
      // ✅ CORREÇÃO: Usar combined_activities_view para consistência
      const { data: tasksData, error } = await supabase
        .from('combined_activities_view')
        .select('*')
        .eq('lead_id', localLeadData.id)
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar tarefas:', error);
        setLeadTasks([]);
        return;
      }

      setLeadTasks(tasksData || []);
      // Debug logs removidos para corrigir erro TypeScript
    } catch (error) {
      console.error('❌ Erro geral ao carregar tarefas:', error);
      setLeadTasks([]);
    } finally {
      setUIState({ cadenceLoading: false });
    }
  }, [localLeadData.id]);

  // ✅ NOVO: Handler para salvar atividade personalizada (movido para depois de loadLeadTasks)
  const handleSaveCustomActivity = useCallback(async (activityData: any) => {
    try {
      const response = await api.post('/activities/manual', {
        lead_id: localLeadData.id,
        title: activityData.title,
        channel: activityData.channel,
        scheduled_at: activityData.scheduled_at,
        description: activityData.description,
        status: 'pending'
      });

      if (response.data.success) {
        // ✅ CORREÇÃO: Usar invalidação de queries como nos outros handlers
        queryClient.invalidateQueries({ 
          queryKey: ['card-tasks', localLeadData.id, user?.tenant_id],
          refetchType: 'active'
        });
        queryClient.invalidateQueries({ 
          queryKey: ['activities', 'combined', localLeadData.id],
          refetchType: 'active'
        });
        queryClient.invalidateQueries({ 
          queryKey: ['leadTasks', localLeadData.id],
          refetchType: 'active'
        });
        
        // Fechar modal
        setUIState({ showCustomActivityModal: false });
        // Feedback de sucesso
        showSuccessToast('Atividade criada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao criar atividade personalizada:', error);
      showErrorToast('Erro ao criar atividade. Tente novamente.');
    }
  }, [localLeadData.id, queryClient, user?.tenant_id, showSuccessToast, showErrorToast]);

  // ✅ CORREÇÃO: handleCompleteTask movido para depois de loadLeadTasks
  const handleCompleteTask = useCallback(async (taskId: string, executionNotes?: string) => {
    try {
      const { error } = await supabase
        .from('lead_tasks')
        .update({
          status: 'concluida',
          executed_at: new Date().toISOString(),
          execution_notes: executionNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        throw new Error(error.message);
      }

      // Atualizar estado local
      setLeadTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'concluida' as const, executed_at: new Date().toISOString(), execution_notes: executionNotes }
          : task
      ));

      // ✅ CORREÇÃO: Usar invalidação de queries ao invés de chamada direta
      queryClient.invalidateQueries({ 
        queryKey: ['card-tasks', localLeadData.id, user?.tenant_id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['leadTasks', localLeadData.id],
        refetchType: 'active'
      });

      console.log('✅ Tarefa marcada como concluída');
    } catch (error) {
      console.error('❌ Erro ao completar tarefa:', error);
    }
  }, [localLeadData.id, queryClient, user?.tenant_id, setLeadTasks]);

  // Wrapper para handleAddFeedback compatível com botões
  const handleAddFeedbackWrapper = useCallback(async () => {
    if (!user?.id) return;
    await handleAddFeedback(user.id, loadHistory);
  }, [user?.id, handleAddFeedback, loadHistory]);

  // ✅ CORREÇÃO: useEffect movido para depois de loadLeadTasks
  useEffect(() => {
    if (!lead?.id || !isOpen || !localLeadData?.id) return; // ✅ GUARDS: Verificar todos os IDs
    
    // ✅ THROTTLING: Evitar carregamentos excessivos
    const timeoutId = setTimeout(() => {
      // ✅ CORREÇÃO: Usar query invalidation ao invés de chamada direta
      queryClient.invalidateQueries({ 
        queryKey: ['card-tasks', localLeadData.id, user?.tenant_id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['leadTasks', localLeadData.id],
        refetchType: 'active'
      });
      
      // Carregar outros dados
      loadFeedbacks();
      loadHistory();
    }, 100); // Pequeno delay para evitar race conditions

    return () => clearTimeout(timeoutId);
  }, [isOpen, lead?.id, localLeadData.id]); // ✅ OTIMIZADO: Dependências reduzidas para performance

  // ✅ HISTÓRICO: Removido useEffect duplicado - histórico é carregado no useEffect principal acima

  // ✅ ETAPA 2: Função para carregar stages da pipeline
  const loadPipelineStages = useCallback(async () => {
    if (!localLeadData?.pipeline_id) return;
    
    try {
      setUIState({ loadingStages: true });
      
      const { data: stages, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', localLeadData?.pipeline_id)
        .order('order_index', { ascending: true });
      
      if (error) {
        console.error('❌ Erro ao carregar stages:', error);
        return;
      }
      
      setPipelineStages(stages || []);
    } catch (error) {
      console.error('❌ Erro geral ao carregar stages:', error);
    } finally {
      setUIState({ loadingStages: false });
    }
  }, [localLeadData.pipeline_id]);

  // ✅ ETAPA 2: Função para mover lead para outro stage
  const handleStageMove = useCallback(async (newStageId: string) => {
    if (!user?.id || newStageId === localLeadData?.stage_id) return;
    
    try {
      const oldStageId = localLeadData?.stage_id;
      const newStage = pipelineStages.find(s => s.id === newStageId);
      const oldStage = pipelineStages.find(s => s.id === oldStageId);
      
      if (!newStage) return;
      
      // Atualizar no banco
      const { error } = await supabase
        .from('pipeline_leads')
        .update({
          stage_id: newStageId,
          moved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', localLeadData?.id);
      
      if (error) {
        console.error('❌ Erro ao mover lead:', error);
        return;
      }
      
      // Registrar no histórico
      await registerStageMove(
        localLeadData?.id,
        oldStageId,
        newStageId,
        user.id
      );
      
      // Atualizar estado local
      setLocalLeadData(prev => ({
        ...prev,
        stage_id: newStageId
      }));
      
      // Recarregar histórico
      await loadHistory();
      
      // Notificar componente pai se callback disponível
      if (onUpdate) {
        onUpdate(localLeadData?.id, { stage_id: newStageId });
      }
      
      // Fechar dropdown  
      setUIState({ showStageSelector: false });
      
      console.log(`✅ Lead movido de "${oldStage?.name}" para "${newStage.name}"`);
      
      // ✅ AUTOMAÇÃO: Backend já gera atividades automaticamente na mudança de etapa
      console.log('✅ Backend irá gerar atividades automaticamente para nova etapa via leadService.moveLeadToStage');
      
    } catch (error) {
      console.error('❌ Erro ao mover lead:', error);
    }
  }, [localLeadData, pipelineStages, user, onUpdate, loadHistory]);

  // ✅ CORREÇÃO: Carregar stages quando modal abre (otimizado)
  useEffect(() => {
    if (!lead?.id || !isOpen || !localLeadData?.pipeline_id) return; // ✅ GUARDS completos
    
    // ✅ THROTTLING: Evitar carregamentos excessivos
    const timeoutId = setTimeout(() => {
      loadPipelineStages();
    }, 150); // Delay maior para stages (menos crítico)

    return () => clearTimeout(timeoutId);
  }, [isOpen, lead?.id, localLeadData?.pipeline_id]); // ✅ CORREÇÃO: Dependências específicas

  // ✅ IMPLEMENTAÇÃO: Funções de controle de edição (baseadas no LeadViewModal)
  // 🚀 OTIMIZAÇÃO: Reduzir logs para melhorar performance

  // ✅ SIMPLIFICADO: Mapeamento direto de campos sem estratégias complexas
  const FIELD_MAPPING: Record<string, { table: string; field?: string; isCustomData?: boolean }> = {
    // DADOS DO LEAD - Salvos em leads_master 
    'nome_lead': { table: 'leads_master', field: 'first_name' }, // Simplificado para first_name apenas
    'email': { table: 'leads_master', field: 'email' },
    'telefone': { table: 'leads_master', field: 'phone' },
    
    // DADOS DA OPORTUNIDADE - Salvos em custom_data do pipeline_leads
    // ✅ CORREÇÃO: nome_oportunidade deve ser salvo como 'nome' no custom_data
    'nome_oportunidade': { table: 'pipeline_leads', isCustomData: true },
    'valor': { table: 'pipeline_leads', isCustomData: true },
    'links_oportunidade': { table: 'pipeline_leads', isCustomData: true },
    'notas_oportunidade': { table: 'pipeline_leads', isCustomData: true }
  };

  // ✅ CORREÇÃO BABEL SYNTAX: Separar métodos de salvamento para evitar nested try-catch complex
  const executeRpcSave = async (fieldName: string, inputValue: string, isLeadsMaster: boolean): Promise<any> => {
    console.log('🚀 [LeadDetailsModal] Tentativa 1: RPC update_lead_field_safe');
    
    // ✅ CORREÇÃO: Mapear nome_oportunidade para 'nome' no banco
    const dbFieldName = fieldName === 'nome_oportunidade' ? 'nome' : fieldName;
    
    const rpcResponse = await supabase.rpc('update_lead_field_safe', {
      p_field_name: dbFieldName,
      p_field_value: inputValue, 
      p_lead_id: localLeadData!.id,
      p_lead_master_id: localLeadData!.lead_master_id || null,
      p_is_leads_master: isLeadsMaster
    });
    
    if (rpcResponse.error) {
      console.warn('⚠️ [LeadDetailsModal] RPC falhou:', rpcResponse.error.code, rpcResponse.error.message);
      throw rpcResponse.error;
    }
    
    console.log('✅ [LeadDetailsModal] RPC executado com sucesso');
    return rpcResponse.data;
  };

  const executeSqlFallback = async (fieldName: string, inputValue: string, isLeadsMaster: boolean): Promise<any> => {
    console.log('🔄 [LeadDetailsModal] Tentativa 2: SQL fallback');
    
    // ✅ CORREÇÃO: Mapear nome_oportunidade para 'nome' no banco
    const dbFieldName = fieldName === 'nome_oportunidade' ? 'nome' : fieldName;
    
    const sqlQuery = `
      SELECT public.update_lead_field_safe(
        '${dbFieldName.replace(/'/g, "''")}'::text,
        '${String(inputValue).replace(/'/g, "''")}'::text,
        '${localLeadData!.id}'::uuid,
        ${localLeadData!.lead_master_id ? `'${localLeadData!.lead_master_id}'::uuid` : 'null::uuid'},
        ${isLeadsMaster}::boolean
      ) as result;
    `;
    
    const sqlResponse = await supabase.rpc('execute_sql', { sql_query: sqlQuery });
    
    if (sqlResponse.error) {
      console.warn('⚠️ [LeadDetailsModal] Fallback SQL também falhou:', sqlResponse.error);
      throw sqlResponse.error;
    }
    
    console.log('✅ [LeadDetailsModal] Fallback SQL executado com sucesso');
    return sqlResponse.data?.[0]?.result;
  };

  const executeDirectUpdate = async (fieldName: string, inputValue: string, isLeadsMaster: boolean): Promise<any> => {
    console.log('🔄 [LeadDetailsModal] Tentativa 3: Update direto');
    
    if (isLeadsMaster) {
      // Update direto em leads_master
      if (fieldName === 'nome_lead') {
        const nameParts = inputValue.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        await supabase
          .from('leads_master')
          .update({ 
            first_name: firstName, 
            last_name: lastName,
            updated_at: new Date().toISOString()
          })
          .eq('id', localLeadData!.lead_master_id);
          
        await supabase
          .from('pipeline_leads')
          .update({ 
            custom_data: { 
              ...localLeadData!.custom_data, 
              nome_lead: inputValue 
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', localLeadData!.id);
      } else if (fieldName === 'email') {
        await supabase
          .from('leads_master')
          .update({ email: inputValue, updated_at: new Date().toISOString() })
          .eq('id', localLeadData!.lead_master_id);
          
        await supabase
          .from('pipeline_leads')
          .update({ 
            custom_data: { ...localLeadData!.custom_data, email: inputValue },
            updated_at: new Date().toISOString()
          })
          .eq('id', localLeadData!.id);
      } else if (fieldName === 'telefone') {
        await supabase
          .from('leads_master')
          .update({ phone: inputValue, updated_at: new Date().toISOString() })
          .eq('id', localLeadData!.lead_master_id);
          
        await supabase
          .from('pipeline_leads')
          .update({ 
            custom_data: { ...localLeadData!.custom_data, telefone: inputValue },
            updated_at: new Date().toISOString()
          })
          .eq('id', localLeadData!.id);
      }
    } else {
      // Update direto em pipeline_leads (campos customizados)
      // ✅ CORREÇÃO: Mapear nome_oportunidade para 'nome' no banco
      const dbFieldName = fieldName === 'nome_oportunidade' ? 'nome' : fieldName;
      
      await supabase
        .from('pipeline_leads')
        .update({ 
          custom_data: { 
            ...localLeadData!.custom_data, 
            [dbFieldName]: inputValue 
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', localLeadData!.id);
    }
    
    console.log('✅ [LeadDetailsModal] Update direto executado com sucesso');
    return {
      success: true,
      message: 'Campo atualizado com update direto',
      data: {
        field_name: fieldName,
        field_value: inputValue,
        updated_at: new Date().toISOString()
      }
    };
  };


  // ✅ VALIDAÇÃO DEFENSIVA: Early return APÓS todos os hooks
  if (!lead) {
    // AIDEV-NOTE: Lead null é comportamento normal, não um erro - apenas return null silencioso
    return null;
  }

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Só fechar se clicou no overlay (não no modal)
        if (e.target === e.currentTarget) {
          if (isUpdatingStage) {
            return;
          }
          
          if (onForceClose) {
            onForceClose();
          } else {
            protectedOnClose();
          }
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Minimalista */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-8 w-8 hover:bg-gray-100" disabled={uiState.deleting}>
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600 cursor-pointer" 
                    onClick={() => setUIState({ showDeleteDialog: true })}
                    disabled={uiState.deleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir negócio
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <h2 className="text-lg font-semibold text-gray-900">
                {getLeadData('nome_oportunidade') || getLeadData('titulo_oportunidade') || getLeadData('titulo') || 'Oportunidade sem título'}
              </h2>
            </div>
            
            {/* ✅ NOVO: Badges MQL e Temperatura (SEMPRE VISÍVEIS) */}
            <div className="flex items-center space-x-2">
              {/* Badge de Qualificação (Lead/MQL/SQL) - SEMPRE APARECE */}
              <div 
                className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
                  qualificationBadge.color
                )}
                title={qualificationBadge.tooltip}
              >
                <span className="mr-1">{qualificationBadge.icon}</span>
                {qualificationBadge.label}
              </div>
              
              {/* Badge de Temperatura */}
              <div 
                className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
                  temperatureBadge.color
                )}
                title={temperatureBadge.tooltip}
              >
                <span className="mr-1">{temperatureBadge.icon}</span>
                {temperatureBadge.label}
              </div>
            </div>
            
            {/* ✅ NOVO: Pipeline Horizontal Minimalista */}
            <MinimalHorizontalStageSelector
              leadId={localLeadData.id}
              currentStageId={localLeadData.stage_id}
              onStageChange={onUpdate}
            />
            
            {isUpdatingStage && (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 animate-pulse">
                  ⚡ Atualizando...
                </span>
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              protectedOnClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ✅ NOVO LAYOUT: 3 Blocos Fixos - Proporção Ideal: 25% | 50% | 25% */}
        <div className="grid grid-cols-12 gap-6 flex-1 p-6 overflow-hidden min-h-0">
          {/* BLOCO 1: Dados Lead & Oportunidade (Esquerda - 25%) */}
          <div className="col-span-3 bg-gray-50 rounded-lg p-4 overflow-y-auto border border-gray-200">
            <LeadDataBlock {...leadDataBlockProps} />
          </div>

          {/* BLOCO 2: Menu Interativo (Centro - 50%) - Sem scroll, usa altura completa */}
          <div className="col-span-6 bg-white rounded-lg p-4 border border-gray-200 flex flex-col">
            <InteractiveMenuBlock
              lead={localLeadData}
              activeInteractiveTab={activeInteractiveTab}
              setActiveInteractiveTab={setActiveInteractiveTab}
              pipelineId={pipelineId} // ✅ NOVO: Pipeline ID para DocumentsTab
              
              // Cadência
              leadTasks={leadTasks}
              cadenceLoading={uiState.cadenceLoading}
              loadLeadTasks={() => {
                // ✅ CORREÇÃO: Wrapper que usa query invalidation
                queryClient.invalidateQueries({ 
                  queryKey: ['card-tasks', localLeadData.id, user?.tenant_id],
                  refetchType: 'active'
                });
                queryClient.invalidateQueries({ 
                  queryKey: ['leadTasks', localLeadData.id],
                  refetchType: 'active'
                });
              }}
              handleCompleteTask={handleCompleteTask}
              
              // Feedback
              feedbacks={feedbacks}
              feedbacksLoading={feedbacksLoading}
              newFeedback={newFeedback}
              setNewFeedback={setNewFeedback}
              feedbackType={feedbackType}
              setFeedbackType={setFeedbackType}
              handleAddFeedbackWrapper={handleAddFeedbackWrapper}
              
              // Custom Activity Modal
              onOpenCustomActivity={handleOpenCustomActivity}
            />
          </div>

          {/* BLOCO 3: Histórico Completo (Direita - 25%) */}
          <div className="col-span-3 bg-gray-50 rounded-lg p-4 overflow-y-auto border border-gray-200">
            <HistoryBlock
              lead={localLeadData}
              history={history}
              historyLoading={historyLoading}
              loadHistory={loadHistory}
            />
          </div>
        </div>
      </div>

      {/* Modal de Adicionar Atividade Manual */}
      <AddManualActivityModal
        isOpen={uiState.showAddManualActivityModal}
        onClose={handleCloseAddManualActivity}
        leadId={localLeadData.id}
        pipelineId={localLeadData.pipeline_id}
        leadName={getLeadData('nome_lead') || getLeadData('nome_contato') || 'Lead sem nome'}
        onSuccess={() => {
          // ✅ CORREÇÃO: Usar invalidação de queries ao invés de chamada direta
          queryClient.invalidateQueries({ 
            queryKey: ['card-tasks', localLeadData.id, user?.tenant_id],
            refetchType: 'active'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['leadTasks', localLeadData.id],
            refetchType: 'active'
          });
          // Fechar modal
          setUIState({ showAddManualActivityModal: false });
        }}
      />

      {/* Modal de Atividade Personalizada */}
      <CustomActivityModal
        isOpen={uiState.showCustomActivityModal}
        onClose={() => setUIState({ showCustomActivityModal: false })}
        onSave={handleSaveCustomActivity}
        leadId={localLeadData.id}
      />

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={uiState.showDeleteDialog} onOpenChange={(open) => setUIState({ showDeleteDialog: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão da Oportunidade</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir apenas esta oportunidade da pipeline. 
              O lead será mantido e ficará disponível no menu Leads para criar novas oportunidades.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uiState.deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOpportunity}
              disabled={uiState.deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {uiState.deleting ? 'Excluindo...' : 'Excluir Oportunidade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ✅ CORREÇÃO CRÍTICA: React.memo ultra-otimizado para performance máxima
const MemoizedLeadDetailsModal = React.memo(LeadDetailsModal, (prevProps, nextProps) => {
  // 🚀 EARLY EXIT 1: Modal fechado - skip re-render se ambos fechados
  if (!prevProps.isOpen && !nextProps.isOpen) {
    return true; 
  }
  
  // 🚀 EARLY EXIT 2: Modal abrindo/fechando - sempre re-render
  if (prevProps.isOpen !== nextProps.isOpen) {
    return false; 
  }
  
  // 🚀 EARLY EXIT 3: Lead mudou para null/undefined - sempre re-render
  if (!prevProps.lead || !nextProps.lead) {
    return prevProps.lead === nextProps.lead;
  }
  
  // 🚀 EARLY EXIT 4: ID do lead mudou - sempre re-render
  if (prevProps.lead.id !== nextProps.lead.id) {
    return false;
  }
  
  // 🚀 OTIMIZAÇÃO: Comparação mínima apenas das props críticas
  const isEqual = (
    prevProps.pipelineId === nextProps.pipelineId &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.isUpdatingStage === nextProps.isUpdatingStage &&
    prevProps.lead.stage_id === nextProps.lead.stage_id &&
    prevProps.lead.updated_at === nextProps.lead.updated_at
  );
  
  return isEqual;
});

export default MemoizedLeadDetailsModal; 