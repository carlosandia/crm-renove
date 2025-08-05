import { useQuery } from '@tanstack/react-query';
import { LeadOpportunityApiService, PipelineMember } from '../services/leadOpportunityApiService';

/**
 * Hook para carregar membros de uma pipeline
 * Utiliza TanStack Query para cache inteligente
 */
export const usePipelineMembers = (pipelineId: string | undefined) => {
  return useQuery({
    queryKey: ['pipeline-members', pipelineId],
    queryFn: () => LeadOpportunityApiService.loadPipelineMembers(pipelineId!),
    enabled: !!pipelineId,
    staleTime: 5 * 60 * 1000, // 5 minutos (membros mudam pouco)
    gcTime: 15 * 60 * 1000, // 15 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      errorMessage: 'Erro ao carregar membros da pipeline'
    }
  });
};