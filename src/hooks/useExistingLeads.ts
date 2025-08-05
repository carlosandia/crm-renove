import { useQuery } from '@tanstack/react-query';
import { LeadOpportunityApiService, ExistingLead } from '../services/leadOpportunityApiService';
import { useAuth } from '../providers/AuthProvider';

/**
 * Hook para carregar leads existentes de outras pipelines
 * Utiliza TanStack Query para cache inteligente com filtro role-based
 */
export const useExistingLeads = (pipelineId: string | undefined) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['existing-leads', pipelineId, user?.role, user?.id], // ✅ Cache role-based
    queryFn: async () => {
      console.log('🔍 [useExistingLeads] Iniciando carregamento:', {
        pipeline_id: pipelineId?.substring(0, 8),
        user_role: user?.role,
        user_id: user?.id?.substring(0, 8)
      });
      
      const leads = await LeadOpportunityApiService.loadExistingLeads(pipelineId!);
      
      console.log('📋 [useExistingLeads] Hook recebeu leads:', {
        total: leads.length,
        user_role: user?.role,
        sample_leads: leads.slice(0, 2).map(l => ({
          id: l.id.substring(0, 8),
          nome: l.custom_data?.nome
        }))
      });
      
      return leads;
    },
    enabled: !!pipelineId && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      errorMessage: 'Erro ao carregar leads existentes'
    }
  });
};

/**
 * Hook para buscar leads existentes com filtro role-based
 */
export const useSearchExistingLeads = (pipelineId: string | undefined, searchTerm: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['existing-leads-search', pipelineId, searchTerm, user?.role, user?.id], // ✅ Cache role-based
    queryFn: () => LeadOpportunityApiService.searchExistingLeads(pipelineId!, searchTerm),
    enabled: !!pipelineId && searchTerm.length >= 2 && !!user, // Só buscar com 2+ caracteres e usuário logado
    staleTime: 30 * 1000, // 30 segundos para buscas
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    meta: {
      errorMessage: 'Erro na busca de leads'
    }
  });
};