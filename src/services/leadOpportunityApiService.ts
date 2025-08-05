import { api } from '../lib/api';

// ================================================================================
// TIPOS E INTERFACES
// ================================================================================

export interface ExistingLead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  lead_master_id: string;
  created_at: string;
  custom_data: {
    nome: string;
    nome_lead?: string;
    nome_contato?: string;
    email: string;
    email_contato?: string;
    telefone: string;
    telefone_contato?: string;
    empresa?: string;
    cargo?: string;
    temperatura?: string;
    status?: string;
    valor?: number;
    lead_master_id: string;
  };
}

export interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  stage_type: string;
}

export interface PipelineMember {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface CreateOpportunityRequest {
  pipeline_id: string;
  stage_id: string;
  nome_oportunidade: string;
  valor?: string;
  responsavel?: string;
  nome_lead: string;
  nome_contato?: string;
  email: string;
  email_contato?: string;
  telefone?: string;
  telefone_contato?: string;
  lead_source: 'existing_lead' | 'new_lead';
  existing_lead_id?: string | null;
  [key: string]: any; // Para campos customizados
}

export interface CreateOpportunityResponse {
  success: boolean;
  message: string;
  opportunity_id?: string;
  lead_id?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ================================================================================
// SERVIÇO DE API PARA LEADS E OPORTUNIDADES
// ================================================================================
export class LeadOpportunityApiService {
  
  /**
   * Carregar leads existentes de outras pipelines
   */
  static async loadExistingLeads(pipelineId: string): Promise<ExistingLead[]> {
    try {
      if (import.meta.env.DEV) {
        console.log('🔍 [LeadOpportunityApiService] Carregando leads existentes para pipeline:', pipelineId.substring(0, 8));
      }
      
      const response = await api.get<ApiResponse<ExistingLead[]>>(`/leads/existing/${pipelineId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao carregar leads existentes');
      }
      
      if (import.meta.env.DEV) {
        console.log('✅ [LeadOpportunityApiService] Leads carregados:', {
          total: response.data.data.length,
          pipeline_id: pipelineId.substring(0, 8),
          sample_leads: response.data.data.slice(0, 3).map(lead => ({
            id: lead.id.substring(0, 8),
            nome: lead.custom_data?.nome || 'Sem nome',
            pipeline: lead.pipeline_id?.substring(0, 8),
            email: lead.custom_data?.email
          }))
        });
      }
      return response.data.data;
      
    } catch (error) {
      console.error('❌ [LeadOpportunityApiService] Erro ao carregar leads existentes:', error);
      throw error;
    }
  }

  /**
   * Carregar stages de uma pipeline
   */
  static async loadPipelineStages(pipelineId: string): Promise<PipelineStage[]> {
    try {
      if (import.meta.env.DEV) {
        console.log('🔍 [LeadOpportunityApiService] Carregando stages da pipeline:', pipelineId.substring(0, 8));
      }
      
      const response = await api.get<ApiResponse<PipelineStage[]>>(`/pipelines/${pipelineId}/stages`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao carregar stages da pipeline');
      }
      
      if (import.meta.env.DEV) {
        console.log('✅ [LeadOpportunityApiService] Stages carregadas:', response.data.data.length);
      }
      return response.data.data;
      
    } catch (error) {
      console.error('❌ [LeadOpportunityApiService] Erro ao carregar stages:', error);
      throw error;
    }
  }

  /**
   * Carregar membros de uma pipeline
   */
  static async loadPipelineMembers(pipelineId: string): Promise<PipelineMember[]> {
    try {
      if (import.meta.env.DEV) {
        console.log('🔍 [LeadOpportunityApiService] Carregando membros da pipeline:', pipelineId.substring(0, 8));
      }
      
      const response = await api.get<ApiResponse<PipelineMember[]>>(`/pipelines/${pipelineId}/members`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao carregar membros da pipeline');
      }
      
      if (import.meta.env.DEV) {
        console.log('✅ [LeadOpportunityApiService] Membros carregados:', response.data.data.length);
      }
      return response.data.data;
      
    } catch (error) {
      console.error('❌ [LeadOpportunityApiService] Erro ao carregar membros:', error);
      throw error;
    }
  }

  /**
   * Criar nova oportunidade (novo lead ou lead existente)
   */
  static async createOpportunity(opportunityData: CreateOpportunityRequest): Promise<CreateOpportunityResponse> {
    try {
      if (import.meta.env.DEV) {
        console.log('🚀 [LeadOpportunityApiService] Criando oportunidade:', {
          pipeline: opportunityData.pipeline_id.substring(0, 8),
          stage: opportunityData.stage_id.substring(0, 8),
          nome: opportunityData.nome_oportunidade,
          source: opportunityData.lead_source,
          existing_lead: opportunityData.existing_lead_id?.substring(0, 8) || 'N/A'
        });
      }
      
      const response = await api.post<CreateOpportunityResponse>('/opportunities/create', opportunityData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao criar oportunidade');
      }
      
      if (import.meta.env.DEV) {
        console.log('✅ [LeadOpportunityApiService] Oportunidade criada:', {
          success: response.data.success,
          opportunity_id: response.data.opportunity_id?.substring(0, 8),
          lead_id: response.data.lead_id?.substring(0, 8)
        });
      }
      
      return response.data;
      
    } catch (error: any) {
      console.error('❌ [LeadOpportunityApiService] Erro ao criar oportunidade:', error);
      
      // Tratar diferentes tipos de erro
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Erro desconhecido ao criar oportunidade');
      }
    }
  }

  /**
   * Buscar leads existentes com filtro
   */
  static async searchExistingLeads(pipelineId: string, searchTerm: string): Promise<ExistingLead[]> {
    try {
      if (import.meta.env.DEV) {
        console.log('🔍 [LeadOpportunityApiService] Buscando leads com termo:', searchTerm);
      }
      
      const response = await api.get<ApiResponse<ExistingLead[]>>(`/leads/existing/${pipelineId}/search`, {
        params: { q: searchTerm }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao buscar leads');
      }
      
      if (import.meta.env.DEV) {
        console.log('✅ [LeadOpportunityApiService] Busca concluída:', response.data.data.length, 'resultados');
      }
      return response.data.data;
      
    } catch (error) {
      console.error('❌ [LeadOpportunityApiService] Erro na busca:', error);
      throw error;
    }
  }
}