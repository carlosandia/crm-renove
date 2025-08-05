import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Lead } from '../../../types/Pipeline';
import { loggers } from '../../../utils/logger';

interface UseLeadCardActionsProps {
  lead: Lead;
  onViewDetails?: (lead: Lead) => void;
  onViewDetailsWithTab?: (lead: Lead, tab: string) => void;
}

export const useLeadCardActions = ({ 
  lead, 
  onViewDetails, 
  onViewDetailsWithTab 
}: UseLeadCardActionsProps) => {
  const queryClient = useQueryClient();

  // Função para forçar refresh de cache se contagem estiver errada
  const forceRefreshCache = useCallback(() => {
    // Log apenas em desenvolvimento para debug
    if (import.meta.env.DEV) {
      loggers.performance('LeadCard', 'force_refresh', 0, 0);
    }
    queryClient.invalidateQueries({ queryKey: ['card-tasks', lead.id] });
    queryClient.invalidateQueries({ queryKey: ['activities'] });
    queryClient.invalidateQueries({ queryKey: ['leadTasks'] });
  }, [lead.id, queryClient]);

  // Handlers para ações específicas
  const handleEmailClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetailsWithTab) {
      onViewDetailsWithTab(lead, 'email');
    } else if (onViewDetails) {
      onViewDetails(lead);
    }
  }, [lead, onViewDetails, onViewDetailsWithTab]);

  const handleScheduleMeetingClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetailsWithTab) {
      onViewDetailsWithTab(lead, 'google-calendar');
    } else if (onViewDetails) {
      onViewDetails(lead);
    }
  }, [lead, onViewDetails, onViewDetailsWithTab]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // ✅ EVENT COOPERATION: Verificar se evento foi usado para drag & drop
    if (e.defaultPrevented) {
      console.log('🚫 [handleCardClick] Evento foi usado para drag & drop - ignorando clique');
      return; // Foi drag - não processar clique
    }
    
    console.log('🖱️ [handleCardClick] Clique detectado - processando...', {
      leadId: lead.id.substring(0, 8),
      leadName: lead.first_name + ' ' + lead.last_name,
      hasOnViewDetails: !!onViewDetails
    });
    
    // ✅ LÓGICA ORIGINAL: Processar clique normalmente
    e.stopPropagation();
    
    if (onViewDetails) {
      console.log('✅ [handleCardClick] Executando onViewDetails callback');
      onViewDetails(lead);
    } else {
      console.warn('⚠️ [handleCardClick] onViewDetails callback não está definido');
    }
  }, [lead, onViewDetails]);

  return {
    forceRefreshCache,
    handleEmailClick,
    handleScheduleMeetingClick,
    handleCardClick
  };
};

export default useLeadCardActions;