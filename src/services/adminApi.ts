import { appConfig } from '../config/app';

/**
 * 🔧 ADMIN API SERVICE
 * Serviço para chamadas a endpoints administrativos backend
 * Substitui uso direto de service role no frontend
 */

export interface CreateOpportunityRequest {
  pipeline_id: string;
  stage_id: string;
  lead_master_id: string;
  assigned_to?: string;
  custom_data?: Record<string, any>;
  tenant_id: string;
  created_by: string;
  position?: number;
  status?: string;
  lifecycle_stage?: string;
}

export interface CreateOpportunityResponse {
  success: boolean;
  message: string;
  opportunity_id: string;
  lead_id: string;
  strategy_used: string;
}

/**
 * Criar oportunidade via backend service role
 * Substitui o fallback de service role que estava no frontend
 */
export const createOpportunityViaBackend = async (
  data: CreateOpportunityRequest
): Promise<CreateOpportunityResponse> => {
  console.log('🌐 [ADMIN-API] Chamando backend para criar oportunidade');
  
  try {
    const url = `${appConfig.api.baseUrl}/api/admin/create-opportunity`;
    console.log('🔗 [ADMIN-API] URL completa:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Adicionar JWT token quando implementado
      },
      body: JSON.stringify(data)
    });

    console.log('📡 [ADMIN-API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [ADMIN-API] Erro detalhado:', {
        status: response.status,
        statusText: response.statusText,
        url,
        errorData
      });
      
      throw new Error(
        errorData.message || 
        errorData.details || 
        `HTTP ${response.status}: ${response.statusText} (URL: ${url})`
      );
    }

    const result = await response.json();
    
    console.log('✅ [ADMIN-API] Oportunidade criada via backend:', {
      opportunity_id: result.opportunity_id?.substring(0, 8),
      strategy: result.strategy_used
    });

    return result;

  } catch (error) {
    console.error('❌ [ADMIN-API] Erro na chamada backend:', error);
    throw error;
  }
};

/**
 * Execução genérica de operações administrativas
 * Para futuras expansões da API admin
 */
export const executeAdminOperation = async (
  operation: string,
  data: Record<string, any>
): Promise<any> => {
  console.log(`🌐 [ADMIN-API] Executando operação: ${operation}`);
  
  try {
    const response = await fetch(`${appConfig.api.baseUrl}/api/admin/${operation}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || 
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();

  } catch (error) {
    console.error(`❌ [ADMIN-API] Erro na operação ${operation}:`, error);
    throw error;
  }
};