import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { showSuccessToast, showErrorToast } from './useToast';
import { loggers } from '../utils/logger';
import { useQueryClient } from '@tanstack/react-query';

interface GenerateActivitiesOptions {
  leadId: string;
  leadMasterId?: string; // ✅ NOVO: ID correto para geração de atividades
  pipelineId: string;
  stageId: string;
  assignedTo?: string;
}

/**
 * Hook para gerar atividades de cadência (uso legacy)
 * NOTA: Sistema agora gera atividades automaticamente na criação e mudança de etapa
 * Este hook permanece para casos especiais ou correções manuais
 */
export const useCadenceActivityGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const generateActivities = useCallback(async (options: GenerateActivitiesOptions) => {
    if (!user?.id || !user?.tenant_id) {
      showErrorToast('Usuário não autenticado');
      return { success: false, error: 'Usuário não autenticado' };
    }

    setIsGenerating(true);
    
    try {
      loggers.leadTasks('Iniciando geração manual de atividades', {
        pipeline_lead_id: options.leadId.substring(0, 8),
        lead_master_id: options.leadMasterId?.substring(0, 8) || 'N/A',
        pipelineId: options.pipelineId.substring(0, 8),
        stageId: options.stageId.substring(0, 8),
        operation: 'manual-generation-start'
      });

      // ✅ SIMPLIFICADO: Lógica de resolução de IDs
      const finalLeadId = options.leadMasterId || options.leadId;
      
      loggers.leadTasks('Gerando atividades manualmente', {
        leadId: finalLeadId?.substring(0, 8),
        pipelineId: options.pipelineId.substring(0, 8),
        stageId: options.stageId.substring(0, 8)
      });
      
      // Logs reduzidos para melhor performance

      // Obter token de autenticação
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        throw new Error('Token de autenticação não disponível');
      }

      // ✅ API Call: Usar URL relativa padrão
      const response = await fetch(`/api/cadence/generate-task-instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_id: finalLeadId,
          pipeline_id: options.pipelineId,
          stage_id: options.stageId,  
          assigned_to: options.assignedTo || user.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // ✅ Log da resposta simplificado
      loggers.leadTasks('Resposta da geração de atividades', {
        success: result.success,
        tasksCreated: result.tasks_created || 0,
        message: result.message
      });
      
      loggers.leadTasks('Geração manual de atividades concluída', {
        pipeline_lead_id: options.leadId.substring(0, 8),
        lead_master_id: options.leadMasterId?.substring(0, 8) || 'N/A',
        tasksCreated: result.tasks_created || 0,
        success: result.success,
        operation: 'manual-generation-success'
      });

      if (result.success) {
        const tasksCount = result.tasks_created || 0;
        
        // ✅ Toast inteligente baseado no resultado
        if (tasksCount > 0) {
          showSuccessToast(`${tasksCount} atividades geradas com sucesso!`);
        } else {
          showSuccessToast('Atividades já estão atualizadas para esta etapa');
        }
        
        // ✅ Invalidar cache de atividades
        loggers.leadTasks('Cache invalidado', {
          leadId: finalLeadId?.substring(0, 8),
          tasksCreated: tasksCount
        });
        
        queryClient.invalidateQueries({ 
          queryKey: ['card-tasks', options.leadMasterId || options.leadId, user.tenant_id] 
        });
        
        return { 
          success: true, 
          tasksCreated: tasksCount,
          message: result.message 
        };
      } else {
        throw new Error(result.message || 'Erro desconhecido na geração de atividades');
      }

    } catch (error: any) {
      loggers.apiError('Erro na geração manual de atividades', error, {
        pipeline_lead_id: options.leadId.substring(0, 8),
        lead_master_id: options.leadMasterId?.substring(0, 8) || 'N/A',
        operation: 'manual-generation-error'
      });

      const errorMessage = error.message || 'Erro ao gerar atividades';
      showErrorToast(errorMessage);
      
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setIsGenerating(false);
    }
  }, [user, queryClient]);

  return {
    generateActivities,
    isGenerating
  };
};