import { useQuery } from '@tanstack/react-query';
import { LeadOpportunityApiService, PipelineStage } from '../services/leadOpportunityApiService';

/**
 * Hook para carregar stages de uma pipeline
 * Utiliza TanStack Query para cache inteligente
 */
export const usePipelineStages = (pipelineId: string | undefined) => {
  return useQuery({
    queryKey: ['pipeline-stages', pipelineId],
    queryFn: () => LeadOpportunityApiService.loadPipelineStages(pipelineId!),
    enabled: !!pipelineId,
    staleTime: 10 * 60 * 1000, // ✅ ETAPA 5: 10 minutos (stages mudam raramente)
    gcTime: 20 * 60 * 1000, // ✅ ETAPA 5: 20 minutos - cache longo
    refetchOnWindowFocus: false, // ✅ ETAPA 5: Evitar refetch desnecessário
    retry: 2, // ✅ ETAPA 5: Reduzir tentativas para diminuir tráfego
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      errorMessage: 'Erro ao carregar stages da pipeline'
    }
  });
};