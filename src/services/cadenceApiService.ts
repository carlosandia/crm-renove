import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

// ================================================================================
// TIPOS E INTERFACES
// ================================================================================
export interface CadenceTask {
  id?: string;
  day_offset: number;
  task_order: number;
  channel: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  action_type: 'mensagem' | 'ligacao' | 'tarefa' | 'email_followup' | 'agendamento' | 'proposta';
  task_title: string;
  task_description: string;
  template_content?: string;
  is_active: boolean;
}

export interface CadenceConfig {
  id?: string;
  pipeline_id?: string;
  stage_name: string;
  stage_order: number;
  tasks: CadenceTask[];
  is_active: boolean;
  tenant_id?: string;
}

export interface CadenceApiResponse {
  success?: boolean;
  message: string;
  configs: CadenceConfig[];
  source?: string;
}

export interface SaveCadenceRequest {
  pipeline_id: string;
  cadence_configs: CadenceConfig[];
  tenant_id: string;
  created_by?: string;
}

// ================================================================================
// SERVIÇO DE API PARA CADÊNCIA
// ================================================================================
export class CadenceApiService {
  
  /**
   * Carregar configurações de cadência para uma pipeline
   */
  static async loadCadenceForPipeline(pipelineId: string): Promise<CadenceConfig[]> {
    try {
      const response = await api.get<CadenceApiResponse>(`/cadence/load/${pipelineId}`);
      
      // ✅ OTIMIZADO: Log apenas quando há problemas ou dados importantes
      if (!response.data.configs || response.data.configs.length === 0) {
        console.log('⚠️ [CadenceApiService] Nenhuma configuração encontrada:', {
          pipelineId: pipelineId.substring(0, 8),
          source: response.data.source
        });
      }

      // ✅ MELHORIA: Se não há configurações, tentar reconstruir de task_instances
      if (!response.data.configs || response.data.configs.length === 0) {
        console.log('🛠️ [CadenceApiService] Nenhuma configuração encontrada, tentando reconstrução...');
        const reconstructed = await this.reconstructConfigsFromTaskInstances(pipelineId);
        if (reconstructed.length > 0) {
          console.log('✅ [CadenceApiService] Configurações reconstruídas com sucesso:', {
            pipelineId: pipelineId.substring(0, 8),
            reconstructedCount: reconstructed.length
          });
          return reconstructed;
        }
      }
      
      return response.data.configs || [];
    } catch (error: any) {
      console.error('❌ [CadenceApiService] Erro ao carregar configurações:', error);
      
      // Se erro 401/403, tentar fallback
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔄 [CadenceApiService] Tentando fallback service role...');
        return this.loadCadenceWithFallback(pipelineId);
      }
      
      // Para outros erros, tentar reconstrução como última tentativa
      console.log('🛠️ [CadenceApiService] Tentando reconstrução como último recurso...');
      const reconstructed = await this.reconstructConfigsFromTaskInstances(pipelineId);
      if (reconstructed.length > 0) {
        return reconstructed;
      }
      
      // Se tudo falhar, retornar array vazio
      console.warn('⚠️ [CadenceApiService] Retornando configurações vazias - todos os fallbacks falharam');
      return [];
    }
  }
  
  /**
   * Fallback para carregar com service role quando JWT falha
   */
  static async loadCadenceWithFallback(pipelineId: string): Promise<CadenceConfig[]> {
    try {
      console.log('🔄 [CadenceApiService] Executando fallback service role');
      
      // ✅ MIGRADO: Usar autenticação básica Supabase conforme CLAUDE.md
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn('⚠️ [CadenceApiService] Usuário não autenticado para fallback');
        return [];
      }

      const tenantId = user.user_metadata?.tenant_id;
      if (!tenantId) {
        console.warn('⚠️ [CadenceApiService] Tenant ID não encontrado para fallback');
        return [];
      }
      
      const response = await api.post<CadenceApiResponse>('/cadence/load', {
        pipeline_id: pipelineId,
        tenant_id: tenantId,
        user_id: user.id,
        fallback_mode: true,
        reason: 'JWT_auth_failed_from_frontend'
      });
      
      console.log('✅ [CadenceApiService] Fallback bem-sucedido:', {
        configsCount: response.data.configs?.length || 0
      });
      
      return response.data.configs || [];
    } catch (error: any) {
      console.error('❌ [CadenceApiService] Erro no fallback:', error);
      return [];
    }
  }

  /**
   * ✅ NOVO: Fallback inteligente que reconstrói configurações baseado em task_instances
   * Usado quando cadence_configs não existem mas há task_instances
   */
  static async reconstructConfigsFromTaskInstances(pipelineId: string): Promise<CadenceConfig[]> {
    try {
      console.log('🛠️ [CadenceApiService] Reconstruindo configurações de task_instances:', {
        pipelineId: pipelineId.substring(0, 8)
      });

      // ✅ MIGRADO: Usar autenticação básica Supabase conforme CLAUDE.md
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn('⚠️ [CadenceApiService] Usuário não autenticado para reconstrução');
        return [];
      }

      const tenantId = user.user_metadata?.tenant_id;
      if (!tenantId) {
        console.warn('⚠️ [CadenceApiService] Tenant ID não encontrado nos metadados do usuário');
        return [];
      }

      // Fazer chamada para backend para reconstruir configurações
      const response = await api.post<CadenceApiResponse>('/cadence/reconstruct', {
        pipeline_id: pipelineId,
        tenant_id: tenantId,
        user_id: user.id,
        reason: 'missing_cadence_configs_with_existing_task_instances'
      });

      if (response.data.success && response.data.configs) {
        console.log('✅ [CadenceApiService] Configurações reconstruídas:', {
          pipelineId: pipelineId.substring(0, 8),
          configsCount: response.data.configs.length
        });
        return response.data.configs;
      }

      console.warn('⚠️ [CadenceApiService] Reconstrução não retornou configurações');
      return [];
    } catch (error: any) {
      console.error('❌ [CadenceApiService] Erro na reconstrução:', error);
      return [];
    }
  }
  
  /**
   * Salvar configurações de cadência
   */
  static async saveCadenceConfigs(saveRequest: SaveCadenceRequest): Promise<boolean> {
    try {
      const response = await api.post('/cadence/save', saveRequest);
      return true;
    } catch (error: any) {
      console.error('❌ [CadenceApiService] Erro ao salvar:', error);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao salvar configurações');
    }
  }
  
  /**
   * Deletar configurações de uma pipeline
   */
  static async deleteCadenceConfigs(pipelineId: string, tenantId: string): Promise<boolean> {
    try {
      await api.delete(`/cadence/delete/${pipelineId}?tenant_id=${tenantId}`);
      return true;
    } catch (error: any) {
      console.error('❌ [CadenceApiService] Erro ao deletar:', error);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao deletar configurações');
    }
  }
  
  /**
   * Buscar configuração para uma etapa específica
   */
  static async getCadenceForStage(
    pipelineId: string, 
    stageName: string, 
    tenantId: string
  ): Promise<CadenceConfig | null> {
    try {
      const response = await api.get(
        `/cadence/stage/${pipelineId}/${encodeURIComponent(stageName)}?tenant_id=${tenantId}`
      );
      
      return response.data.config || null;
    } catch (error: any) {
      console.error('❌ [CadenceApiService] Erro ao buscar configuração da etapa:', error);
      
      if (error.response?.status === 404) {
        console.log('ℹ️ [CadenceApiService] Configuração não encontrada para a etapa');
        return null;
      }
      
      throw new Error(error.response?.data?.error || error.message || 'Erro ao buscar configuração');
    }
  }
}

// ================================================================================
// QUERY KEYS PARA REACT QUERY
// ================================================================================
export const cadenceQueryKeys = {
  all: ['cadence'] as const,
  pipelines: () => [...cadenceQueryKeys.all, 'pipelines'] as const,
  pipeline: (pipelineId: string) => [...cadenceQueryKeys.pipelines(), pipelineId] as const,
  stages: () => [...cadenceQueryKeys.all, 'stages'] as const,
  stage: (pipelineId: string, stageName: string) => [
    ...cadenceQueryKeys.stages(), 
    pipelineId, 
    stageName
  ] as const,
};

// Re-exportar tipos para uso no componente
export type {
  CadenceTask as CadenceTaskType,
  CadenceConfig as CadenceConfigType,
  SaveCadenceRequest as SaveCadenceRequestType
};