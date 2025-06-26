import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { X, User, Mail, MessageCircle, ThumbsUp, ThumbsDown, Clock, Phone, Building, DollarSign, MapPin, Calendar, Target, Thermometer, Globe, FileText, Activity, ChevronDown, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Lead, CustomField } from '../../types/Pipeline';
import { registerComment, registerFeedback, registerStageMove } from '../../utils/historyUtils';
import { checkHistoryTable } from '../../utils/fixHistoryTables';
import { useLeadTasks, LeadTask } from '../../hooks/useLeadTasks';
import { GoogleCalendarEventModal } from '../GoogleCalendarEventModal';

// SISTEMA DE BLOQUEIO RADICAL GLOBAL
let GLOBAL_MODAL_BLOCK = false;
let GLOBAL_MODAL_FORCE_OPEN = false;
let GLOBAL_MODAL_LEAD_ID: string | null = null;
let GLOBAL_MODAL_REOPEN_CALLBACK: (() => void) | null = null;

// Monitor global que força reabertura
const startGlobalModalMonitor = () => {
  const monitor = setInterval(() => {
    if (GLOBAL_MODAL_BLOCK && GLOBAL_MODAL_FORCE_OPEN && GLOBAL_MODAL_REOPEN_CALLBACK) {
      console.log('🚨 MONITOR GLOBAL: Forçando reabertura do modal!');
      GLOBAL_MODAL_REOPEN_CALLBACK();
    }
  }, 100); // A cada 100ms

  // Auto-remover após 15 segundos
  setTimeout(() => {
    clearInterval(monitor);
    GLOBAL_MODAL_BLOCK = false;
    GLOBAL_MODAL_FORCE_OPEN = false;
    GLOBAL_MODAL_LEAD_ID = null;
    GLOBAL_MODAL_REOPEN_CALLBACK = null;
    console.log('✅ MONITOR GLOBAL: Proteção removida automaticamente');
  }, 15000);

  return monitor;
};

// SISTEMA DE CONTROLE ISOLADO DO MODAL
interface ModalControlState {
  isOpen: boolean;
  isProtected: boolean;
  protectionEndTime: number;
  leadId: string | null;
}

interface ModalControlContextType {
  modalState: ModalControlState;
  openModal: (leadId: string) => void;
  closeModal: () => boolean;
  protectModal: (duration?: number) => void;
  forceCloseModal: () => void;
  isModalProtected: () => boolean;
}

const ModalControlContext = createContext<ModalControlContextType | null>(null);

// Provider do controle isolado do modal
const ModalControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const modalStateRef = useRef<ModalControlState>({
    isOpen: false,
    isProtected: false,
    protectionEndTime: 0,
    leadId: null
  });

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  const openModal = React.useCallback((leadId: string) => {
    console.log('🔓 MODAL-CONTROL: Abrindo modal para lead:', leadId);
    modalStateRef.current = {
      ...modalStateRef.current,
      isOpen: true,
      leadId
    };
    forceUpdate();
  }, []);

  const closeModal = React.useCallback((): boolean => {
    // BLOQUEIO RADICAL: Verificar flag global primeiro
    if (GLOBAL_MODAL_BLOCK) {
      console.warn('🚫 MODAL-CONTROL: Fechamento BLOQUEADO pelo sistema global!');
      return false;
    }

    const now = Date.now();
    const isProtected = modalStateRef.current.isProtected || now < modalStateRef.current.protectionEndTime;
    
    console.log('🔒 MODAL-CONTROL: Tentativa de fechar modal', { 
      isProtected, 
      timeLeft: modalStateRef.current.protectionEndTime - now,
      globalBlock: GLOBAL_MODAL_BLOCK
    });
    
    if (isProtected) {
      console.warn('🚫 MODAL-CONTROL: Fechamento BLOQUEADO - modal protegido');
      return false;
    }
    
    console.log('✅ MODAL-CONTROL: Fechamento permitido');
    modalStateRef.current = {
      ...modalStateRef.current,
      isOpen: false,
      leadId: null
    };
    forceUpdate();
    return true;
  }, []);

  const protectModal = React.useCallback((duration: number = 7000) => {
    const endTime = Date.now() + duration;
    console.log('🛡️ MODAL-CONTROL: Ativando proteção por', duration, 'ms');
    
    modalStateRef.current = {
      ...modalStateRef.current,
      isProtected: true,
      protectionEndTime: endTime,
      isOpen: true // Garantir que está aberto
    };
    
    // Auto-remover proteção
    setTimeout(() => {
      console.log('✅ MODAL-CONTROL: Proteção removida automaticamente');
      modalStateRef.current.isProtected = false;
      forceUpdate();
    }, duration);
    
    forceUpdate();
  }, []);

  const forceCloseModal = React.useCallback(() => {
    console.log('🚪 MODAL-CONTROL: Fechamento FORÇADO - removendo todas as proteções');
    
    // Remover proteção global também
    GLOBAL_MODAL_BLOCK = false;
    GLOBAL_MODAL_FORCE_OPEN = false;
    
    modalStateRef.current = {
      isOpen: false,
      isProtected: false,
      protectionEndTime: 0,
      leadId: null
    };
    forceUpdate();
  }, []);

  const isModalProtected = React.useCallback((): boolean => {
    const now = Date.now();
    return GLOBAL_MODAL_BLOCK || modalStateRef.current.isProtected || now < modalStateRef.current.protectionEndTime;
  }, []);

  const contextValue: ModalControlContextType = {
    modalState: modalStateRef.current,
    openModal,
    closeModal,
    protectModal,
    forceCloseModal,
    isModalProtected
  };

  return (
    <ModalControlContext.Provider value={contextValue}>
      {children}
    </ModalControlContext.Provider>
  );
};

// Hook para usar o controle do modal
const useModalControl = () => {
  const context = useContext(ModalControlContext);
  if (!context) {
    throw new Error('useModalControl deve ser usado dentro de ModalControlProvider');
  }
  return context;
};

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

interface Stage {
  id: string;
  name: string;
  order: number;
  pipeline_id: string;
}

