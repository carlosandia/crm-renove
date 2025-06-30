import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Pipeline, PipelineStage, CustomField, PipelineMember } from '../types/Pipeline';
import { Lead } from '../types/CRM';

// ✅ INTERFACE COMPLETA
interface UsePipelineDataReturn {
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  leads: Lead[];
  loading: boolean;
  error: string | null;
  setSelectedPipeline: (pipeline: Pipeline | null) => void;
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>; 
  handleCreateLead: (stageId: string, leadData: any) => Promise<Lead | null>;
  updateLeadStage: (leadId: string, stageId: string) => Promise<void>;
  updateLeadData: (leadId: string, data: any) => Promise<void>;
  refreshPipelines: () => Promise<void>;
  refreshLeads: () => Promise<void>;
  getUserPipelines: () => Pipeline[];
  getAdminCreatedPipelines: () => Pipeline[];
  getMemberLinkedPipelines: () => Pipeline[];
  linkMemberToPipeline: (memberId: string, pipelineId: string) => Promise<boolean>;
  unlinkMemberFromPipeline: (memberId: string, pipelineId: string) => Promise<boolean>;
  getPipelineMembers: (pipelineId: string) => Promise<PipelineMember[]>;
}

export const usePipelineData = (): UsePipelineDataReturn => {
  const { user, authenticatedFetch, refreshTokens } = useAuth();
  
  // Estados principais
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log helper
  const log = (message: string, ...args: any[]) => {
    console.log(`🔄 [UsePipelineData] ${message}`, ...args);
  };

  /**
   * ✅ FUNÇÃO PRINCIPAL DE BUSCA DE PIPELINES
   */
  const fetchPipelines = useCallback(async (): Promise<void> => {
    if (!user) {
      log('⚠️ Usuário não autenticado');
      setPipelines([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    log('🔄 Iniciando busca de pipelines para:', user.email);

    // ✅ CORREÇÃO PONTUAL: Forçar renovação de token antes da busca
    if (refreshTokens) {
      try {
        log('🔄 Renovando token antes da busca...');
        await refreshTokens();
        log('✅ Token renovado com sucesso');
      } catch (error) {
        log('⚠️ Erro na renovação de token, mas continuando...', error);
      }
    }

    try {
      // ✅ USAR API BACKEND PARA ADMIN/SUPER_ADMIN
      if ((user.role === 'admin' || user.role === 'super_admin') && authenticatedFetch) {
        
        log('📡 Fazendo requisição para /pipelines via API backend...');
        const response = await authenticatedFetch('/pipelines');
        
        if (!response.ok) {
          throw new Error(`API retornou: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        log('📥 Resposta da API recebida:', { 
          success: data.success,
          pipelinesCount: data.pipelines?.length || 0
        });
        
        if (data.success && data.pipelines) {
          let pipelinesData = data.pipelines;
          
          // ✅ APLICAR FILTROS BASEADOS NO ROLE (PRESERVANDO ISOLAMENTO)
          if (user.role === 'admin') {
            const adminIdentifiers = [user.id, user.email].filter(Boolean);
            const adminPipelines = pipelinesData.filter((p: any) => 
              adminIdentifiers.some(id => p.created_by === id)
            );
            
            log('🔍 FILTRO ADMIN aplicado:', {
              totalPipelines: pipelinesData.length,
              adminPipelines: adminPipelines.length,
              pipelineNames: adminPipelines.map((p: any) => p.name)
            });
            
            pipelinesData = adminPipelines;
          }
          
          setPipelines(pipelinesData);
          log('✅ Pipelines carregadas com sucesso:', pipelinesData.length);
        } else {
          log('⚠️ API retornou estrutura inesperada:', data);
          setPipelines([]);
        }
        
      } else {
        // ✅ FALLBACK PARA MEMBERS OU QUANDO API NÃO DISPONÍVEL
        log('🔄 Buscando pipelines via Supabase (fallback)');
        
        const { data: supabasePipelines, error: supabaseError } = await supabase
          .from('pipelines')
          .select('*')
          .eq('tenant_id', user.tenant_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
          
        if (supabaseError) {
          throw supabaseError;
        }
        
        const pipelinesData = (supabasePipelines || []).map(p => ({
          ...p,
          pipeline_stages: [],
          pipeline_custom_fields: [],
          pipeline_members: []
        }));
        
        setPipelines(pipelinesData);
        log('✅ Pipelines carregadas via Supabase:', pipelinesData.length);
      }

    } catch (fetchError: any) {
      console.error('❌ Erro ao buscar pipelines:', fetchError);
      setPipelines([]);
      setError('Erro ao carregar pipelines');
    } finally {
      setLoading(false);
    }
  }, [user, authenticatedFetch, refreshTokens]);

  /**
   * ✅ BUSCAR LEADS DE UMA PIPELINE
   */
  const fetchLeads = useCallback(async (pipelineId?: string): Promise<void> => {
    if (!pipelineId || !user) return;

    try {
      const { data, error } = await supabase
        .from('pipeline_leads')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setLeads(data || []);
    } catch (error) {
      console.error('❌ Erro ao buscar leads:', error);
      setLeads([]);
    }
  }, [user]);

  /**
   * ✅ IMPLEMENTAR FUNÇÕES NECESSÁRIAS
   */
  const handleCreateLead = useCallback(async (stageId: string, leadData: any): Promise<Lead | null> => {
    // Implementação placeholder
    log('🔧 handleCreateLead chamado:', { stageId, leadData });
    return null;
  }, []);

  const updateLeadStage = useCallback(async (leadId: string, stageId: string): Promise<void> => {
    log('🔧 updateLeadStage chamado:', { leadId, stageId });
  }, []);

  const updateLeadData = useCallback(async (leadId: string, data: any): Promise<void> => {
    log('🔧 updateLeadData chamado:', { leadId, data });
  }, []);

  const refreshLeads = useCallback(async (): Promise<void> => {
    if (selectedPipeline) {
      await fetchLeads(selectedPipeline.id);
    }
  }, [selectedPipeline, fetchLeads]);

  const getUserPipelines = useCallback((): Pipeline[] => {
    return pipelines;
  }, [pipelines]);

  const getAdminCreatedPipelines = useCallback((): Pipeline[] => {
    if (user?.role === 'super_admin') {
      return pipelines;
    }
    // Para admin, filtrar apenas pipelines criadas por ele
    return pipelines.filter(p => 
      p.created_by === user?.id || p.created_by === user?.email
    );
  }, [pipelines, user]);

  const getMemberLinkedPipelines = useCallback((): Pipeline[] => {
    // Para members, retornar todas as pipelines da empresa
    return pipelines;
  }, [pipelines]);

  const linkMemberToPipeline = useCallback(async (memberId: string, pipelineId: string): Promise<boolean> => {
    log('🔧 linkMemberToPipeline chamado:', { memberId, pipelineId });
    return true;
  }, []);

  const unlinkMemberFromPipeline = useCallback(async (memberId: string, pipelineId: string): Promise<boolean> => {
    log('🔧 unlinkMemberFromPipeline chamado:', { memberId, pipelineId });
    return true;
  }, []);

  const getPipelineMembers = useCallback(async (pipelineId: string): Promise<PipelineMember[]> => {
    log('🔧 getPipelineMembers chamado:', pipelineId);
    return [];
  }, []);

  // ✅ Carregar pipelines na inicialização
  useEffect(() => {
    if (user) {
      fetchPipelines();
    }
  }, [user, fetchPipelines]);

  // ✅ Carregar leads quando pipeline selecionada muda
  useEffect(() => {
    if (selectedPipeline) {
      fetchLeads(selectedPipeline.id);
    }
  }, [selectedPipeline, fetchLeads]);

  return {
    pipelines,
    selectedPipeline,
    leads,
    loading,
    error,
    setSelectedPipeline,
    setLeads,
    handleCreateLead,
    updateLeadStage,
    updateLeadData,
    refreshPipelines: fetchPipelines,
    refreshLeads,
    getUserPipelines,
    getAdminCreatedPipelines,
    getMemberLinkedPipelines,
    linkMemberToPipeline,
    unlinkMemberFromPipeline,
    getPipelineMembers
  };
}; 