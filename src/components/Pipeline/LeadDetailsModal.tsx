import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { X, User, Mail, MessageCircle, ThumbsUp, ThumbsDown, Clock, Phone, Building, DollarSign, MapPin, Calendar, Target, Thermometer, Globe, FileText, Activity, ChevronDown, CheckCircle, AlertCircle, PlayCircle, ArrowRight, Zap, Edit, Check, X as XIcon, Flame, Snowflake, ThermometerSnowflake, Star, Trophy, MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTemperatureAPI } from '../../hooks/useTemperatureAPI';
import { generateTemperatureBadge } from '../../utils/temperatureUtils';
import { useDeleteOpportunityMutation } from '../../hooks/useDeleteOpportunityMutation';
// ✅ IMPORTAR NOVOS COMPONENTES DOS BLOCOS
import LeadDataBlock from './blocks/LeadDataBlock';
import InteractiveMenuBlock from './blocks/InteractiveMenuBlock';
import HistoryBlock from './blocks/HistoryBlock';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { showErrorToast } from '../../hooks/useToast';
import { Lead, CustomField } from '../../types/Pipeline';
import { registerComment, registerFeedback, registerStageMove } from '../../utils/historyUtils';
import { checkHistoryTable } from '../../utils/fixHistoryTables';
import { useLeadTasks, LeadTask } from '../../hooks/useLeadTasks';
import { useLeadComments } from '../../hooks/useLeadComments';
import { useLeadFeedbacks } from '../../hooks/useLeadFeedbacks';
import { useLeadHistory } from '../../hooks/useLeadHistory';
import { StageSelector } from './StageSelector';
import { MinimalHorizontalStageSelector } from './MinimalHorizontalStageSelector';
import { EnhancedGoogleCalendarTab } from '../meetings/EnhancedGoogleCalendarTab';
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

// ✅ ETAPA 2: Sistema de logs condicionais para evitar spam
const DEBUG_LOGS = process.env.NODE_ENV === 'development' && false; // Altere para true se precisar debugar

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  customFields: CustomField[];
  pipelineId?: string; // Pipeline ID para carregar configuração de temperatura
  onUpdate?: (leadId: string, updatedData: any) => void;
  activeTab?: string;
  isUpdatingStage?: boolean;
  onForceClose?: () => void;
}

interface Comment {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
}

