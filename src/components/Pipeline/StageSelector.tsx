import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { registerStageMove } from '../../utils/historyUtils';

// Variáveis globais do sistema de modal (importadas do contexto principal)
declare global {
  var GLOBAL_MODAL_BLOCK: boolean;
  var GLOBAL_MODAL_FORCE_OPEN: boolean;
  var GLOBAL_MODAL_LEAD_ID: string | null;
}

interface Stage {
  id: string;
  name: string;
  order: number;
  pipeline_id: string;
}

interface ModalControlContextType {
  modalState: {
    isOpen: boolean;
    isProtected: boolean;
    protectionEndTime: number;
    leadId: string | null;
  };
  openModal: (leadId: string) => void;
  closeModal: () => boolean;
  protectModal: (duration?: number) => void;
  forceCloseModal: () => void;
  isModalProtected: () => boolean;
}

// Hook para usar o controle do modal (simplificado para standalone)
const useModalControl = (): ModalControlContextType => {
  // Implementação básica para compatibilidade standalone
  return {
    modalState: {
      isOpen: false,
      isProtected: false,
      protectionEndTime: 0,
      leadId: null
    },
    openModal: () => {},
    closeModal: () => true,
    protectModal: () => {},
    forceCloseModal: () => {},
    isModalProtected: () => false
  };
};

// Função para iniciar monitor global (simplificada para standalone)
const startGlobalModalMonitor = () => {
  return {
    stop: () => {}
  };
};

interface StageSelectorProps {
  leadId: string;
  currentStageId: string;
  onStageChange?: (leadId: string, updatedData: any) => void;
}

export const StageSelector: React.FC<StageSelectorProps> = ({ 
  leadId, 
  currentStageId, 
  onStageChange 
}) => {
  const { user } = useAuth();
  const modalControl = useModalControl();
  const [stages, setStages] = useState<Stage[]>([]);
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar stages da pipeline
  useEffect(() => {
    const loadStages = async () => {
      try {
        // Buscar stages com diferentes estruturas de colunas
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
            const result = await supabase
               .from('pipeline_stages')
               .select(columns)
               .order(columns.includes('order_index') ? 'order_index' : columns.includes('stage_order') ? 'stage_order' : 'order', { ascending: true });
            
            if (!result.error && result.data) {
              allStages = result.data;
              allStagesError = null;
              break;
            }
          } catch (e) {
            // Silenciar erros de colunas inexistentes
          }
        }

        if (allStagesError) {
          console.error('❌ Erro ao buscar stages:', allStagesError);
          return;
        }

        if (!allStages || allStages.length === 0) {
          // Verificar se existem pipelines para criar stages padrão
          const { data: pipelines, error: pipelinesError } = await supabase
            .from('pipelines')
            .select('id, name')
            .limit(1);
          
          if (!pipelinesError && pipelines && pipelines.length > 0) {
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
              allStages = createdStages;
            } else {
              return;
            }
          } else {
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

        // Se temos um currentStageId válido, encontrar sua pipeline
        let targetPipelineId = null;
        let currentStageFound = null;

        if (currentStageId && currentStageId !== 'null' && currentStageId.trim() !== '') {
          currentStageFound = normalizedStages.find(s => s.id === currentStageId);
          if (currentStageFound) {
            targetPipelineId = currentStageFound.pipeline_id;
          }
        }

        // Se não encontrou pipeline via stage, buscar do lead
        if (!targetPipelineId) {
          const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .select('pipeline_id')
            .eq('id', leadId)
            .single();

          if (!leadError && leadData?.pipeline_id) {
            targetPipelineId = leadData.pipeline_id;
          } else {
            // Último fallback: usar a primeira pipeline disponível
            const firstPipelineId = Object.keys(pipelineStages)[0];
            if (firstPipelineId) {
              targetPipelineId = firstPipelineId;
            }
          }
        }

        if (!targetPipelineId) {
          return;
        }

        // Obter stages da pipeline alvo
        const targetStages = pipelineStages[targetPipelineId] || [];
        
        if (targetStages.length === 0) {
          return;
        }

        setStages(targetStages);

        // Determinar stage atual
        const selectedStage = currentStageFound || targetStages[0];
        setCurrentStage(selectedStage || null);

        // Se não tinha um stage_id válido, atualizar o lead
        if (!currentStageFound && selectedStage) {
          try {
            await supabase
              .from('leads')
              .update({ 
                stage_id: selectedStage.id,
                pipeline_id: targetPipelineId 
              })
              .eq('id', leadId);
          } catch (updateError) {
            // Silenciar erro de atualização de lead
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
    if (typeof window !== 'undefined') {
      (window as any).GLOBAL_MODAL_BLOCK = true;
      (window as any).GLOBAL_MODAL_FORCE_OPEN = true;
      (window as any).GLOBAL_MODAL_LEAD_ID = leadId;
    }
    
    // Iniciar monitor global
    const monitor = startGlobalModalMonitor();
    
    // ATIVAR PROTEÇÃO ADICIONAL
    modalControl.protectModal(12000); // 12 segundos de proteção
    
    try {
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
        // Fallback para tabela leads se pipeline_leads falhar
        const { error: leadsError } = await supabase
          .from('leads')
          .update({ stage_id: newStageId })
          .eq('id', leadId);
        
        if (leadsError) {
          updateError = leadsError;
        }
      }

      if (updateError) throw updateError;

      // Registrar no histórico
      try {
        // Só registrar histórico se temos um currentStageId válido
        if (currentStageId && currentStageId !== 'null' && currentStageId.trim() !== '') {
          await registerStageMove(leadId, currentStageId, newStageId, user?.id);
        }
      } catch (historyError) {
        // Tentar inserção direta como fallback
        try {
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

          await supabase
            .from('lead_history')
            .insert([{
              lead_id: leadId,
              action: 'stage_moved',
              description: `Lead movido de "${oldStageName}" para "${newStageName}"`,
              user_id: user?.id,
              user_name: user ? `${(user as any).first_name || ''} ${(user as any).last_name || ''}`.trim() || user.email || 'Usuário' : 'Sistema',
              old_values: currentStageId && currentStageId !== 'null' ? { stage_id: currentStageId, stage_name: oldStageName } : {},
              new_values: { stage_id: newStageId, stage_name: newStageName },
              created_at: brasilTime
            }])
            .select('id')
            .single();

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
        onStageChange(leadId, { stage_id: newStageId });
      }

    } catch (error) {
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