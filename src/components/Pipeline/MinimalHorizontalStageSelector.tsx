// =====================================================================================
// COMPONENT: MinimalHorizontalStageSelector
// Autor: Claude (Arquiteto Sênior)  
// Descrição: Pipeline horizontal minimalista estilo Pipedrive/Linear
// =====================================================================================

import React, { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { registerStageMove } from '../../utils/historyUtils';
import { toast } from 'sonner';

interface Stage {
  id: string;
  name: string;
  order: number;
  pipeline_id: string;
}

interface MinimalHorizontalStageSelectorProps {
  leadId: string;
  currentStageId: string;
  onStageChange?: (leadId: string, updatedData: any) => void;
}

export const MinimalHorizontalStageSelector: React.FC<MinimalHorizontalStageSelectorProps> = ({ 
  leadId, 
  currentStageId, 
  onStageChange 
}) => {
  const { user } = useAuth();
  const [stages, setStages] = useState<Stage[]>([]);
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(false);
  const [changingStageId, setChangingStageId] = useState<string | null>(null);

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

        if (allStagesError || !allStages) {
          return;
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

        // Encontrar pipeline do lead atual
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
    if (newStageId === currentStageId || loading || changingStageId) return;

    setLoading(true);
    setChangingStageId(newStageId);
    
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
        if (currentStageId && currentStageId !== 'null' && currentStageId.trim() !== '') {
          await registerStageMove(leadId, currentStageId, newStageId, user?.id);
        }
      } catch (historyError) {
        // Registro de histórico falhou, mas mudança de stage foi bem-sucedida
        console.warn('⚠️ Histórico não registrado:', historyError);
      }

      // Atualizar estado local
      const newStage = stages.find(s => s.id === newStageId);
      setCurrentStage(newStage || null);

      // Notificar componente pai
      if (onStageChange) {
        onStageChange(leadId, { stage_id: newStageId });
      }

      toast.success('Etapa alterada com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao alterar etapa:', error);
      toast.error('Erro ao alterar etapa. Tente novamente.');
    } finally {
      setLoading(false);
      setChangingStageId(null);
    }
  };

  // Determinar o estado visual de cada stage
  const getStageStatus = (stage: Stage): 'completed' | 'current' | 'future' => {
    if (!currentStage) return 'future';
    
    if (stage.id === currentStage.id) return 'current';
    
    // Stages com order menor que o atual são completados
    if (stage.order < currentStage.order) return 'completed';
    
    return 'future';
  };

  // Verificar se pode clicar na stage
  const canClickStage = (stage: Stage): boolean => {
    if (loading || changingStageId) return false;
    if (stage.id === currentStageId) return false;
    return true;
  };

  if (!currentStage || stages.length === 0) {
    return (
      <div className="flex items-center space-x-2 py-2">
        <div className="animate-pulse flex space-x-2">
          <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
          <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
          <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
        </div>
        <span className="text-xs text-gray-400">Carregando etapas...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 py-1">
      {stages.map((stage, index) => {
        const status = getStageStatus(stage);
        const isChanging = changingStageId === stage.id;
        const clickable = canClickStage(stage);
        
        return (
          <React.Fragment key={stage.id}>
            {/* Círculo da Stage */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => clickable ? handleStageChange(stage.id) : undefined}
                disabled={!clickable}
                className={`relative w-5 h-5 rounded-full transition-all duration-200 flex items-center justify-center text-xs font-medium ${
                  status === 'completed'
                    ? 'bg-green-500 text-white hover:bg-green-600' // Verde para completado
                    : status === 'current'
                    ? 'bg-blue-500 text-white ring-2 ring-blue-200' // Azul para atual
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300' // Cinza para futuro
                } ${
                  clickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                } ${
                  isChanging ? 'animate-pulse' : ''
                }`}
                title={`${stage.name}${status === 'current' ? ' (Atual)' : ''}`}
              >
                {isChanging ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : status === 'completed' ? (
                  <Check className="w-3 h-3" />
                ) : status === 'current' ? (
                  <div className="w-2 h-2 bg-white rounded-full" />
                ) : (
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                )}
              </button>
              
              {/* Label da Stage - Apenas para stage atual em telas maiores */}
              {status === 'current' && (
                <span className="hidden sm:block text-xs text-gray-600 mt-1 font-medium max-w-16 truncate">
                  {stage.name}
                </span>
              )}
            </div>

            {/* Linha de Conexão */}
            {index < stages.length - 1 && (
              <div className={`flex-1 h-px transition-colors duration-200 ${
                status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
              }`} style={{ minWidth: '16px', maxWidth: '32px' }} />
            )}
          </React.Fragment>
        );
      })}

      {/* Indicador de loading global */}
      {loading && (
        <div className="ml-2 flex items-center space-x-1">
          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
          <span className="text-xs text-blue-600">Atualizando...</span>
        </div>
      )}
    </div>
  );
};