interface Feedback {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  message: string;
  comment?: string; // ✅ ETAPA 1: Campo adicional para compatibilidade
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
  customFields,
  pipelineId,
  onUpdate,
  activeTab: externalActiveTab,
  isUpdatingStage = false,
  onForceClose
}) => {
  const { user } = useAuth();
  
  // 🌡️ Hook para configuração de temperatura personalizada
  const { config: temperatureConfig } = useTemperatureAPI({ 
    pipelineId: pipelineId || lead.pipeline_id || '', 
    autoLoad: true 
  });
  
  // ✅ NOVO: Estado para controle do menu interativo (Bloco 2)
  const [activeInteractiveTab, setActiveInteractiveTab] = useState('cadencia');

  // ✅ PASSO 2: ESTADO LOCAL REATIVO PARA SINCRONAÇÃO (LEADDETAILSMODAL)
  const [localLeadData, setLocalLeadData] = useState(lead);

  // ✅ ETAPA 2: Estados para o seletor de stages
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);
  const [showStageSelector, setShowStageSelector] = useState(false);

  // ✅ IMPLEMENTAÇÃO: Estados para edição inline (inspirado no LeadViewModal)
  const [editing, setEditing] = useState<{[key: string]: boolean}>({});
  const [editValues, setEditValues] = useState<{[key: string]: string}>({});
  const [saving, setSaving] = useState<{[key: string]: boolean}>({});
  
  // Estados para o menu 3 pontos e exclusão de oportunidade
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ✅ NOVA IMPLEMENTAÇÃO: Hook de mutation para exclusão de oportunidade
  const deleteOpportunityMutation = useDeleteOpportunityMutation(localLeadData?.pipeline_id || '');

  // ✅ CORREÇÃO DEFINITIVA: Remover completamente o useEffect problemático
  React.useEffect(() => {
    const handleLeadDataUpdate = (event: CustomEvent) => {
      const { 
        leadMasterId, 
        pipelineLeadIds = [], 
        cardData, 
        leadData, 
        timestamp,
        source 
      } = event.detail;
      
      // ✅ ETAPA 2: IDENTIFICAÇÃO ROBUSTA SIMPLIFICADA (IGUAL AO DRAGGABLELEADCARD)
      const isThisLead = 
        // 1. Via lead_master_id direto (método principal)
        (leadMasterId && localLeadData.lead_master_id === leadMasterId) ||
        
        // 2. Via ID do pipeline_lead (método secundário)
        (pipelineLeadIds && pipelineLeadIds.length > 0 && pipelineLeadIds.includes(localLeadData.id)) ||
        
        // 3. Via email (método de fallback)
        (localLeadData.custom_data?.email && 
         (cardData?.email || leadData?.email) && 
         localLeadData.custom_data.email.toLowerCase().trim() === 
         (cardData?.email || leadData?.email).toLowerCase().trim());
      
      if (isThisLead) {
        if (DEBUG_LOGS) {
          console.log('🎯 [LeadDetailsModal] ETAPA 2: Sincronização aprimorada:', {
            leadId: localLeadData.id,
            leadMasterId,
            source,
            dataSource: cardData?.data_source || 'unknown'
          });
        }
        
        // ✅ ETAPA 2: ATUALIZAÇÃO DIRETA COM DADOS DA FONTE ÚNICA
        setLocalLeadData(prevLead => ({
          ...prevLead,
          lead_master_id: leadMasterId,
          custom_data: {
            ...prevLead.custom_data,
            // ✅ USAR CARDDATA COMPLETO (já vem de leads_master)
            ...(cardData || {}),
            // ✅ GARANTIR CAMPOS ESSENCIAIS
            lead_master_id: leadMasterId,
            last_sync_at: timestamp || new Date().toISOString(),
            sync_source: source || 'unknown'
          }
        }));
        
        if (DEBUG_LOGS) {
          console.log('✅ [LeadDetailsModal] ETAPA 2: Modal sincronizado com fonte única');
        }
      }
    };

    // Registrar listener
    window.addEventListener('leadDataUpdated', handleLeadDataUpdate as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('leadDataUpdated', handleLeadDataUpdate as EventListener);
    };
  }, []); // ✅ CORREÇÃO DEFINITIVA: Array vazio elimina loop infinito

  // ✅ PASSO 2: SINCRONIZAR ESTADO LOCAL QUANDO LEAD PROP MUDAR (LEADDETAILSMODAL)
  React.useEffect(() => {
    setLocalLeadData(lead);
  }, [lead]);

  // ✅ ETAPA 1: Função de fechamento simplificada (sistema de bloqueio removido)
  const protectedOnClose = React.useCallback(() => {
    // Verificar apenas se está atualizando etapa
    if (isUpdatingStage) {
      return;
    }
    
    onClose();
  }, [onClose, isUpdatingStage]);

  // ✅ NOVA IMPLEMENTAÇÃO: Função para excluir oportunidade usando TanStack Query Mutation
  const handleDeleteOpportunity = async () => {
    try {
      setDeleting(true);
      setShowDeleteDialog(false);
      
      // Usar mutation que automaticamente invalida cache
      await deleteOpportunityMutation.mutateAsync({
        leadId: localLeadData.id
      });
      
      // Fechar modal após sucesso da mutation
      protectedOnClose();
      
    } catch (error) {
      console.error('❌ Erro ao excluir oportunidade:', error);
      alert('Erro ao excluir oportunidade. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  // ✅ ETAPA 1: Sistema de controle isolado removido - usando apenas props
  React.useEffect(() => {
    // Sistema simplificado sem modalControl
  }, [isOpen, lead.id]);

  // Usando hooks customizados para dados do lead
  const {
    comments,
    loading: commentsLoading,
    newComment,
    setNewComment,
    loadComments,
    handleAddComment
  } = useLeadComments(localLeadData.id);

  const {
    feedbacks,
    loading: feedbacksLoading,
    newFeedback,
    setNewFeedback,
    feedbackType,
    setFeedbackType,
    loadFeedbacks,
    handleAddFeedback
  } = useLeadFeedbacks(localLeadData.id);

  const {
    history,
    historyLoading,
    loadHistory
  } = useLeadHistory(localLeadData.id);
  
  // Estados específicos para cadência
  const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);
  const [cadenceLoading, setCadenceLoading] = useState(false);

  // ✅ BADGES MEMOIZADAS PARA PERFORMANCE OTIMIZADA
  
  // Badge de qualificação inteligente - sempre mostra status
  const qualificationBadge = useMemo(() => {
    const leadCustomData = localLeadData.custom_data || {};
    const lifecycleStage = localLeadData.lifecycle_stage || 
                          leadCustomData.lifecycle_stage || 
                          'lead';
    
    if (lifecycleStage === 'mql') {
      return {
        label: 'MQL',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: <Star className="w-3 h-3" />,
        tooltip: 'Marketing Qualified Lead'
      };
    }
    if (lifecycleStage === 'sql') {
      return {
        label: 'SQL',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <Trophy className="w-3 h-3" />,
        tooltip: 'Sales Qualified Lead'
      };
    }
    // ✅ NOVO: Sempre mostrar badge "Lead" quando lifecycle_stage = 'lead'
    if (lifecycleStage === 'lead') {
      return {
        label: 'Lead',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <User className="w-3 h-3" />,
        tooltip: 'Lead'
      };
    }
    // Fallback: sempre mostrar Lead se não for MQL/SQL
    return {
      label: 'Lead',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: <User className="w-3 h-3" />,
      tooltip: 'Lead'
    };
  }, [localLeadData.lifecycle_stage, localLeadData.custom_data]);

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
  }, [localLeadData.temperature_level, localLeadData.custom_data, temperatureConfig]);

  // ✅ SISTEMA DE ACTIVETAB REMOVIDO - Nova interface de 3 blocos não usa tabs

  // ✅ ETAPA 1: Função otimizada para obter dados do lead
  const getLeadData = (key: string): any => {
    const currentLead = localLeadData;
    const customData = currentLead.custom_data || {};
    const leadData = (currentLead as any).lead_data || {};
    
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
    if ((currentLead as any)[key] !== undefined && (currentLead as any)[key] !== null) {
      return (currentLead as any)[key];
    }
    
    // 4. Mapeamento de campos especiais (mais eficiente)
    const fieldMappings: Record<string, string[]> = {
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
    
    // 5. Buscar usando mapeamentos
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
  };

  // Detectar mudanças no isOpen para debug
  useEffect(() => {
    // Log otimizado para evitar spam - isOpen mudou para: isOpen);
    if (!isOpen && isUpdatingStage) {
      console.warn('⚠️ LeadDetailsModal: Modal foi fechado durante atualização de etapa!');
    }
  }, [isOpen, isUpdatingStage]);

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
  const formatValueChange = (oldValues: any, newValues: any, action: string) => {
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
  };

  const getStatusBadge = (task: LeadTask) => {
    const statusInfo = getTaskStatusInfo(task);
    if (!statusInfo) return null;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const renderChannelIcon = (canal: string) => {
    switch (canal) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      case 'ligacao': return <Phone className="w-4 h-4" />;
      case 'sms': return <MessageCircle className="w-4 h-4" />;
      case 'tarefa': return <FileText className="w-4 h-4" />;
      case 'visita': return <MapPin className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Carregar tarefas do lead
  const loadLeadTasks = useCallback(async () => {
    try {
      setCadenceLoading(true);
      if (DEBUG_LOGS) {
        }
      
      const { data: tasksData, error } = await supabase
        .from('lead_tasks')
        .select('*')
        .eq('lead_id', localLeadData.id)
        .order('data_programada', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar tarefas:', error);
        setLeadTasks([]);
        return;
      }

      setLeadTasks(tasksData || []);
      if (DEBUG_LOGS) {
        console.log('✅ Tarefas carregadas:', (tasksData || []).length);
      }
    } catch (error) {
      console.error('❌ Erro geral ao carregar tarefas:', error);
      setLeadTasks([]);
    } finally {
      setCadenceLoading(false);
    }
  }, [localLeadData.id]);

  // Função handleAddComment agora vem do hook useLeadComments

  // Wrapper para handleAddComment compatível com botões
  const handleAddCommentWrapper = useCallback(async () => {
    if (!user?.id) return;
    await handleAddComment(user.id, loadHistory);
  }, [user?.id, handleAddComment, loadHistory]);

  // Wrapper para handleAddFeedback compatível com botões
  const handleAddFeedbackWrapper = useCallback(async () => {
    if (!user?.id) return;
    await handleAddFeedback(user.id, loadHistory);
  }, [user?.id, handleAddFeedback, loadHistory]);

  // Completar tarefa
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

      // Recarregar tarefas
      await loadLeadTasks();

      console.log('✅ Tarefa marcada como concluída');
    } catch (error) {
      console.error('❌ Erro ao completar tarefa:', error);
    }
  }, []); // ✅ CORREÇÃO: Remover loadLeadTasks das dependências

  // ✅ CORREÇÃO DO LOOP INFINITO: Incluir funções estáveis nas dependências
  useEffect(() => {
    if (isOpen) {
      if (DEBUG_LOGS) {
        }
      
      // Carregar todos os dados quando o modal abre
      loadComments();
      loadFeedbacks();
      loadHistory();
      loadLeadTasks();
    }
  }, [isOpen, localLeadData.id, loadComments, loadFeedbacks, loadHistory, loadLeadTasks]); // ✅ Incluir funções estáveis

  // Carregar histórico quando modal abrir (novo layout de 3 blocos sempre mostra histórico)
  useEffect(() => {
    if (isOpen) {
      if (DEBUG_LOGS) {
        console.log('🔄 [LeadDetailsModal] Modal aberto, carregando histórico...');
      }
      loadHistory();
    }
  }, [isOpen, loadHistory]); // ✅ Simplicado - nova interface sempre carrega histórico

  // ✅ ETAPA 2: Função para carregar stages da pipeline
  const loadPipelineStages = useCallback(async () => {
    if (!localLeadData.pipeline_id) return;
    
    try {
      setLoadingStages(true);
      
      const { data: stages, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', localLeadData.pipeline_id)
        .order('order_index', { ascending: true });
      
      if (error) {
        console.error('❌ Erro ao carregar stages:', error);
        return;
      }
      
      setPipelineStages(stages || []);
    } catch (error) {
      console.error('❌ Erro geral ao carregar stages:', error);
    } finally {
      setLoadingStages(false);
    }
  }, [localLeadData.pipeline_id]);

  // ✅ ETAPA 2: Função para mover lead para outro stage
  const handleStageMove = useCallback(async (newStageId: string) => {
    if (!user?.id || newStageId === localLeadData.stage_id) return;
    
    try {
      const oldStageId = localLeadData.stage_id;
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
        .eq('id', localLeadData.id);
      
      if (error) {
        console.error('❌ Erro ao mover lead:', error);
        return;
      }
      
      // Registrar no histórico
      await registerStageMove(
        localLeadData.id,
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
        onUpdate(localLeadData.id, { stage_id: newStageId });
      }
      
      // Fechar dropdown
      setShowStageSelector(false);
      
      console.log(`✅ Lead movido de "${oldStage?.name}" para "${newStage.name}"`);
      
    } catch (error) {
      console.error('❌ Erro ao mover lead:', error);
    }
  }, [localLeadData, pipelineStages, user, onUpdate, loadHistory]);

  // ✅ ETAPA 2: Carregar stages quando modal abre
  useEffect(() => {
    if (isOpen && localLeadData.pipeline_id) {
      loadPipelineStages();
    }
  }, [isOpen, localLeadData.pipeline_id, loadPipelineStages]);

  // ✅ IMPLEMENTAÇÃO: Funções de controle de edição (baseadas no LeadViewModal)
  const handleInputChange = useCallback((field: string, value: string) => {
    console.log('🔄 [LeadDetailsModal] handleInputChange - field:', field, 'value:', value);
    setEditValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const startEditing = useCallback((field: string, currentValue: string) => {
    console.log('🔄 [LeadDetailsModal] startEditing - field:', field, 'currentValue:', currentValue);
    setEditing(prev => ({ ...prev, [field]: true }));
    setEditValues(prev => ({ ...prev, [field]: currentValue || '' }));
  }, []);

  const cancelEditing = useCallback((field: string) => {
    console.log('🔄 [LeadDetailsModal] cancelEditing - field:', field);
    setEditing(prev => ({ ...prev, [field]: false }));
    setEditValues(prev => ({ ...prev, [field]: '' }));
  }, []);

  // ✅ IMPLEMENTAÇÃO: Mapeamento de campos seguindo estratégia arquitetural dupla
  const FIELD_STRATEGY: Record<string, any> = {
    // DADOS DO LEAD - Salvos em leads_master (fonte única) + sync para todos pipeline_leads
    'nome_lead': { table: 'leads_master', fields: ['first_name', 'last_name'], handler: 'special_name', syncToAll: true },
    'email': { table: 'leads_master', field: 'email', handler: 'direct', syncToAll: true },
    'telefone': { table: 'leads_master', field: 'phone', handler: 'direct', syncToAll: true },
    
    // DADOS DA OPORTUNIDADE - Salvos apenas em custom_data desta oportunidade
    'nome_oportunidade': { table: 'pipeline_leads', path: 'custom_data', handler: 'direct', syncToAll: false },
    'valor': { table: 'pipeline_leads', path: 'custom_data', handler: 'number', syncToAll: false },
    'notas_oportunidade': { table: 'pipeline_leads', path: 'custom_data', handler: 'direct', syncToAll: false },
    
    // CAMPOS CUSTOMIZADOS - Salvos apenas em custom_data desta oportunidade
    // Serão mapeados dinamicamente baseado em customFields
  };

  // ✅ IMPLEMENTAÇÃO: Função principal de salvamento com estratégia dupla
  const saveField = useCallback(async (fieldName: string) => {
    console.log('💾 [LeadDetailsModal] Iniciando salvamento estratégico do campo:', fieldName, 'Valor:', editValues[fieldName]);
    
    if (!localLeadData?.id) {
      console.error('❌ [LeadDetailsModal] ID do lead não encontrado');
      return;
    }

    if (editValues[fieldName] === undefined || editValues[fieldName] === null || editValues[fieldName] === '') {
      console.warn('⚠️ [LeadDetailsModal] Valor do campo vazio:', fieldName);
      // Permitir salvar valores vazios para limpar campos
    }

    try {
      setSaving(prev => ({ ...prev, [fieldName]: true }));
      
      const inputValue = editValues[fieldName] || '';
      let strategy = FIELD_STRATEGY[fieldName as keyof typeof FIELD_STRATEGY];
      
      // ✅ Para campos customizados, criar estratégia dinamicamente
      if (!strategy) {
        const fieldsArray = Array.isArray(customFields) ? customFields : ((customFields as any)?.fields || []);
        const customField = fieldsArray.find((cf: any) => cf.field_name === fieldName);
        if (customField) {
          strategy = { 
            table: 'pipeline_leads', 
            path: 'custom_data', 
            handler: customField.field_type === 'number' ? 'number' : 'direct', 
            syncToAll: false 
          };
          console.log('📝 [LeadDetailsModal] Campo customizado detectado:', fieldName, strategy);
        } else {
          console.log('📝 [LeadDetailsModal] Campo será salvo em custom_data:', fieldName);
          strategy = { 
            table: 'pipeline_leads', 
            path: 'custom_data', 
            handler: 'direct', 
            syncToAll: false 
          };
        }
      }

      console.log('📡 [LeadDetailsModal] Estratégia para campo:', fieldName, strategy);

      // ✅ ESTRATÉGIA DUPLA: LEADS_MASTER vs CUSTOM_DATA
      if (strategy.table === 'leads_master' && localLeadData.lead_master_id) {
        console.log('🎯 [LeadDetailsModal] SALVANDO EM LEADS_MASTER (fonte única)');
        
        let updateData: any = {};
        let customDataUpdate: any = {};
        
        // Processar valor baseado no handler
        switch (strategy.handler) {
          case 'special_name':
            const parts = inputValue.trim().split(' ');
            updateData.first_name = parts[0] || '';
            updateData.last_name = parts.slice(1).join(' ') || '';
            customDataUpdate.nome_lead = `${updateData.first_name} ${updateData.last_name}`.trim();
            console.log('📝 [LeadDetailsModal] Nome processado:', updateData);
            break;
            
          case 'direct':
            if (strategy.field) {
              updateData[strategy.field] = inputValue;
              if (strategy.field === 'email') {
                customDataUpdate.email = inputValue;
              } else if (strategy.field === 'phone') {
                customDataUpdate.telefone = inputValue;
              }
            }
            break;
        }
        
        // 1. Atualizar leads_master (fonte única)
        const { data: updatedLead, error: masterError } = await supabase
          .from('leads_master')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', localLeadData.lead_master_id)
          .select()
          .single();
          
        if (masterError) {
          throw masterError;
        }
        
        console.log('✅ [LeadDetailsModal] Leads_master atualizado:', updatedLead.id);
        
        // 2. Buscar TODOS os pipeline_leads relacionados para sincronização
        const { data: allPipelineLeads, error: searchError } = await supabase
          .from('pipeline_leads')
          .select('id, custom_data')
          .eq('lead_master_id', localLeadData.lead_master_id);
          
        if (!searchError && allPipelineLeads && allPipelineLeads.length > 0) {
          console.log(`🔄 [LeadDetailsModal] Sincronizando com ${allPipelineLeads.length} pipeline_leads`);
          
          // Atualizar todos os pipeline_leads relacionados
          const updatePromises = allPipelineLeads.map(pl => 
            supabase
              .from('pipeline_leads')
              .update({
                custom_data: {
                  ...pl.custom_data,
                  ...customDataUpdate,
                  last_sync_at: new Date().toISOString(),
                  sync_source: 'leadDetailsModal_edit'
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', pl.id)
          );
          
          await Promise.all(updatePromises);
          console.log('✅ [LeadDetailsModal] Sincronização com pipeline_leads concluída');
        }
        
        // 3. Atualizar estado local com dados de leads_master
        setLocalLeadData(prev => ({
          ...prev,
          custom_data: {
            ...prev.custom_data,
            ...customDataUpdate
          }
        }));
        
        // 4. Disparar evento global para sincronização completa
        const eventData = {
          leadMasterId: localLeadData.lead_master_id,
          pipelineLeadIds: allPipelineLeads?.map(pl => pl.id) || [localLeadData.id],
          cardData: {
            nome_lead: strategy.handler === 'special_name' 
              ? `${updateData.first_name} ${updateData.last_name}`.trim()
              : getLeadData('nome_lead'),
            email: customDataUpdate.email || getLeadData('email'),
            telefone: customDataUpdate.telefone || getLeadData('telefone'),
            lead_master_id: localLeadData.lead_master_id,
            last_sync_at: new Date().toISOString(),
            data_source: 'leads_master',
            sync_method: 'leadDetailsModal_edit'
          },
          timestamp: Date.now(),
          source: 'LeadDetailsModal'
        };
        
        console.log('📡 [LeadDetailsModal] Disparando evento global (fonte única):', eventData);
        window.dispatchEvent(new CustomEvent('leadDataUpdated', { detail: eventData }));
        
      } else {
        console.log('🎯 [LeadDetailsModal] SALVANDO EM CUSTOM_DATA (específico da oportunidade)');
        
        // Processar valor
        let processedValue: any = inputValue;
        if (strategy.handler === 'number') {
          const numValue = parseFloat(inputValue.replace(/[^\d.,]/g, '').replace(',', '.'));
          processedValue = isNaN(numValue) ? null : numValue;
        }
        
        // Atualizar apenas este pipeline_lead específico
        const currentCustomData = localLeadData.custom_data || {};
        const updatedCustomData = {
          ...currentCustomData,
          [fieldName]: processedValue,
          last_sync_at: new Date().toISOString(),
          sync_source: 'leadDetailsModal_edit'
        };
        
        const { error: customError } = await supabase
          .from('pipeline_leads')
          .update({
            custom_data: updatedCustomData,
            updated_at: new Date().toISOString()
          })
          .eq('id', localLeadData.id);
          
        if (customError) {
          throw customError;
        }
        
        console.log('✅ [LeadDetailsModal] Custom_data atualizado para este pipeline_lead');
        
        // Atualizar estado local
        setLocalLeadData(prev => ({
          ...prev,
          custom_data: updatedCustomData
        }));
        
        // Disparar evento local para este pipeline_lead
        const eventData = {
          leadMasterId: localLeadData.lead_master_id,
          pipelineLeadIds: [localLeadData.id],
          cardData: updatedCustomData,
          timestamp: Date.now(),
          source: 'LeadDetailsModal'
        };
        
        console.log('📡 [LeadDetailsModal] Disparando evento local (custom_data):', eventData);
        window.dispatchEvent(new CustomEvent('leadDataUpdated', { detail: eventData }));
      }

      // Limpar estados de edição
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[fieldName];
        return newValues;
      });
      setEditing(prev => ({ ...prev, [fieldName]: false }));

      console.log('🎉 [LeadDetailsModal] Campo salvo com sucesso!');

    } catch (error: any) {
      // ✅ CORREÇÃO: Tratamento melhorado de erros de conectividade
      const isNetworkError = error?.message?.includes('Failed to fetch') || 
                            error?.message?.includes('NetworkError') ||
                            error?.message?.includes('TypeError') ||
                            error?.code === 'network';
      
      if (isNetworkError) {
        console.warn('⚠️ [LeadDetailsModal] Erro de conectividade no salvamento - tente novamente:', fieldName);
        showErrorToast('Erro de conectividade', 'Verifique sua conexão e tente novamente.');
      } else {
        console.error('❌ [LeadDetailsModal] Erro no salvamento:', error);
        showErrorToast('Erro ao salvar', 'Erro ao salvar campo. Tente novamente.');
      }
    } finally {
      setSaving(prev => ({ ...prev, [fieldName]: false }));
    }
  }, [editValues, localLeadData, customFields, getLeadData]);

  // ✅ IMPLEMENTAÇÃO: Função renderEditableField adaptada para LeadDetailsModal
  const renderEditableField = useCallback((
    fieldName: string,
    label: string,
    icon: React.ReactNode,
    placeholder: string = '',
    disabled: boolean = false
  ) => {
    const currentValue = getLeadData(fieldName) || '';
    const isEditing = editing[fieldName];
    const isSaving = saving[fieldName];
    
    return (
      <div className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
        {icon}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-700">{label}:</span>
          {isEditing ? (
            <div className="ml-2 flex items-center space-x-2">
              <input
                type="text"
                value={editValues[fieldName] || ''}
                onChange={(e) => handleInputChange(fieldName, e.target.value)}
                placeholder={placeholder}
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSaving}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    saveField(fieldName);
                  } else if (e.key === 'Escape') {
                    cancelEditing(fieldName);
                  }
                }}
              />
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
            <div className="ml-2 flex items-center justify-between">
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
  }, [editing, saving, editValues, getLeadData, handleInputChange, saveField, startEditing, cancelEditing]);

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
        className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Minimalista */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-8 w-8 hover:bg-gray-100" disabled={deleting}>
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600 cursor-pointer" 
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={deleting}
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
        <div className="grid grid-cols-12 gap-6 h-[85vh] p-6">
          {/* BLOCO 1: Dados Lead & Oportunidade (Esquerda - 25%) */}
          <div className="col-span-3 bg-gray-50 rounded-lg p-4 overflow-y-auto border border-gray-200">
            <LeadDataBlock
              lead={localLeadData}
              customFields={customFields}
              editing={editing}
              saving={saving}
              editValues={editValues}
              getLeadData={getLeadData}
              renderEditableField={renderEditableField}
            />
          </div>

          {/* BLOCO 2: Menu Interativo (Centro - 50%) - Sem scroll, usa altura completa */}
          <div className="col-span-6 bg-white rounded-lg p-4 border border-gray-200 flex flex-col">
            <InteractiveMenuBlock
              lead={localLeadData}
              activeInteractiveTab={activeInteractiveTab}
              setActiveInteractiveTab={setActiveInteractiveTab}
              
              // Cadência
              leadTasks={leadTasks}
              cadenceLoading={cadenceLoading}
              loadLeadTasks={loadLeadTasks}
              handleCompleteTask={handleCompleteTask}
              
              // Comentários
              comments={comments}
              commentsLoading={commentsLoading}
              newComment={newComment}
              setNewComment={setNewComment}
              handleAddCommentWrapper={handleAddCommentWrapper}
              
              // Feedback
              feedbacks={feedbacks}
              feedbacksLoading={feedbacksLoading}
              newFeedback={newFeedback}
              setNewFeedback={setNewFeedback}
              feedbackType={feedbackType}
              setFeedbackType={setFeedbackType}
              handleAddFeedbackWrapper={handleAddFeedbackWrapper}
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

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOpportunity}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Excluindo...' : 'Excluir Oportunidade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeadDetailsModal; 