// Componente StageSelector com controle isolado
const StageSelector: React.FC<{
  leadId: string;
  currentStageId: string;
  onStageChange?: (leadId: string, updatedData: any) => void;
}> = ({ leadId, currentStageId, onStageChange }) => {
  const { user } = useAuth();
  const modalControl = useModalControl(); // Usar o controle isolado
  const [stages, setStages] = useState<Stage[]>([]);
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar stages da pipeline
  useEffect(() => {
    const loadStages = async () => {
      try {
        console.log('🔍 StageSelector: Carregando stages...');

        // Abordagem simplificada: buscar todas as stages e filtrar por pipeline
        // Primeiro, vamos buscar todas as stages para ver o que temos
        console.log('🔍 Tentando buscar stages com diferentes nomes de colunas...');
        
        let allStages = null;
        let allStagesError = null;
        
        // Tentar diferentes estruturas de colunas
        const columnVariations = [
          'id, name, order_index, pipeline_id',
          'id, name, order, pipeline_id',
          'id, stage_name, stage_order, pipeline_id', 
          'id, name, stage_order, pipeline_id',
          'id, stage_name, order, pipeline_id',
          '*'
        ];
        
        for (const columns of columnVariations) {
          try {
            console.log(`🔍 Tentando colunas: ${columns}`);
                         const result = await supabase
               .from('pipeline_stages')
               .select(columns)
               .order(columns.includes('order_index') ? 'order_index' : columns.includes('stage_order') ? 'stage_order' : 'order', { ascending: true });
            
            if (!result.error && result.data) {
              console.log(`✅ Sucesso com colunas: ${columns}`, result.data);
              allStages = result.data;
              allStagesError = null;
              break;
            } else {
              console.log(`❌ Erro com colunas ${columns}:`, result.error?.message);
            }
                     } catch (e) {
             console.log(`❌ Exception com colunas ${columns}:`, (e as Error).message);
           }
        }

        console.log('📋 StageSelector: Todas as stages:', allStages);
        console.log('🔍 StageSelector: Estrutura das stages:', allStages?.[0]);
        console.log('❌ StageSelector: Erro ao buscar stages:', allStagesError);

        if (allStagesError) {
          console.error('❌ Erro ao buscar stages:', allStagesError);
          return;
        }

        if (!allStages || allStages.length === 0) {
          console.warn('⚠️ Nenhuma stage encontrada no sistema');
          console.log('🔧 Verificando se existem pipelines para criar stages padrão...');
          
          // Verificar se existem pipelines
          const { data: pipelines, error: pipelinesError } = await supabase
            .from('pipelines')
            .select('id, name')
            .limit(1);
          
          if (!pipelinesError && pipelines && pipelines.length > 0) {
            console.log('🔧 Pipeline encontrada, criando stages padrão:', pipelines[0]);
            
            // Criar stages padrão para a primeira pipeline
            const defaultStages = [
              { name: 'Lead', order_index: 1, temperature_score: 20, color: '#3B82F6' },
              { name: 'Qualified', order_index: 2, temperature_score: 40, color: '#8B5CF6' },
              { name: 'Proposal', order_index: 3, temperature_score: 70, color: '#F59E0B' },
              { name: 'Negotiation', order_index: 4, temperature_score: 90, color: '#EF4444' },
              { name: 'Closed Won', order_index: 5, temperature_score: 100, color: '#10B981' },
              { name: 'Closed Lost', order_index: 6, temperature_score: 0, color: '#6B7280' }
            ];
            
            const stagesToInsert = defaultStages.map(stage => ({
              ...stage,
              pipeline_id: pipelines[0].id,
              max_days_allowed: 30
            }));
            
            const { data: createdStages, error: createError } = await supabase
              .from('pipeline_stages')
              .insert(stagesToInsert)
              .select();
            
            if (!createError && createdStages) {
              console.log('✅ Stages padrão criadas:', createdStages);
              allStages = createdStages;
            } else {
              console.error('❌ Erro ao criar stages padrão:', createError);
              return;
            }
          } else {
            console.warn('⚠️ Nenhuma pipeline encontrada no sistema');
            return;
          }
        }

        // Normalizar dados para a interface Stage
        const normalizedStages: Stage[] = allStages.map((stage: any) => ({
          id: stage.id,
          name: stage.name || stage.stage_name,
          order: stage.order_index || stage.order || stage.stage_order || 0,
          pipeline_id: stage.pipeline_id
        }));

        // Agrupar stages por pipeline
        const pipelineStages = normalizedStages.reduce((acc, stage) => {
          if (!acc[stage.pipeline_id]) {
            acc[stage.pipeline_id] = [];
          }
          acc[stage.pipeline_id].push(stage);
          return acc;
        }, {} as Record<string, Stage[]>);

        console.log('📋 StageSelector: Stages agrupadas por pipeline:', pipelineStages);

        // Se temos um currentStageId válido, encontrar sua pipeline
        let targetPipelineId = null;
        let currentStageFound = null;

        if (currentStageId && currentStageId !== 'null' && currentStageId.trim() !== '') {
          currentStageFound = normalizedStages.find(s => s.id === currentStageId);
          if (currentStageFound) {
            targetPipelineId = currentStageFound.pipeline_id;
            console.log('🎯 StageSelector: Pipeline encontrada via stage atual:', targetPipelineId);
          }
        }

        // Se não encontrou pipeline via stage, buscar do lead
        if (!targetPipelineId) {
          console.log('🔄 StageSelector: Buscando pipeline do lead...');
          
          // Buscar pipeline_id do lead através da tabela leads
          const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .select('pipeline_id')
            .eq('id', leadId)
            .single();

          console.log('📋 StageSelector: Lead data:', leadData);

          if (!leadError && leadData?.pipeline_id) {
            targetPipelineId = leadData.pipeline_id;
            console.log('🎯 StageSelector: Pipeline encontrada via lead:', targetPipelineId);
          } else {
            // Último fallback: usar a primeira pipeline disponível
            const firstPipelineId = Object.keys(pipelineStages)[0];
            if (firstPipelineId) {
              targetPipelineId = firstPipelineId;
              console.log('🔄 StageSelector: Usando primeira pipeline como fallback:', targetPipelineId);
            }
          }
        }

        if (!targetPipelineId) {
          console.error('❌ StageSelector: Não foi possível determinar a pipeline');
          return;
        }

        // Obter stages da pipeline alvo
        const targetStages = pipelineStages[targetPipelineId] || [];
        
        if (targetStages.length === 0) {
          console.warn('⚠️ Nenhuma stage encontrada para a pipeline:', targetPipelineId);
          return;
        }

        console.log('✅ StageSelector: Stages da pipeline alvo:', targetStages);

        setStages(targetStages);

        // Determinar stage atual
        const selectedStage = currentStageFound || targetStages[0];
        setCurrentStage(selectedStage || null);

        console.log('🎯 StageSelector: Stage selecionada:', selectedStage);

        // Se não tinha um stage_id válido, atualizar o lead
        if (!currentStageFound && selectedStage) {
          console.log('🔧 StageSelector: Atualizando lead com stage selecionada');
          try {
            await supabase
              .from('leads')
              .update({ 
                stage_id: selectedStage.id,
                pipeline_id: targetPipelineId 
              })
              .eq('id', leadId);
            console.log('✅ StageSelector: Lead atualizado');
          } catch (updateError) {
            console.error('❌ StageSelector: Erro ao atualizar lead:', updateError);
          }
        }

      } catch (error) {
        console.error('❌ Erro geral ao carregar stages:', error);
      }
    };

    if (leadId) {
      loadStages();
    }
  }, [leadId, currentStageId]);

  // Função para alterar stage
  const handleStageChange = async (newStageId: string) => {
    if (newStageId === currentStageId || loading) return;

    setLoading(true);
    
    // ATIVAR BLOQUEIO RADICAL GLOBAL
    console.log('🚨 STAGE-SELECTOR: ATIVANDO BLOQUEIO RADICAL GLOBAL!');
    GLOBAL_MODAL_BLOCK = true;
    GLOBAL_MODAL_FORCE_OPEN = true;
    GLOBAL_MODAL_LEAD_ID = leadId;
    
    // Iniciar monitor global
    const monitor = startGlobalModalMonitor();
    
    // ATIVAR PROTEÇÃO ADICIONAL
    console.log('🛡️ STAGE-SELECTOR: Ativando proteção do modal ANTES da alteração');
    modalControl.protectModal(12000); // 12 segundos de proteção
    
    try {
      console.log('🔄 STAGE-SELECTOR: Alterando etapa:', { leadId, currentStageId, newStageId });
      
      // Validar IDs
      if (!leadId || !newStageId) {
        throw new Error('Lead ID ou Stage ID inválido');
      }

      // Tentar atualizar na tabela pipeline_leads primeiro
      let updateError = null;
      
      const { error: pipelineError } = await supabase
        .from('pipeline_leads')
        .update({ 
          stage_id: newStageId,
          moved_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (pipelineError) {
        console.log('⚠️ Erro na tabela pipeline_leads, tentando tabela leads:', pipelineError.message);
        
        // Fallback para tabela leads
        const { error: leadsError } = await supabase
          .from('leads')
          .update({ stage_id: newStageId })
          .eq('id', leadId);
        
        if (leadsError) {
          console.error('❌ Erro em ambas as tabelas:', { pipelineError, leadsError });
          updateError = leadsError;
        }
      }

      if (updateError) throw updateError;

      // Registrar no histórico
      try {
        console.log('📝 Tentando registrar no histórico...', {
          leadId: leadId.substring(0, 8) + '...',
          oldStage: currentStageId,
          newStage: newStageId,
          userId: user?.id
        });
        
        // Só registrar histórico se temos um currentStageId válido
        if (currentStageId && currentStageId !== 'null' && currentStageId.trim() !== '') {
          await registerStageMove(leadId, currentStageId, newStageId, user?.id);
          console.log('✅ Histórico registrado com sucesso');
        } else {
          console.log('⚠️ currentStageId inválido, pulando registro de histórico');
        }
      } catch (historyError) {
        console.warn('⚠️ Erro ao registrar histórico:', historyError);
        
        // Tentar inserção direta como fallback
        try {
          console.log('🔄 Tentando inserção direta no histórico...');
          
          // Criar timestamp no horário do Brasil
          const brasilTime = new Date().toLocaleString('en-CA', { 
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).replace(', ', 'T') + '-03:00';

          // Buscar nomes das stages para descrição mais clara
          const { data: stageNames } = await supabase
            .from('pipeline_stages')
            .select('id, name')
            .in('id', [currentStageId, newStageId]);

          const oldStageName = stageNames?.find(s => s.id === currentStageId)?.name || 'Etapa anterior';
          const newStageName = stageNames?.find(s => s.id === newStageId)?.name || 'Nova etapa';

          const { data, error } = await supabase
            .from('lead_history')
            .insert([{
              lead_id: leadId,
              action: 'stage_moved',
              description: `Lead movido de "${oldStageName}" para "${newStageName}"`,
              user_id: user?.id,
              user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Usuário' : 'Sistema',
              old_values: currentStageId && currentStageId !== 'null' ? { stage_id: currentStageId, stage_name: oldStageName } : {},
              new_values: { stage_id: newStageId, stage_name: newStageName },
              created_at: brasilTime
            }])
            .select('id')
            .single();

          if (error) {
            console.error('❌ Erro na inserção direta:', error);
          } else {
            console.log('✅ Histórico registrado via inserção direta:', data.id);
          }
        } catch (directError) {
          console.error('❌ Falha total no registro de histórico:', directError);
        }
      }

      // Atualizar estado local
      const newStage = stages.find(s => s.id === newStageId);
      setCurrentStage(newStage || null);
      setIsDropdownOpen(false); // Fechar apenas o dropdown do seletor

      // Notificar componente pai
      if (onStageChange) {
        console.log('🔔 STAGE-SELECTOR: Notificando componente pai sobre mudança de etapa:', { leadId, newStageId });
        console.log('🔔 STAGE-SELECTOR: IMPORTANTE - Modal protegido durante onStageChange!');
        onStageChange(leadId, { stage_id: newStageId });
        console.log('🔔 STAGE-SELECTOR: onStageChange executado - modal deve permanecer protegido');
      }

      console.log('✅ STAGE-SELECTOR: Etapa alterada com sucesso - modal permanece protegido');
    } catch (error) {
      console.error('❌ STAGE-SELECTOR: Erro ao alterar etapa:', error);
      alert('Erro ao alterar etapa. Tente novamente.');
      // Remover proteção em caso de erro
      modalControl.forceCloseModal();
    } finally {
      setLoading(false);
    }
  };

  if (!currentStage) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
        {stages.length > 0 ? 'Etapa não encontrada' : 'Carregando etapas...'}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsDropdownOpen(!isDropdownOpen);
        }}
        disabled={loading}
        className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
          loading 
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
        }`}
      >
        <span>{currentStage.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {stages.map((stage) => (
              <button
                key={stage.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStageChange(stage.id);
                }}
                disabled={stage.id === currentStageId || loading}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  stage.id === currentStageId
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {stage.name}
                {stage.id === currentStageId && (
                  <span className="ml-2 text-xs text-blue-500">• Atual</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={(e) => {
            e.stopPropagation();
            setIsDropdownOpen(false);
          }}
        />
      )}
    </div>
  );
};

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
  const modalControl = useModalControl(); // Usar o controle isolado
  const [activeTab, setActiveTab] = useState(externalActiveTab || 'dados');

  // ✅ PASSO 2: ESTADO LOCAL REATIVO PARA SINCRONIZAÇÃO (LEADDETAILSMODAL)
  const [localLeadData, setLocalLeadData] = useState(lead);

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
        console.log('🎯 [LeadDetailsModal] ETAPA 2: Sincronização aprimorada:', {
          leadId: localLeadData.id,
          leadMasterId,
          source,
          dataSource: cardData?.data_source || 'unknown'
        });
        
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
        
        console.log('✅ [LeadDetailsModal] ETAPA 2: Modal sincronizado com fonte única');
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

  // Função de fechamento com controle isolado E bloqueio radical
  const protectedOnClose = React.useCallback(() => {
    console.log('🔍 MODAL-DETAILS: Tentativa de fechar modal');
    
    // VERIFICAR BLOQUEIO RADICAL PRIMEIRO
    if (GLOBAL_MODAL_BLOCK) {
      console.warn('🚫 MODAL-DETAILS: Fechamento BLOQUEADO pelo sistema radical global!');
      console.warn('🚨 MODAL DEVE PERMANECER ABERTO - BLOQUEIO ATIVO!');
      return;
    }
    
    // Tentar fechar via controle isolado
    const closed = modalControl.closeModal();
    
    if (!closed) {
      console.log('🚫 MODAL-DETAILS: Fechamento bloqueado pelo controle isolado');
      return;
    }
    
    // Fallback para sistema antigo
    if (isUpdatingStage) {
      console.log('🚫 MODAL-DETAILS: Fechamento bloqueado pelo sistema antigo');
      return;
    }
    
    console.log('🚪 MODAL-DETAILS: Fechamento permitido');
    onClose();
  }, [onClose, isUpdatingStage, modalControl]);

  // Sincronizar com o controle isolado
  React.useEffect(() => {
    if (isOpen && lead.id) {
      modalControl.openModal(lead.id);
      
      // Configurar callback de reabertura global
      GLOBAL_MODAL_REOPEN_CALLBACK = () => {
        console.log('🔄 MODAL-DETAILS: Callback de reabertura ativado');
        if (!isOpen) {
          console.log('🚨 MODAL-DETAILS: Forçando reabertura via callback!');
          // Não podemos chamar onClose aqui, mas podemos forçar o estado
          // O modal deve ser reaberto pelo componente pai
        }
      };
    }
  }, [isOpen, lead.id, modalControl]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newFeedback, setNewFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative'>('positive');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Estados específicos para cadência
  const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);
  const [cadenceLoading, setCadenceLoading] = useState(false);

  // Atualizar activeTab quando a propriedade externa mudar
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  // Função para obter dados do lead - Melhorada
  const getLeadData = (key: string): any => {
    // ✅ PASSO 2: Usar localLeadData atualizado em vez de lead estático
    const currentLead = localLeadData;
    
    // Primeiro tentar custom_data
    if (currentLead.custom_data?.[key]) {
      return currentLead.custom_data[key];
    }
    
    // Tentar variações do nome do campo
    const variations = [
      key,
      `${key}_oportunidade`,
      `${key}_lead`,
      `${key}_contato`,
      key.toLowerCase(),
      key.toUpperCase()
    ];
    
    for (const variation of variations) {
      if (currentLead.custom_data?.[variation]) {
        return currentLead.custom_data[variation];
      }
    }
    
    // Tentar lead_data se existir
    if ((currentLead as any).lead_data?.[key]) {
      return (currentLead as any).lead_data[key];
    }
    
    // Tentar propriedades diretas do lead
    if ((currentLead as any)[key]) {
      return (currentLead as any)[key];
    }
    
    // Campos especiais baseados no tipo Lead
    const specialFields: Record<string, any> = {
      'name': currentLead.custom_data?.nome_oportunidade || currentLead.custom_data?.titulo_oportunidade || currentLead.custom_data?.titulo,
      'email': currentLead.custom_data?.email || currentLead.custom_data?.email_contato,
      'phone': currentLead.custom_data?.telefone || currentLead.custom_data?.telefone_contato || currentLead.custom_data?.celular,
      'value': currentLead.custom_data?.valor || currentLead.custom_data?.valor_oportunidade || currentLead.custom_data?.valor_proposta,
      'company': currentLead.custom_data?.empresa || currentLead.custom_data?.empresa_contato,
      'lead_name': currentLead.custom_data?.nome_lead || currentLead.custom_data?.nome_contato || currentLead.custom_data?.contato || currentLead.custom_data?.nome
    };
    
    if (specialFields[key]) {
      return specialFields[key];
    }
    
    return null;
  };

  // Carregar comentários
  const loadComments = async () => {
    try {
      // ✅ CORREÇÃO: Buscar comentários SEM JOIN (foreign keys não existem)
      const { data: commentsData, error } = await supabase
        .from('lead_comments')
        .select('*')
        .eq('lead_id', localLeadData.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar comentários:', error);
        setComments([]);
        return;
      }

      // Buscar dados do usuário separadamente para cada comentário
      const formattedComments = [];
      for (const comment of commentsData || []) {
        let userName = 'Usuário Desconhecido';
        let userRole = 'member';
        
        if (comment.user_id) {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('first_name, last_name, role')
              .eq('id', comment.user_id)
              .single();
            
            if (userData) {
              userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Usuário';
              userRole = userData.role || 'member';
            }
          } catch (userError) {
            console.warn('⚠️ Erro ao buscar dados do usuário para comentário:', userError);
          }
        }

        formattedComments.push({
          id: comment.id,
          lead_id: comment.lead_id,
          user_id: comment.user_id,
          user_name: userName,
          user_role: userRole,
          message: comment.message,
          created_at: comment.created_at
        });
      }

      setComments(formattedComments);
      console.log('✅ Comentários carregados:', formattedComments.length);
    } catch (error) {
      console.error('❌ Erro geral ao carregar comentários:', error);
      setComments([]);
    }
  };

  // Carregar tarefas de cadência do lead específico
  const loadLeadTasks = async () => {
    if (!user?.id || !localLeadData.id) {
      console.log('🚫 loadLeadTasks: Usuário ou lead não encontrado', { userId: user?.id, leadId: localLeadData.id });
      return;
    }

    try {
      setCadenceLoading(true);
      console.log('🔍 loadLeadTasks: Carregando tarefas para lead:', localLeadData.id);

              // Primeiro, tentar consulta simples sem JOIN
        const { data: tasksData, error } = await supabase
          .from('lead_tasks')
          .select('*')
          .eq('lead_id', localLeadData.id)
          .order('data_programada', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar tarefas de cadência:', error);
        console.error('Detalhes do erro:', error.message, error.code, error.details);
        return;
      }

      console.log('📊 Tarefas encontradas:', tasksData?.length || 0, tasksData);

      // Processar os dados sem JOIN
      const enrichedTasks: LeadTask[] = (tasksData || []).map(task => ({
        id: task.id,
        lead_id: task.lead_id,
        pipeline_id: task.pipeline_id,
        etapa_id: task.etapa_id,
        data_programada: task.data_programada,
        canal: task.canal,
        tipo: task.tipo,
        descricao: task.descricao,
        status: task.status,
        day_offset: task.day_offset,
        task_order: task.task_order,
        template_content: task.template_content,
        assigned_to: task.assigned_to,
        executed_at: task.executed_at,
        execution_notes: task.execution_notes,
        created_at: task.created_at,
        updated_at: task.updated_at,
        // Dados enriquecidos
        stage_name: 'Novos Leads' // Temporário para teste
      }));

      console.log('✅ Tarefas processadas:', enrichedTasks.length);
      setLeadTasks(enrichedTasks);

    } catch (error) {
      console.error('💥 Erro geral ao carregar tarefas de cadência:', error);
    } finally {
      setCadenceLoading(false);
    }
  };

  // Marcar tarefa como concluída
  const handleCompleteTask = async (taskId: string, executionNotes?: string) => {
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
          ? { 
              ...task, 
              status: 'concluida' as const,
              executed_at: new Date().toISOString(),
              execution_notes: executionNotes
            }
          : task
      ));

      // Recarregar para garantir sincronização
      await loadLeadTasks();

    } catch (error: any) {
      console.error('Erro ao completar tarefa:', error);
      alert('Erro ao completar tarefa. Tente novamente.');
    }
  };

  // Carregar feedbacks
  const loadFeedbacks = async () => {
    try {
      console.log('🔍 ETAPA 2: Carregando feedbacks da nova tabela lead_feedback');
      
      // ✅ CORREÇÃO: Buscar feedbacks SEM JOIN (foreign keys não existem)
      const { data: feedbacksData, error } = await supabase
        .from('lead_feedback')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('❌ Tabela lead_feedback não encontrada, tentando lead_feedbacks como fallback');
        // Fallback para tabela antiga se nova não existir
        const { data: oldFeedbacksData, error: oldError } = await supabase
          .from('lead_feedbacks')
          .select('*')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false });

        if (oldError) {
          console.error('❌ Erro ao carregar feedbacks (ambas tabelas):', oldError);
          setFeedbacks([]);
          return;
        }

        // Formatar dados da tabela antiga
        const formattedOldFeedbacks = [];
        for (const feedback of oldFeedbacksData || []) {
          let userName = 'Usuário Desconhecido';
          
          if (feedback.user_id) {
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('first_name, last_name')
                .eq('id', feedback.user_id)
                .single();
              
              if (userData) {
                userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Usuário';
              }
            } catch (userError) {
              console.warn('⚠️ Erro ao buscar dados do usuário para feedback:', userError);
            }
          }

          formattedOldFeedbacks.push({
            id: feedback.id,
            lead_id: feedback.lead_id,
            user_id: feedback.user_id,
            user_name: userName,
            message: feedback.message,
            created_at: feedback.created_at,
            feedback_type: 'positive' as 'positive' | 'negative' // Assumir positivo para dados antigos
          });
        }

        setFeedbacks(formattedOldFeedbacks);
        console.log('✅ ETAPA 2: Feedbacks carregados da tabela antiga:', formattedOldFeedbacks.length);
        return;
      }

      // Buscar dados do usuário separadamente para nova tabela
      const formattedFeedbacks = [];
      for (const feedback of feedbacksData || []) {
        let userName = 'Usuário Desconhecido';
        
        if (feedback.user_id) {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', feedback.user_id)
              .single();
            
            if (userData) {
              userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Usuário';
            }
          } catch (userError) {
            console.warn('⚠️ Erro ao buscar dados do usuário para feedback:', userError);
          }
        }

        formattedFeedbacks.push({
          id: feedback.id,
          lead_id: feedback.lead_id,
          user_id: feedback.user_id,
          user_name: userName,
          message: feedback.comment || feedback.message, // Nova tabela usa 'comment'
          created_at: feedback.created_at,
          feedback_type: (feedback.feedback_type as 'positive' | 'negative') || 'positive'
        });
      }

      setFeedbacks(formattedFeedbacks);
      console.log('✅ ETAPA 2: Feedbacks carregados:', formattedFeedbacks.length);
      
    } catch (error) {
      console.error('❌ Erro geral ao carregar feedbacks:', error);
      setFeedbacks([]);
    }
  };

  // ✅ ETAPA 3: Carregar histórico completo e enriquecido
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      // ✅ CORREÇÃO 3: Throttling nos logs para evitar spam
      const now = Date.now();
      const lastLog = (window as any).lastHistoryLogTime || 0;
      if (now - lastLog > 2000) {
        console.log('🔍 ETAPA 3: Carregando histórico completo para lead:', lead.id);
        (window as any).lastHistoryLogTime = now;
      }
      
      // ✅ CORREÇÃO: Buscar histórico SEM JOIN (foreign keys não existem)
      const { data: historyData, error: historyError } = await supabase
        .from('lead_history')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (historyError) {
        throw historyError;
      }

      console.log('✅ ETAPA 3: Histórico carregado:', historyData?.length || 0, 'entradas');

      if (!historyData) {
        console.log('📋 ETAPA 3: Nenhuma entrada de histórico encontrada');
        setHistory([]);
        return;
      }

      // ✅ ETAPA 3: Formatar histórico com dados enriquecidos
      const enrichedHistory = await Promise.all(
        historyData.map(async (entry: any) => {
          let userName = entry.user_name || 'Sistema';
          let userRole = 'system';
          let userEmail = '';

          // ✅ CORREÇÃO: Buscar dados do usuário apenas se temos user_id
          if (entry.user_id) {
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('first_name, last_name, email, role')
                .eq('id', entry.user_id)
                .single();

              if (userData) {
                userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || 'Usuário';
                userRole = userData.role || 'member';
                userEmail = userData.email || '';
              }
            } catch (userError) {
              console.warn('⚠️ ETAPA 3: Erro ao buscar dados do usuário:', userError);
              // Usar user_name do histórico como fallback
              userName = entry.user_name || 'Usuário Desconhecido';
            }
          }

          return {
            id: entry.id,
            lead_id: entry.lead_id,
            action: entry.action,
            description: entry.description,
            user_name: userName,
            user_role: userRole,
            user_email: userEmail,
            created_at: entry.created_at,
            old_values: entry.old_values,
            new_values: entry.new_values
          };
        })
      );

      setHistory(enrichedHistory);
      console.log('✅ ETAPA 3: Histórico enriquecido processado:', enrichedHistory.length, 'entradas');
      
      if (enrichedHistory.length > 0) {
        console.log('📋 ETAPA 3: Primeira entrada enriquecida:', enrichedHistory[0]);
      }
      
    } catch (error) {
      console.error('❌ ETAPA 3: Erro geral ao carregar histórico:', error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Adicionar comentário
  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('lead_comments')
        .insert([{
          lead_id: lead.id,
          user_id: user.id,
          message: newComment.trim()
        }]);

      if (error) throw error;

      // REGISTRAR NO HISTÓRICO
      try {
        await registerComment(lead.id, newComment.trim(), user.id);
        console.log('📝 Comentário registrado no histórico');
      } catch (historyError) {
        console.warn('⚠️ Erro ao registrar histórico de comentário:', historyError);
      }

      setNewComment('');
      await loadComments();
      await loadHistory(); // Recarregar histórico após adicionar comentário
      
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      alert('Erro ao adicionar comentário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Adicionar feedback
  const handleAddFeedback = async () => {
    if (!newFeedback.trim() || !user || !['member', 'admin'].includes(user.role)) return;

    setLoading(true);
    try {
      // ✅ ETAPA 2: Sistema aprimorado - inserir na tabela lead_feedback
      const { error: feedbackError } = await supabase
        .from('lead_feedback')
        .insert([{
          lead_id: lead.id,
          user_id: user.id,
          feedback_type: feedbackType,
          comment: newFeedback.trim()
        }]);

      if (feedbackError) {
        console.error('❌ Erro ao inserir feedback:', feedbackError);
        throw feedbackError;
      }

      // ✅ ETAPA 2: Registrar no histórico usando a função PostgreSQL
      try {
        const { error: historyError } = await supabase
          .rpc('register_feedback_history', {
            p_lead_id: lead.id,
            p_feedback_type: feedbackType,
            p_comment: newFeedback.trim(),
            p_user_id: user.id
          });

        if (historyError) {
          console.warn('⚠️ Erro ao registrar histórico de feedback:', historyError);
        } else {
          console.log('✅ Feedback registrado no histórico via PostgreSQL');
        }
      } catch (historyError) {
        console.warn('⚠️ Fallback: Tentando registrar histórico manualmente');
        // Fallback manual
        const { error: manualHistoryError } = await supabase
          .from('lead_history')
          .insert([{
            lead_id: lead.id,
            action: 'feedback_added',
            description: `Feedback ${feedbackType === 'positive' ? 'Positivo' : 'Negativo'}: ${newFeedback.substring(0, 100)}${newFeedback.length > 100 ? '...' : ''}`,
                         user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Usuário',
            created_at: new Date().toISOString(),
            new_values: {
              feedback_type: feedbackType,
              comment: newFeedback.trim(),
              user_id: user.id
            }
          }]);
        
        if (manualHistoryError) {
          console.warn('⚠️ Erro no fallback manual do histórico:', manualHistoryError);
        }
      }

      // Limpar formulário e recarregar dados
      setNewFeedback('');
      setFeedbackType('positive');
      await loadFeedbacks();
      await loadHistory();
      
      console.log('✅ ETAPA 2: Feedback adicionado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao adicionar feedback:', error);
      alert('Erro ao adicionar feedback. Verifique se você tem permissão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados quando modal abre
  useEffect(() => {
    if (isOpen) {
      console.log('📂 LeadDetailsModal: Carregando dados do modal para lead:', lead.id);
      console.log('📂 LeadDetailsModal: Dados do lead:', lead);
      loadComments();
      loadFeedbacks();
      loadHistory();
      loadLeadTasks();
    }
  }, [isOpen, lead.id]);

  // ✅ CORREÇÃO 1: Carregar histórico quando aba dados fica ativa
  useEffect(() => {
    if (isOpen && activeTab === 'dados') {
      console.log('📊 CORREÇÃO: Carregando histórico para aba dados');
      loadHistory();
    }
  }, [isOpen, activeTab]);

  // Detectar mudanças no isOpen para debug
  useEffect(() => {
    console.log('🔍 LeadDetailsModal: isOpen mudou para:', isOpen);
    if (!isOpen && isUpdatingStage) {
      console.warn('⚠️ LeadDetailsModal: Modal foi fechado durante atualização de etapa!');
    }
  }, [isOpen, isUpdatingStage]);

  // Função para formatar data no horário do Brasil
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error);
      return 'Data inválida';
    }
  };

  // ✅ ETAPA 3: Função para traduzir ações do histórico (expandida)
  const translateAction = (action: string) => {
    const translations: { [key: string]: string } = {
      'stage_moved': 'Etapa Alterada',
      'comment_added': 'Comentário Adicionado',
      'feedback_added': 'Feedback Adicionado',
      'lead_created': 'Lead Criado',
      'email_sent': 'E-mail Enviado',
      'email_received': 'E-mail Recebido',
      'task_created': 'Tarefa Criada',
      'task_completed': 'Tarefa Concluída',
      'note_added': 'Nota Adicionada',
      'call_made': 'Ligação Realizada',
      'meeting_scheduled': 'Reunião Agendada',
      'proposal_sent': 'Proposta Enviada',
      'contract_signed': 'Contrato Assinado',
      'lead_updated': 'Lead Atualizado',
      'status_changed': 'Status Alterado',
      'priority_changed': 'Prioridade Alterada',
      'assigned_to': 'Atribuído Para',
      'test_direct': 'Teste Direto',
      'test_function': 'Teste de Função',
      'manual_test': 'Teste Manual',
      'lead_imported': 'Lead Importado',
      'data_updated': 'Dados Atualizados',
      'field_changed': 'Campo Alterado',
      'temperature_changed': 'Temperatura Alterada',
      'source_updated': 'Origem Atualizada',
      'pipeline_moved': 'Pipeline Alterada',
      'owner_changed': 'Responsável Alterado'
    };
    
    return translations[action] || action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // ✅ ETAPA 3: Função para obter ícone específico por tipo de ação
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'stage_moved':
      case 'pipeline_moved':
        return Target;
      case 'comment_added':
        return MessageCircle;
      case 'feedback_added':
        return ThumbsUp;
      case 'lead_created':
      case 'lead_imported':
        return User;
      case 'email_sent':
      case 'email_received':
        return Mail;
      case 'task_created':
      case 'task_completed':
        return CheckCircle;
      case 'call_made':
        return Phone;
      case 'meeting_scheduled':
        return Calendar;
      case 'proposal_sent':
      case 'contract_signed':
        return FileText;
      case 'lead_updated':
      case 'data_updated':
      case 'field_changed':
        return Activity;
      case 'temperature_changed':
        return Thermometer;
      case 'status_changed':
      case 'priority_changed':
        return AlertCircle;
      case 'assigned_to':
      case 'owner_changed':
        return User;
      case 'source_updated':
        return Globe;
      default:
        return Clock;
    }
  };

  // ✅ ETAPA 3: Função para obter cor específica por tipo de ação
  const getActionColor = (action: string) => {
    switch (action) {
      case 'stage_moved':
      case 'pipeline_moved':
        return { bg: 'bg-blue-500', text: 'text-blue-600', bgLight: 'bg-blue-50' };
      case 'comment_added':
        return { bg: 'bg-green-500', text: 'text-green-600', bgLight: 'bg-green-50' };
      case 'feedback_added':
        return { bg: 'bg-purple-500', text: 'text-purple-600', bgLight: 'bg-purple-50' };
      case 'lead_created':
      case 'lead_imported':
        return { bg: 'bg-indigo-500', text: 'text-indigo-600', bgLight: 'bg-indigo-50' };
      case 'email_sent':
      case 'email_received':
        return { bg: 'bg-cyan-500', text: 'text-cyan-600', bgLight: 'bg-cyan-50' };
      case 'task_created':
      case 'task_completed':
        return { bg: 'bg-emerald-500', text: 'text-emerald-600', bgLight: 'bg-emerald-50' };
      case 'call_made':
        return { bg: 'bg-orange-500', text: 'text-orange-600', bgLight: 'bg-orange-50' };
      case 'meeting_scheduled':
        return { bg: 'bg-pink-500', text: 'text-pink-600', bgLight: 'bg-pink-50' };
      case 'proposal_sent':
      case 'contract_signed':
        return { bg: 'bg-yellow-500', text: 'text-yellow-600', bgLight: 'bg-yellow-50' };
      case 'lead_updated':
      case 'data_updated':
      case 'field_changed':
        return { bg: 'bg-gray-500', text: 'text-gray-600', bgLight: 'bg-gray-50' };
      case 'temperature_changed':
        return { bg: 'bg-red-500', text: 'text-red-600', bgLight: 'bg-red-50' };
      case 'status_changed':
      case 'priority_changed':
        return { bg: 'bg-amber-500', text: 'text-amber-600', bgLight: 'bg-amber-50' };
      case 'assigned_to':
      case 'owner_changed':
        return { bg: 'bg-teal-500', text: 'text-teal-600', bgLight: 'bg-teal-50' };
      case 'source_updated':
        return { bg: 'bg-violet-500', text: 'text-violet-600', bgLight: 'bg-violet-50' };
      default:
        return { bg: 'bg-blue-500', text: 'text-blue-600', bgLight: 'bg-blue-50' };
    }
  };

  // ✅ ETAPA 3: Função para formatar mudanças de valores
  const formatValueChange = (oldValues: any, newValues: any, action: string) => {
    if (!oldValues && !newValues) return null;

    // Para mudança de etapa, mostrar de/para
    if (action === 'stage_moved' && oldValues?.stage_id && newValues?.stage_id) {
      return (
        <div className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded">
          <span className="font-medium">Mudança:</span> {oldValues.stage_id} → {newValues.stage_id}
        </div>
      );
    }

    // Para outros tipos, mostrar valores novos
    if (newValues && typeof newValues === 'object') {
      const changes = Object.entries(newValues).map(([key, value]) => (
        <div key={key} className="text-xs text-gray-600">
          <span className="font-medium">{key}:</span> {String(value)}
        </div>
      ));
      
      if (changes.length > 0) {
        return (
          <div className="mt-1 p-2 bg-gray-50 rounded">
            {changes}
          </div>
        );
      }
    }

    return null;
  };

  // Função para obter ícone do campo
  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'email': return Mail;
      case 'phone': return Phone;
      case 'number': return DollarSign;
      case 'date': return Calendar;
      case 'textarea': return FileText;
      case 'select': return ChevronDown;
      case 'text':
      default: return User;
    }
  };

  // Funções auxiliares para cadência
  const getChannelIcon = (canal: string) => {
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

  const getChannelColor = (canal: string): string => {
    switch (canal) {
      case 'email': return 'text-blue-600 bg-blue-100';
      case 'whatsapp': return 'text-green-600 bg-green-100';
      case 'ligacao': return 'text-purple-600 bg-purple-100';
      case 'sms': return 'text-orange-600 bg-orange-100';
      case 'tarefa': return 'text-gray-600 bg-gray-100';
      case 'visita': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusBadge = (task: LeadTask) => {
    const isOverdue = task.status === 'pendente' && new Date(task.data_programada) < new Date();
    
    if (isOverdue) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Vencida</span>;
    }
    
    switch (task.status) {
      case 'pendente':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendente</span>;
      case 'concluida':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Concluída</span>;
      case 'cancelada':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Cancelada</span>;
      default:
        return null;
    }
  };

  const formatTaskDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (taskDate.getTime() === today.getTime()) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (taskDate.getTime() === today.getTime() + 24 * 60 * 60 * 1000) {
      return `Amanhã às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Só fechar se clicou no overlay (não no modal)
        if (e.target === e.currentTarget) {
          console.log('🔍 MODAL-DETAILS: Clique no overlay detectado');
          
          // VERIFICAR BLOQUEIO RADICAL PRIMEIRO
          if (GLOBAL_MODAL_BLOCK) {
            console.warn('🚫 MODAL-DETAILS: Overlay BLOQUEADO pelo sistema radical!');
            console.warn('🚨 MODAL NÃO PODE SER FECHADO - BLOQUEIO ATIVO!');
            return;
          }
          
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
            {(isUpdatingStage || GLOBAL_MODAL_BLOCK) && (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-lg font-bold bg-red-500 text-white border-4 border-red-600 animate-pulse shadow-lg">
                  🚫 MODAL BLOQUEADO - AGUARDE
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800 border-2 border-yellow-300 animate-bounce">
                  ⚡ Atualizando etapa...
                </span>
                {GLOBAL_MODAL_BLOCK && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border-2 border-red-300 animate-pulse">
                    🛡️ BLOQUEIO RADICAL ATIVO
                  </span>
                )}
              </div>
            )}
            {/* Seletor de Etapa */}
            {(() => {
              console.log('🔍 LeadDetailsModal: Lead stage_id:', lead.stage_id || 'NULL/UNDEFINED');
              
              // Garantir que temos um stage_id válido
              const validStageId = lead.stage_id && lead.stage_id !== 'null' ? lead.stage_id : '';
              
              return (
                <StageSelector 
                  leadId={lead.id}
                  currentStageId={validStageId}
                  onStageChange={(leadId, updatedData) => {
                    console.log('🔄 MODAL-DETAILS: onStageChange executado', { leadId, updatedData });
                    console.log('🛡️ MODAL-DETAILS: Modal BLOQUEADO pelo sistema radical!');
                    
                    // REFORÇAR BLOQUEIO RADICAL
                    GLOBAL_MODAL_BLOCK = true;
                    GLOBAL_MODAL_FORCE_OPEN = true;
                    
                    // Garantir proteção adicional
                    modalControl.protectModal(10000); // 10 segundos extras
                    
                    // Evitar que qualquer erro feche o modal
                    try {
                      // ✅ CORREÇÃO: Recarregar histórico após mudança de etapa com delay
                      setTimeout(() => {
                        console.log('🔄 MODAL-DETAILS: Recarregando histórico após mudança de etapa');
                        loadHistory();
                      }, 1000); // Aguardar 1 segundo para garantir que o registro foi salvo
                      
                      // Notificar componente pai
                      if (onUpdate) {
                        console.log('🔔 MODAL-DETAILS: Chamando onUpdate do componente pai');
                        onUpdate(leadId, updatedData);
                      }
                    } catch (error) {
                      console.error('❌ MODAL-DETAILS: Erro em onStageChange, mas modal permanece BLOQUEADO:', error);
                    }
                    
                    console.log('✅ MODAL-DETAILS: onStageChange concluído - modal BLOQUEADO');
                  }}
                />
              );
            })()}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('❌ MODAL-DETAILS: Botão X clicado');
              
              // VERIFICAR BLOQUEIO RADICAL PRIMEIRO
              if (GLOBAL_MODAL_BLOCK) {
                console.warn('🚫 MODAL-DETAILS: Botão X BLOQUEADO pelo sistema radical!');
                console.warn('🚨 MODAL NÃO PODE SER FECHADO - BLOQUEIO ATIVO!');
                return;
              }
              
              if (modalControl.isModalProtected()) {
                console.log('🚫 MODAL-DETAILS: Modal protegido - usando forceClose');
                if (onForceClose) {
                  modalControl.forceCloseModal();
                  onForceClose();
                } else {
                  console.log('⚠️ MODAL-DETAILS: Modal protegido mas sem onForceClose');
                }
              } else {
                console.log('🔒 MODAL-DETAILS: Fechamento normal');
                protectedOnClose();
              }
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
            { id: 'google-calendar', label: 'Google Calendar', icon: Calendar },
            { id: 'acoes', label: 'Ações', icon: Activity }
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
                  
                  // Filtrar apenas campos customizados que foram realmente criados para este pipeline
                  // E que NÃO são campos básicos do sistema
                  const camposCustomizadosReais = customFields.filter(field => {
                    const value = getLeadData(field.field_name);
                    const temValor = value !== null && value !== undefined && value.toString().trim() !== '';
                    const naoECampoBasico = !camposBasicosDoSistema.includes(field.field_name);
                    
                    return temValor && naoECampoBasico;
                  });
                  
                  return camposCustomizadosReais.length > 0 ? (
                    <div>
                      <h3 className="text-md font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">
                        Campos Customizados ({camposCustomizadosReais.length})
                      </h3>
                      <div className="space-y-1">
                        {camposCustomizadosReais.map(field => {
                          const value = getLeadData(field.field_name);
                          const IconComponent = getFieldIcon(field.field_type);
                          
                          return (
                            <div key={field.id} className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded-md transition-colors">
                              <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-700">{field.field_label}:</span>
                                <span className="ml-2 text-sm text-gray-900">
                                  {field.field_type === 'select' && field.field_options ? 
                                    field.field_options.find(opt => opt === value) || value :
                                    value
                                  }
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
                      
                      {history.map((entry, index) => {
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
                                    {entry.user_name.charAt(0).toUpperCase()}
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
                  <div className="text-2xl font-bold text-blue-900">{leadTasks.length}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-yellow-600">Pendentes</div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {leadTasks.filter(task => task.status === 'pendente').length}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-600">Concluídas</div>
                  <div className="text-2xl font-bold text-green-900">
                    {leadTasks.filter(task => task.status === 'concluida').length}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-red-600">Vencidas</div>
                  <div className="text-2xl font-bold text-red-900">
                    {leadTasks.filter(task => task.status === 'pendente' && new Date(task.data_programada) < new Date()).length}
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
                ) : leadTasks.length === 0 ? (
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
                    {leadTasks.map(task => (
                      <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        {/* Header da tarefa */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {/* Ícone do canal */}
                            <div className={`p-2 rounded-lg ${getChannelColor(task.canal)}`}>
                              {getChannelIcon(task.canal)}
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
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Enviando...' : 'Comentar'}
                  </button>
                </div>
              </div>

              {/* Lista de comentários */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum comentário ainda</p>
                  </div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {comment.user_name.charAt(0).toUpperCase()}
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
                  <span className="text-sm text-gray-500">{feedbacks.length} feedback(s)</span>
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
                      onClick={handleAddFeedback}
                      disabled={!newFeedback.trim() || loading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Enviando...' : 'Enviar Feedback'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de feedbacks */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {feedbacks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ThumbsUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum feedback ainda</p>
                  </div>
                ) : (
                  feedbacks.map(feedback => (
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

          {/* ABA AÇÕES */}
          {activeTab === 'acoes' && (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ações</h3>
              <p className="text-gray-600">
                Em breve funcionalidades de ações serão implementadas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Wrapper com Provider do controle isolado
const LeadDetailsModalWithProvider: React.FC<LeadDetailsModalProps> = (props) => {
  return (
    <ModalControlProvider>
      <LeadDetailsModal {...props} />
    </ModalControlProvider>
  );
};

export default LeadDetailsModalWithProvider; 