import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { X, User, Mail, MessageCircle, ThumbsUp, ThumbsDown, Clock, Phone, Building, DollarSign, MapPin, Calendar, Target, Thermometer, Globe, FileText, Activity, ChevronDown, CheckCircle, AlertCircle, PlayCircle, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Lead, CustomField } from '../../types/Pipeline';
import { registerComment, registerFeedback, registerStageMove } from '../../utils/historyUtils';
import { checkHistoryTable } from '../../utils/fixHistoryTables';
import { useLeadTasks, LeadTask } from '../../hooks/useLeadTasks';
import { useLeadComments } from '../../hooks/useLeadComments';
import { useLeadFeedbacks } from '../../hooks/useLeadFeedbacks';
import { useLeadHistory } from '../../hooks/useLeadHistory';
import { StageSelector } from './StageSelector';
import { GoogleCalendarEventModal } from '../GoogleCalendarEventModal';
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

// ✅ ETAPA 2: Sistema de logs condicionais para evitar spam
const DEBUG_LOGS = process.env.NODE_ENV === 'development' && false; // Altere para true se precisar debugar

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  customFields: CustomField[];
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
  onUpdate,
  activeTab: externalActiveTab,
  isUpdatingStage = false,
  onForceClose
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(externalActiveTab || 'dados');

  // ✅ PASSO 2: ESTADO LOCAL REATIVO PARA SINCRONAÇÃO (LEADDETAILSMODAL)
  const [localLeadData, setLocalLeadData] = useState(lead);

  // ✅ ETAPA 2: Estados para o seletor de stages
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);
  const [showStageSelector, setShowStageSelector] = useState(false);

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
    console.log('🔍 MODAL-DETAILS: Tentativa de fechar modal');
    
    // Verificar apenas se está atualizando etapa
    if (isUpdatingStage) {
      console.log('🚫 MODAL-DETAILS: Fechamento bloqueado - etapa sendo atualizada');
      return;
    }
    
    console.log('🚪 MODAL-DETAILS: Fechamento permitido');
    onClose();
  }, [onClose, isUpdatingStage]);

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

  // Atualizar activeTab quando a propriedade externa mudar
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

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

  // Carregar histórico quando aba dados fica ativa
  useEffect(() => {
    if (isOpen && activeTab === 'dados') {
      if (DEBUG_LOGS) {
        }
      loadHistory();
    }
  }, [isOpen, activeTab, loadHistory]); // ✅ Incluir loadHistory nas dependências

  // Atualizar activeTab quando a propriedade externa mudar
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

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
        user.email || 'Sistema'
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Só fechar se clicou no overlay (não no modal)
        if (e.target === e.currentTarget) {
          console.log('🔍 MODAL-DETAILS: Clique no overlay detectado');
          
          if (isUpdatingStage) {
            console.log('🚫 MODAL-DETAILS: Fechamento por overlay BLOQUEADO durante atualização');
            return;
          }
          
          console.log('🚪 MODAL-DETAILS: Fechando modal via overlay');
          if (onForceClose) {
            onForceClose();
          } else {
            protectedOnClose();
          }
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {getLeadData('nome_oportunidade') || getLeadData('titulo_oportunidade') || getLeadData('titulo') || 'Oportunidade sem título'}
            </h2>
            
            {/* ✅ ETAPA 2: Seletor de Stages ao lado do título */}
            <div className="relative">
              <button
                onClick={() => setShowStageSelector(!showStageSelector)}
                disabled={loadingStages}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingStages ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Carregando...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span>{pipelineStages.find(s => s.id === localLeadData.stage_id)?.name || 'Selecionar Etapa'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showStageSelector ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
              
              {/* Dropdown com os stages */}
              {showStageSelector && !loadingStages && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[60] max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2 px-2">Mover para etapa:</div>
                    {pipelineStages.map((stage) => {
                      const isCurrentStage = stage.id === localLeadData.stage_id;
                      return (
                        <button
                          key={stage.id}
                          onClick={() => handleStageMove(stage.id)}
                          disabled={isCurrentStage}
                          className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors text-left ${
                            isCurrentStage
                              ? 'bg-blue-50 text-blue-700 cursor-not-allowed'
                              : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                          }`}
                        >
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: stage.color || '#3B82F6' }}
                          ></div>
                          <span className="flex-1">{stage.name}</span>
                          {isCurrentStage && (
                            <span className="text-xs font-medium text-blue-600">Atual</span>
                          )}
                          {!isCurrentStage && (
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {isUpdatingStage && (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800 border-2 border-yellow-300 animate-bounce">
                  ⚡ Atualizando etapa...
                </span>
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('❌ MODAL-DETAILS: Botão X clicado');
              protectedOnClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'dados', label: 'Dados', icon: User },
            { id: 'cadencia', label: 'Cadência', icon: PlayCircle },
            { id: 'email', label: 'E-mail', icon: Mail },
            { id: 'comentarios', label: 'Comentários', icon: MessageCircle },
            { id: 'feedback', label: 'Feedback', icon: ThumbsUp },
            { id: 'google-calendar', label: 'Google Calendar', icon: Calendar }
          ].map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* ABA DADOS - Duas grids: Informações + Histórico */}
          {activeTab === 'dados' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* GRID 1 - Informações do Lead (Esquerda) */}
              <div className="space-y-4">
                {/* SEÇÃO 1: DADOS DA OPORTUNIDADE - Apenas Nome e Valor */}
                <div>
                  <h3 className="text-md font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">Oportunidade</h3>
                  <div className="space-y-1">
                    {/* Nome da Oportunidade */}
                    {(() => {
                      const nomeOportunidade = getLeadData('nome_oportunidade') || getLeadData('titulo_oportunidade') || getLeadData('titulo') || getLeadData('name');
                      
                      return (
                        <div className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
                          <Target className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700">Nome:</span>
                            <span className="ml-2 text-sm text-gray-900">
                              {nomeOportunidade || 'Oportunidade sem título'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Valor da Oportunidade */}
                    {(() => {
                      const valor = getLeadData('valor') || getLeadData('valor_oportunidade') || getLeadData('valor_proposta') || getLeadData('value');
                      
                      if (valor) {
                        // Limpar e converter valor
                        const valorNumerico = typeof valor === 'string' 
                          ? parseFloat(valor.replace(/[^\d.,]/g, '').replace(',', '.')) || 0
                          : parseFloat(valor) || 0;
                        
                        return (
                          <div className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
                            <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-700">Valor:</span>
                              <span className="ml-2 text-sm text-gray-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorNumerico)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      
                      // Se não encontrou valor, mostrar debug
                      return (
                        <div className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
                          <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700">Valor:</span>
                            <span className="ml-2 text-sm text-gray-500 italic">Não informado</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Documentos da Oportunidade */}
                    {(() => {
                      const documentos = getLeadData('documentos_anexos');
                      
                      return (
                        <div className="flex items-start space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700">Documentos:</span>
                            {documentos && documentos.length > 0 ? (
                              <div className="ml-2 space-y-1">
                                {documentos.map((doc: any, index: number) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <a 
                                      href={doc.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                                    >
                                      {doc.name || `Documento ${index + 1}`}
                                    </a>
                                    <span className="text-xs text-gray-400">
                                      ({doc.type || 'Arquivo'})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="ml-2 text-sm text-gray-500 italic">Nenhum documento anexado</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Links da Oportunidade */}
                    {(() => {
                      const links = getLeadData('links_oportunidade');
                      
                      return (
                        <div className="flex items-start space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
                          <Globe className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700">Links:</span>
                            {links && links.length > 0 ? (
                              <div className="ml-2 space-y-1">
                                {links.map((link: any, index: number) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <a 
                                      href={link.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                                    >
                                      {link.title || link.url}
                                    </a>
                                    {link.description && (
                                      <span className="text-xs text-gray-400">
                                        - {link.description}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="ml-2 text-sm text-gray-500 italic">Nenhum link adicionado</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Notas sobre a Oportunidade */}
                    {(() => {
                      const notas = getLeadData('notas_oportunidade');
                      
                      return (
                        <div className="flex items-start space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
                          <MessageCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700">Notas sobre a oportunidade:</span>
                            {notas && notas.trim() !== '' ? (
                              <div className="ml-2 mt-1">
                                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                                  {notas}
                                </p>
                              </div>
                            ) : (
                              <span className="ml-2 text-sm text-gray-500 italic">Nenhuma nota adicionada</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* SEÇÃO 2: DADOS DO LEAD - Apenas Nome, Email e Telefone */}
                <div>
                  <h3 className="text-md font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">Lead</h3>
                  <div className="space-y-1">
                    {/* Nome do Lead */}
                    {(() => {
                      const nomeLead = getLeadData('nome_lead') || getLeadData('nome_contato') || getLeadData('contato') || getLeadData('nome') || getLeadData('lead_name');
                      
                      return (
                        <div className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
                          <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700">Nome:</span>
                            <span className="ml-2 text-sm text-gray-900">
                              {nomeLead || 'Lead sem nome'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Email do Lead */}
                    {(() => {
                      const email = getLeadData('email') || getLeadData('email_contato');
                      
                      return (
                        <div className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
                          <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700">E-mail:</span>
                            <span className="ml-2 text-sm text-gray-900">
                              {email || <span className="italic text-gray-500">Não informado</span>}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Telefone do Lead */}
                    {(() => {
                      const telefone = getLeadData('telefone') || getLeadData('telefone_contato') || getLeadData('celular') || getLeadData('phone');
                      
                      return (
                        <div className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
                          <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700">Telefone:</span>
                            <span className="ml-2 text-sm text-gray-900">
                              {telefone || <span className="italic text-gray-500">Não informado</span>}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* SEÇÃO 3: CAMPOS CUSTOMIZADOS - Apenas campos reais do pipeline */}
                {(() => {
                  // Lista de campos básicos do sistema que NÃO devem aparecer nos campos customizados
                  const camposBasicosDoSistema = [
                    'nome_oportunidade', 'titulo_oportunidade', 'titulo', 'name',
                    'nome_lead', 'nome_contato', 'contato', 'nome', 'lead_name',
                    'email', 'email_contato',
                    'telefone', 'telefone_contato', 'celular', 'phone',
                    'valor', 'valor_oportunidade', 'valor_proposta', 'value'
                  ];
                  
                  // ✅ CORREÇÃO 1: Mostrar TODOS os campos customizados da pipeline (com ou sem valor)
                  const camposCustomizadosReais = customFields.filter(field => {
                    const naoECampoBasico = !camposBasicosDoSistema.includes(field.field_name);
                    return naoECampoBasico; // Mostrar todos os campos customizados, independente de ter valor
                  });
                  
                  return camposCustomizadosReais.length > 0 ? (
                    <div>
                      <h3 className="text-md font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">
                        Campos Customizados ({camposCustomizadosReais.length})
                      </h3>
                      <div className="space-y-1">
                        {camposCustomizadosReais.map(field => {
                          const IconComponent = getFieldIcon(field.field_type);
                          
                          return (
                            <div key={field.id} className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
                              <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-700">{field.field_label}:</span>
                                <span className="ml-2 text-sm text-gray-900">
                                  {(() => {
                                    const value = getLeadData(field.field_name);
                                    
                                    // ✅ CORREÇÃO 1: Mostrar valor ou "Não informado"
                                    if (value === null || value === undefined || value.toString().trim() === '') {
                                      return <span className="italic text-gray-500">Não informado</span>;
                                    }
                                    
                                    // Para campos select, tentar encontrar o valor nas opções
                                    if (field.field_type === 'select' && field.field_options) {
                                      return field.field_options.find(opt => opt === value) || value;
                                    }
                                    
                                    return value;
                                  })()}
                                </span>
                                {field.is_required && (
                                  <span className="ml-1 text-xs text-red-500">*</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-md font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">
                        Campos Customizados
                      </h3>
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">Nenhum campo customizado preenchido</p>
                        <p className="text-xs mt-1">
                          {customFields.filter(field => !camposBasicosDoSistema.includes(field.field_name)).length > 0 
                            ? `${customFields.filter(field => !camposBasicosDoSistema.includes(field.field_name)).length} campos customizados disponíveis neste pipeline`
                            : 'Nenhum campo customizado configurado para este pipeline'
                          }
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* GRID 2 - Histórico Timeline (Direita) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-semibold text-gray-900">Histórico</h3>
                  <button
                    onClick={loadHistory}
                    disabled={historyLoading}
                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50"
                    title="Recarregar histórico"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>

                {/* ✅ ETAPA 3: Timeline do histórico aprimorada */}
                <div className="h-96 overflow-y-auto pr-2">
                  {historyLoading ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <p className="text-sm">Carregando histórico completo...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">Nenhuma ação registrada</p>
                      <p className="text-xs text-gray-400 mt-1">As ações futuras serão exibidas aqui</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Linha da timeline */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      
                      {(history || []).map((entry, index) => {
                        const ActionIcon = getActionIcon(entry.action);
                        const actionColors = getActionColor(entry.action);
                        
                        return (
                          <div key={entry.id} className="relative flex items-start space-x-4 pb-4">
                            {/* ✅ ETAPA 3: Ponto da timeline com ícone específico e cor */}
                            <div className={`relative z-10 w-8 h-8 ${actionColors.bg} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
                              <ActionIcon className="w-4 h-4 text-white" />
                            </div>
                            
                            {/* ✅ ETAPA 3: Conteúdo enriquecido */}
                            <div className={`flex-1 bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow ${actionColors.bgLight} border-l-4 ${actionColors.bg.replace('bg-', 'border-')}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <h4 className={`text-sm font-semibold ${actionColors.text}`}>
                                    {translateAction(entry.action)}
                                  </h4>
                                  {/* ✅ ETAPA 3: Badge do tipo de usuário */}
                                  {entry.user_role && entry.user_role !== 'system' && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      entry.user_role === 'admin' 
                                        ? 'bg-purple-100 text-purple-700'
                                        : entry.user_role === 'member'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {entry.user_role === 'admin' ? 'Admin' : entry.user_role === 'member' ? 'Member' : entry.user_role}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 font-medium">
                                  {new Date(entry.created_at).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              
                              {/* ✅ ETAPA 3: Descrição com formatação melhorada */}
                              <p className="text-sm text-gray-800 mb-2 leading-relaxed">{entry.description}</p>
                              
                              {/* ✅ ETAPA 3: Informações do usuário */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                    entry.user_role === 'admin' ? 'bg-purple-500' :
                                    entry.user_role === 'member' ? 'bg-blue-500' : 'bg-gray-500'
                                  }`}>
                                    {entry.user_name ? entry.user_name.charAt(0).toUpperCase() : 
                                      <User className="w-3 h-3" />
                                    }
                                  </div>
                                  <span className="text-xs font-medium text-gray-700">{entry.user_name}</span>
                                  {entry.user_email && (
                                    <span className="text-xs text-gray-500">({entry.user_email})</span>
                                  )}
                                </div>
                                
                                {/* ✅ ETAPA 3: Indicador de tempo relativo */}
                                <span className="text-xs text-gray-400">
                                  {(() => {
                                    const diffMs = Date.now() - new Date(entry.created_at).getTime();
                                    const diffMins = Math.floor(diffMs / 60000);
                                    const diffHours = Math.floor(diffMins / 60);
                                    const diffDays = Math.floor(diffHours / 24);
                                    
                                    if (diffMins < 1) return 'agora';
                                    if (diffMins < 60) return `${diffMins}m atrás`;
                                    if (diffHours < 24) return `${diffHours}h atrás`;
                                    if (diffDays < 7) return `${diffDays}d atrás`;
                                    return 'há mais de 1 semana';
                                  })()}
                                </span>
                              </div>
                              
                              {/* ✅ ETAPA 3: Detalhes das mudanças */}
                              {formatValueChange(entry.old_values, entry.new_values, entry.action)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA CADÊNCIA */}
          {activeTab === 'cadencia' && (
            <div className="space-y-6">
              {/* Header da Cadência */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <PlayCircle className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Tarefas de Cadência</h3>
                    <p className="text-sm text-gray-500">
                      Tarefas automáticas geradas para este lead
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadLeadTasks}
                  disabled={cadenceLoading}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                  title="Recarregar tarefas"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {/* Estatísticas rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-600">Total</div>
                  <div className="text-2xl font-bold text-blue-900">{(leadTasks || []).length}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-yellow-600">Pendentes</div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {(leadTasks || []).filter(task => task.status === 'pendente').length}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-600">Concluídas</div>
                  <div className="text-2xl font-bold text-green-900">
                    {(leadTasks || []).filter(task => task.status === 'concluida').length}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-red-600">Vencidas</div>
                  <div className="text-2xl font-bold text-red-900">
                    {(leadTasks || []).filter(task => task.status === 'pendente' && new Date(task.data_programada) < new Date()).length}
                  </div>
                </div>
              </div>

              {/* Lista de tarefas */}
              <div className="space-y-4">
                {cadenceLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-gray-500">Carregando tarefas...</p>
                  </div>
                ) : (leadTasks || []).length === 0 ? (
                  <div className="text-center py-12">
                    <PlayCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa de cadência</h3>
                    <p className="text-gray-600">
                      Este lead ainda não possui tarefas automáticas geradas.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Tarefas são criadas automaticamente quando o lead entra em etapas com cadência configurada.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {(leadTasks || []).map(task => (
                      <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        {/* Header da tarefa */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {/* Ícone do canal */}
                            <div className={`p-2 rounded-lg ${getChannelColor(task.canal)}`}>
                              {renderChannelIcon(task.canal)}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{task.descricao}</h4>
                              <p className="text-xs text-gray-500">
                                {task.stage_name} • {task.tipo}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(task)}
                          </div>
                        </div>

                        {/* Informações da tarefa */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{formatTaskDate(task.data_programada)}</span>
                          </div>
                          {task.day_offset !== undefined && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>D+{task.day_offset}</span>
                            </div>
                          )}
                        </div>

                        {/* Template de conteúdo */}
                        {task.template_content && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-gray-700 mb-1">Conteúdo do template:</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.template_content}</p>
                          </div>
                        )}

                        {/* Notas de execução */}
                        {task.execution_notes && (
                          <div className="bg-green-50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-green-700 mb-1">Notas de execução:</p>
                            <p className="text-sm text-green-600">{task.execution_notes}</p>
                            {task.executed_at && (
                              <p className="text-xs text-green-500 mt-1">
                                Concluída em {formatTaskDate(task.executed_at)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Ações */}
                        {task.status === 'pendente' && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                const notes = prompt('Adicione notas sobre a execução desta tarefa (opcional):');
                                if (notes !== null) { // null = cancelou, string vazia = OK sem notas
                                  handleCompleteTask(task.id, notes || undefined);
                                }
                              }}
                              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Marcar como Feito</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA E-MAIL */}
          {activeTab === 'email' && (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Integração de E-mail</h3>
              <p className="text-gray-600">
                Em breve integração com SMTP será implementada para envio e recebimento de e-mails diretamente do CRM.
              </p>
            </div>
          )}

          {/* ABA COMENTÁRIOS */}
          {activeTab === 'comentarios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Comentários</h3>
                <span className="text-sm text-gray-500">{comments.length} comentário(s)</span>
              </div>

              {/* Adicionar comentário */}
              <div className="bg-gray-50 rounded-lg p-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicione um comentário..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddCommentWrapper}
                    disabled={!newComment.trim() || commentsLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {commentsLoading ? 'Enviando...' : 'Comentar'}
                  </button>
                </div>
              </div>

              {/* Lista de comentários */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(comments || []).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum comentário ainda</p>
                  </div>
                ) : (
                  (comments || []).map(comment => (
                    <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {comment.user_name ? comment.user_name.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{comment.user_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{comment.user_role}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ABA FEEDBACK */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Feedback</h3>
                <div className="flex items-center space-x-2">
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-500">{(feedbacks || []).length} feedback(s)</span>
                </div>
              </div>

              {/* ✅ ETAPA 2: Adicionar feedback (Member e Admin) */}
              {(user?.role === 'member' || user?.role === 'admin') && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Deixar Feedback</h4>
                  
                  {/* Seleção de tipo de feedback */}
                  <div className="flex space-x-4 mb-4">
                    <button
                      onClick={() => setFeedbackType('positive')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        feedbackType === 'positive'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>Positivo</span>
                    </button>
                    <button
                      onClick={() => setFeedbackType('negative')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        feedbackType === 'negative'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-red-300'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span>Negativo</span>
                    </button>
                  </div>

                  <textarea
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    placeholder="Descreva seu feedback sobre este lead..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddFeedbackWrapper}
                      disabled={!newFeedback.trim() || feedbacksLoading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                                              {feedbacksLoading ? 'Enviando...' : 'Enviar Feedback'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de feedbacks */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(feedbacks || []).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ThumbsUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum feedback ainda</p>
                  </div>
                ) : (
                  (feedbacks || []).map(feedback => (
                    <div key={feedback.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            (feedback as any).feedback_type === 'negative' 
                              ? 'bg-red-500' 
                              : 'bg-green-500'
                          }`}>
                            {(feedback as any).feedback_type === 'negative' ? (
                              <ThumbsDown className="w-4 h-4 text-white" />
                            ) : (
                              <ThumbsUp className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{feedback.user_name}</p>
                            <p className="text-xs text-gray-500">
                              {(feedback as any).feedback_type === 'negative' ? 'Negativo' : 'Positivo'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(feedback.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{feedback.message || (feedback as any).comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ABA GOOGLE CALENDAR */}
          {activeTab === 'google-calendar' && (
            <GoogleCalendarEventModal
              lead={lead}
              onClose={() => setActiveTab('dados')}
              onEventCreated={(eventId: string) => {
                console.log('Evento criado:', eventId);
                // Registrar no histórico
                registerStageMove(
                  lead.id,
                  lead.stage_id || '',
                  lead.stage_id || '',
                  user?.email || 'Sistema'
                );
                // Recarregar histórico
                loadHistory();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadDetailsModal; 