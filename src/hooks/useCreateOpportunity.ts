import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateOpportunityRequest } from '../services/leadOpportunityApiService';
import { showSuccessToast, showErrorToast } from './useToast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { logger } from '../utils/logger';

/**
 * ✅ URL UNIVERSAL: Detecção automática baseada no hostname atual
 * CORREÇÃO CRÍTICA: Retorna URL base SEM /api pois será adicionado na rota
 */
const getCurrentBackendURL = () => {  
  // Usar variável de ambiente configurada ou fallback para desenvolvimento
  return import.meta.env.VITE_API_URL || (import.meta.env.VITE_ENVIRONMENT === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:3001');
};

/**
 * Hook para criar nova oportunidade
 * SIMPLIFICADO: Seguindo diretrizes CLAUDE.md - simples e objetivo
 */
export const useCreateOpportunity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationKey: ['create-opportunity', user?.id],
    mutationFn: async (data: CreateOpportunityRequest) => {
      logger.info('Iniciando criação de oportunidade', {
        operation: 'create-start',
        pipeline_id: data.pipeline_id?.substring(0, 8),
        nome_oportunidade: data.nome_oportunidade
      });

      // ✅ AUTENTICAÇÃO BÁSICA SUPABASE
      if (!user?.id || !user?.tenant_id) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // ✅ VALIDAÇÃO BÁSICA DE UUIDs
      if (data.stage_id?.length !== 36) {
        throw new Error(`Stage ID inválido: "${data.stage_id}"`);
      }

      if (data.pipeline_id?.length !== 36) {
        throw new Error(`Pipeline ID inválido: "${data.pipeline_id}"`);
      }

      // ✅ VALIDAÇÃO DE PRIMEIRA ETAPA (simplificada)
      const { data: stageInfo, error: stageError } = await supabase
        .from('pipeline_stages')
        .select('order_index, name')
        .eq('id', data.stage_id)
        .eq('tenant_id', user.tenant_id)
        .single();

      if (stageError || !stageInfo) {
        throw new Error('Etapa da pipeline não encontrada');
      }

      const stageOrderIndex = typeof stageInfo.order_index === 'number' 
        ? stageInfo.order_index 
        : parseInt(stageInfo.order_index) || 0;

      if (stageOrderIndex !== 0) {
        throw new Error(`Oportunidade só pode ser criada na primeira etapa. Etapa atual: "${stageInfo.name}"`);
      }

      // ✅ CHAMADA PARA BACKEND API (correção da URL)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Token de autenticação não disponível');
      }
      
      const requestPayload = {
        pipeline_id: data.pipeline_id,
        stage_id: data.stage_id,
        nome_oportunidade: data.nome_oportunidade,
        nome_lead: data.nome_lead,
        email: data.email,
        telefone: data.telefone || '',
        lead_source: data.lead_source,
        existing_lead_id: data.existing_lead_id,
        responsavel: data.responsavel,
        valor: data.valor,
        nome_contato: data.nome_contato,
        email_contato: data.email_contato,
        telefone_contato: data.telefone_contato
      };

      // ✅ CORREÇÃO: URL com prefixo /api/ correto
      const apiUrl = getCurrentBackendURL();
      const createOpportunityUrl = `${apiUrl}/api/opportunities/create`;
      
      logger.debug('Backend API request', {
        operation: 'backend-api-request',
        url: createOpportunityUrl
      });

      const response = await fetch(createOpportunityUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Backend API error', {
          operation: 'backend-api-error',
          status: response.status,
          error: errorText
        });
        throw new Error(`Erro ao criar oportunidade: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Erro ao criar oportunidade');
      }

      logger.info('Oportunidade criada com sucesso', {
        operation: 'opportunity-created',
        opportunity_id: result.opportunity_id?.substring(0, 8)
      });

      return {
        success: true,
        message: 'Oportunidade criada com sucesso',
        opportunity_id: result.opportunity_id,
        lead_id: result.lead_id
      };
    },
    
    onSuccess: (result, variables) => {
      logger.info('Oportunidade criada com sucesso', { 
        operation: 'mutation-success',
        opportunity_id: result.opportunity_id?.substring(0, 8)
      });

      // ✅ CACHE INVALIDATION ESSENCIAL
      const pipelineId = variables.pipeline_id;
      
      queryClient.invalidateQueries({ 
        queryKey: ['pipeline-leads', pipelineId] 
      });
      
      queryClient.invalidateQueries({
        queryKey: ['enterprise-metrics', pipelineId]
      });
      
      queryClient.invalidateQueries({
        queryKey: ['existing-leads']
      });

      showSuccessToast('Oportunidade criada com sucesso!');
    },

    onError: (error: Error) => {
      logger.error('Erro na criação de oportunidade', { 
        operation: 'mutation-error', 
        error: error.message 
      });
      
      let errorMessage = 'Erro ao criar oportunidade';
      
      if (error.message.includes('não autenticado')) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (error.message.includes('primeira etapa')) {
        errorMessage = error.message;
      } else if (error.message.includes('email')) {
        errorMessage = 'Email inválido ou já existente.';
      } else {
        errorMessage = error.message;
      }
      
      showErrorToast(errorMessage);
    }
  });
};