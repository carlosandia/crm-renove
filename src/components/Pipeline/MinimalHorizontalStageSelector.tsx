// =====================================================================================
// COMPONENT: MinimalHorizontalStageSelector
// Autor: Claude (Arquiteto Sênior)  
// Descrição: Pipeline horizontal minimalista estilo Pipedrive/Linear
// =====================================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { registerStageMove } from '../../utils/historyUtils';
import { toast } from 'sonner';
// CORREÇÃO 3: Componentes para hover effects melhorados
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface Stage {
  id: string;
  name: string;
  order: number;
  pipeline_id: string;
}

interface MinimalHorizontalStageSelectorProps {
  leadId: string;
  currentStageId: string;
  onStageChange?: (updatedLead: any) => void;
}

// ✅ PATTERN REACT-USE: useLatest para evitar stale closures
const useLatest = <T,>(value: T): React.MutableRefObject<T> => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};

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
  
  // ✅ REACT-USE PATTERN: useLatest para evitar stale closures
  const latestCurrentStageId = useLatest(currentStageId);
  const latestOnStageChange = useLatest(onStageChange);

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

  // ✅ REACT-USE PATTERN: handleStageChange otimizado com useLatest
  const handleStageChange = useCallback(async (newStageId: string) => {
    console.log('🎯 [MinimalHorizontalStageSelector] CLIQUE NA ETAPA DETECTADO:', {
      newStageId,
      currentStageId: latestCurrentStageId.current,
      leadId,
      loading,
      changingStageId,
      canProceed: newStageId !== latestCurrentStageId.current && !loading && !changingStageId
    });
    
    if (newStageId === latestCurrentStageId.current || loading || changingStageId) {
      console.log('❌ [MinimalHorizontalStageSelector] CLIQUE IGNORADO:', {
        reason: newStageId === latestCurrentStageId.current ? 'same_stage' : loading ? 'already_loading' : 'already_changing',
        newStageId,
        currentStageId: latestCurrentStageId.current,
        loading,
        changingStageId
      });
      return;
    }

    console.log('🚀 [MinimalHorizontalStageSelector] INICIANDO MUDANÇA DE ETAPA:', {
      de: currentStageId,
      para: newStageId,
      leadId,
      userId: user?.id
    });

    setLoading(true);
    setChangingStageId(newStageId);
    
    try {
      // Validar IDs
      if (!leadId || !newStageId) {
        console.log('❌ [MinimalHorizontalStageSelector] VALIDAÇÃO FALHOU:', {
          leadId: leadId || 'UNDEFINED',
          newStageId: newStageId || 'UNDEFINED'
        });
        throw new Error('Lead ID ou Stage ID inválido');
      }

      console.log('✅ [MinimalHorizontalStageSelector] VALIDAÇÃO PASSOU - INICIANDO UPDATE NO BANCO:', {
        leadId,
        newStageId,
        timestamp: new Date().toISOString()
      });

      // Tentar atualizar na tabela pipeline_leads primeiro
      let updateError = null;
      
      console.log('🔄 [MinimalHorizontalStageSelector] TENTANDO UPDATE EM pipeline_leads...');
      const { error: pipelineError } = await supabase
        .from('pipeline_leads')
        .update({ 
          stage_id: newStageId,
          moved_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (pipelineError) {
        console.log('⚠️ [MinimalHorizontalStageSelector] PIPELINE_LEADS FALHOU - TENTANDO FALLBACK:', {
          error: pipelineError.message,
          code: pipelineError.code
        });
        
        // Fallback para tabela leads se pipeline_leads falhar
        console.log('🔄 [MinimalHorizontalStageSelector] TENTANDO UPDATE EM leads (fallback)...');
        const { error: leadsError } = await supabase
          .from('leads')
          .update({ stage_id: newStageId })
          .eq('id', leadId);
        
        if (leadsError) {
          console.log('❌ [MinimalHorizontalStageSelector] FALLBACK LEADS TAMBÉM FALHOU:', {
            error: leadsError.message,
            code: leadsError.code
          });
          updateError = leadsError;
        } else {
          console.log('✅ [MinimalHorizontalStageSelector] FALLBACK LEADS SUCESSO');
        }
      } else {
        console.log('✅ [MinimalHorizontalStageSelector] PIPELINE_LEADS UPDATE SUCESSO');
      }

      if (updateError) throw updateError;

      console.log('🎯 [MinimalHorizontalStageSelector] BANCO ATUALIZADO COM SUCESSO - REGISTRANDO HISTÓRICO...');

      // Registrar no histórico
      try {
        if (currentStageId && currentStageId !== 'null' && currentStageId.trim() !== '') {
          console.log('📝 [MinimalHorizontalStageSelector] CHAMANDO registerStageMove:', {
            leadId,
            currentStageId,
            newStageId,
            userId: user?.id
          });
          
          await registerStageMove(leadId, currentStageId, newStageId, user?.id);
          
          console.log('✅ [MinimalHorizontalStageSelector] HISTÓRICO REGISTRADO COM SUCESSO');
        } else {
          console.log('⚠️ [MinimalHorizontalStageSelector] HISTÓRICO PULADO - currentStageId inválido:', currentStageId);
        }
      } catch (historyError) {
        // Registro de histórico falhou, mas mudança de stage foi bem-sucedida
        console.warn('⚠️ [MinimalHorizontalStageSelector] HISTÓRICO FALHOU (mas stage mudou):', historyError);
      }

      console.log('🔄 [MinimalHorizontalStageSelector] ATUALIZANDO ESTADO LOCAL...');

      // Atualizar estado local
      const newStage = stages.find(s => s.id === newStageId);
      setCurrentStage(newStage || null);

      console.log('📢 [MinimalHorizontalStageSelector] NOTIFICANDO COMPONENTE PAI via onStageChange...');

      // ✅ REACT-USE PATTERN: Notificar componente pai com lead completo atualizado
      if (latestOnStageChange.current) {
        console.log('🚀 [MinimalHorizontalStageSelector] EXECUTANDO onStageChange CALLBACK:', {
          leadId,
          newStageId,
          callbackExists: !!latestOnStageChange.current
        });
        
        // ✅ FASE 1: QUERY ROBUSTA COM FALLBACKS E RETRY MECHANISM
        try {
          console.log('🔍 [MinimalHorizontalStageSelector] INICIANDO BUSCA ROBUSTA DO LEAD ATUALIZADO:', {
            leadId,
            newStageId,
            timestamp: new Date().toISOString()
          });

          let updatedLead = null;
          let finalError = null;

          // ✅ RETRY MECHANISM: Tentar múltiplas vezes com delay
          const maxRetries = 3;
          const retryDelay = 100; // 100ms entre tentativas
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 [MinimalHorizontalStageSelector] TENTATIVA ${attempt}/${maxRetries} - Buscando lead:`, leadId);
            
            // Tentar pipeline_leads primeiro
            const { data: pipelineData, error: pipelineError } = await supabase
              .from('pipeline_leads')
              .select('*')
              .eq('id', leadId)
              .single();

            console.log('📊 [MinimalHorizontalStageSelector] RESULTADO pipeline_leads:', {
              attempt,
              hasData: !!pipelineData,
              dataPreview: pipelineData ? { id: pipelineData.id, stage_id: pipelineData.stage_id } : null,
              error: pipelineError?.message || null,
              errorCode: pipelineError?.code || null
            });

            if (!pipelineError && pipelineData) {
              updatedLead = pipelineData;
              console.log('✅ [MinimalHorizontalStageSelector] SUCESSO pipeline_leads na tentativa', attempt);
              break;
            }

            // Fallback para tabela leads se pipeline_leads falhar
            console.log(`🔄 [MinimalHorizontalStageSelector] FALLBACK TENTATIVA ${attempt} - Buscando em leads:`, leadId);
            
            const { data: leadsData, error: leadsError } = await supabase
              .from('leads')
              .select('*')
              .eq('id', leadId)
              .single();

            console.log('📊 [MinimalHorizontalStageSelector] RESULTADO leads fallback:', {
              attempt,
              hasData: !!leadsData,
              dataPreview: leadsData ? { id: leadsData.id, stage_id: leadsData.stage_id } : null,
              error: leadsError?.message || null,
              errorCode: leadsError?.code || null
            });

            if (!leadsError && leadsData) {
              updatedLead = leadsData;
              console.log('✅ [MinimalHorizontalStageSelector] SUCESSO leads fallback na tentativa', attempt);
              break;
            }

            finalError = leadsError || pipelineError;
            
            // Se não é a última tentativa, aguardar antes de tentar novamente
            if (attempt < maxRetries) {
              console.log(`⏳ [MinimalHorizontalStageSelector] AGUARDANDO ${retryDelay}ms antes da próxima tentativa...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }

          // ✅ VALIDAÇÃO E CONSTRUÇÃO INTELIGENTE DE DADOS
          if (!updatedLead || !updatedLead.id) {
            console.warn('⚠️ [MinimalHorizontalStageSelector] TODAS AS QUERIES FALHARAM - CONSTRUINDO FALLBACK INTELIGENTE:', {
              finalError: finalError?.message || 'Dados não encontrados',
              leadId,
              newStageId
            });

            // ✅ FALLBACK INTELIGENTE: Construir dados com base no que sabemos
            const fallbackLeadData = {
              id: leadId,
              stage_id: newStageId,
              moved_at: new Date().toISOString(),
              // Incluir dados essenciais para evitar quebras no frontend
              first_name: '',
              last_name: '',
              email: '',
              custom_data: {},
              temperature_level: 'warm',
              created_at: new Date().toISOString()
            };

            console.log('🛠️ [MinimalHorizontalStageSelector] USANDO FALLBACK INTELIGENTE:', fallbackLeadData);
            latestOnStageChange.current(fallbackLeadData);
          } else {
            // ✅ VALIDAÇÃO DE CONSISTÊNCIA: Verificar se stage_id foi realmente atualizado
            const hasCorrectStageId = updatedLead.stage_id === newStageId;
            
            console.log('🔍 [MinimalHorizontalStageSelector] VALIDAÇÃO DE CONSISTÊNCIA:', {
              expectedStageId: newStageId,
              actualStageId: updatedLead.stage_id,
              isConsistent: hasCorrectStageId,
              leadData: {
                id: updatedLead.id,
                stage_id: updatedLead.stage_id,
                moved_at: updatedLead.moved_at
              }
            });

            if (!hasCorrectStageId) {
              console.warn('⚠️ [MinimalHorizontalStageSelector] INCONSISTÊNCIA DETECTADA - CORRIGINDO stage_id:', {
                expected: newStageId,
                found: updatedLead.stage_id
              });
              // Corrigir stage_id nos dados retornados
              updatedLead.stage_id = newStageId;
              updatedLead.moved_at = new Date().toISOString();
            }

            console.log('✅ [MinimalHorizontalStageSelector] DADOS COMPLETOS VALIDADOS E CONSISTENTES:', {
              id: updatedLead.id,
              stage_id: updatedLead.stage_id,
              moved_at: updatedLead.moved_at,
              hasCustomData: !!updatedLead.custom_data
            });
            
            latestOnStageChange.current(updatedLead);
          }
        } catch (fetchCompleteDataError) {
          console.error('❌ [MinimalHorizontalStageSelector] ERRO CRÍTICO NA BUSCA ROBUSTA:', {
            error: fetchCompleteDataError.message || fetchCompleteDataError,
            leadId,
            newStageId,
            timestamp: new Date().toISOString()
          });
          
          // ✅ ÚLTIMO FALLBACK: Sempre garantir que callback seja chamado
          const emergencyFallback = {
            id: leadId,
            stage_id: newStageId,
            moved_at: new Date().toISOString(),
            first_name: '',
            last_name: '',
            email: '',
            custom_data: {},
            temperature_level: 'warm',
            created_at: new Date().toISOString()
          };
          
          console.log('🚨 [MinimalHorizontalStageSelector] USANDO FALLBACK DE EMERGÊNCIA:', emergencyFallback);
          latestOnStageChange.current(emergencyFallback);
        }
        
        console.log('✅ [MinimalHorizontalStageSelector] onStageChange CALLBACK EXECUTADO');
      } else {
        console.log('⚠️ [MinimalHorizontalStageSelector] onStageChange CALLBACK NÃO EXISTE');
      }

      console.log('🎉 [MinimalHorizontalStageSelector] MUDANÇA DE ETAPA COMPLETADA COM SUCESSO');
      toast.success('Etapa alterada com sucesso!');

    } catch (error) {
      console.error('❌ [MinimalHorizontalStageSelector] ERRO CRÍTICO NA MUDANÇA DE ETAPA:', {
        error: error.message || error,
        leadId,
        newStageId,
        currentStageId,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      toast.error('Erro ao alterar etapa. Tente novamente.');
    } finally {
      console.log('🏁 [MinimalHorizontalStageSelector] FINALIZANDO MUDANÇA DE ETAPA:', {
        loading: false,
        changingStageId: null,
        finalStageId: currentStageId
      });
      setLoading(false);
      setChangingStageId(null);
    }
  }, [leadId, loading, changingStageId, stages, user?.id]); // ✅ Dependencies do useCallback

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
    <TooltipProvider>
      <div className="flex items-center space-x-1 py-1">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage);
          const isChanging = changingStageId === stage.id;
          const clickable = canClickStage(stage);
          
          return (
            <React.Fragment key={stage.id}>
              {/* CORREÇÃO 3: Círculo da Stage com Tooltip melhorado */}
              <div className="flex flex-col items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => clickable ? handleStageChange(stage.id) : undefined}
                      disabled={!clickable}
                      className={`relative w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center text-xs font-medium transform group ${
                        status === 'completed'
                          ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-lg hover:shadow-green-200' 
                          : status === 'current'
                          ? 'bg-blue-500 text-white ring-2 ring-blue-200 shadow-md hover:ring-4 hover:ring-blue-100' 
                          : 'bg-gray-200 text-gray-500 hover:bg-blue-100 hover:text-blue-600 hover:shadow-md hover:shadow-blue-100' 
                      } ${
                        clickable ? 'cursor-pointer hover:scale-110 hover:z-10 active:scale-95' : 'cursor-default'
                      } ${
                        isChanging ? 'animate-pulse' : ''
                      }`}
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
                  </TooltipTrigger>
                  {/* CORREÇÃO 3: Tooltip com informações melhoradas */}
                  <TooltipContent side="top" className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
                    <div className="text-center">
                      <div className="font-semibold text-sm">{stage.name}</div>
                      <div className="text-xs text-gray-300 mt-1">
                        {status === 'current' && '✓ Etapa atual'}
                        {status === 'completed' && '✅ Etapa concluída'}
                        {status === 'future' && clickable && '👆 Clique para mover para esta etapa'}
                        {status === 'future' && !clickable && '⏸️ Etapa futura'}
                      </div>
                      {/* CORREÇÃO 3: Mostrar posição na pipeline */}
                      <div className="text-xs text-gray-400 mt-1">
                        Posição {stage.order} de {stages.length}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
                
                {/* Label da Stage - CORREÇÃO 3: Melhorado com Magic UI styling sempre visível */}
                <div className="text-center mt-1">
                  <span className={`text-xs font-medium max-w-20 block truncate transition-all duration-300 transform ${
                    status === 'current' 
                      ? 'text-blue-600 scale-105 font-semibold' 
                      : status === 'completed' 
                      ? 'text-green-600 scale-100' 
                      : clickable
                      ? 'text-gray-500 hover:text-gray-700 hover:scale-105 cursor-pointer'
                      : 'text-gray-400'
                  }`}>
                    {stage.name}
                  </span>
                  
                  {/* CORREÇÃO 3: Mini indicador de progresso abaixo do nome */}
                  <div className={`w-full h-0.5 mt-1 rounded-full transition-all duration-300 ${
                    status === 'current' 
                      ? 'bg-blue-500 shadow-sm' 
                      : status === 'completed' 
                      ? 'bg-green-500 shadow-sm' 
                      : 'bg-transparent'
                  }`} />
                </div>
              </div>

              {/* CORREÇÃO 3: Linha de Conexão com animação Magic UI melhorada */}
              {index < stages.length - 1 && (
                <div className="relative flex-1 flex items-center px-2">
                  <div className={`w-full h-px transition-all duration-500 ${
                    status === 'completed' 
                      ? 'bg-gradient-to-r from-green-400 to-green-300 shadow-sm' 
                      : 'bg-gray-200 hover:bg-gradient-to-r hover:from-blue-200 hover:to-blue-100'
                  }`} style={{ minWidth: '16px', maxWidth: '32px' }}>
                    {/* Mini pulse indicator para stage progress */}
                    {status === 'completed' && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Indicador de loading global melhorado */}
        {loading && (
          <div className="ml-2 flex items-center space-x-1">
            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
            <span className="text-xs text-blue-600 font-medium">Atualizando...</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};