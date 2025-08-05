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
    staleTime: 5 * 60 * 1000, // 5 minutos (stages mudam pouco)
    gcTime: 15 * 60 * 1000, // 15 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      errorMessage: 'Erro ao carregar stages da pipeline'
    }
  });
};