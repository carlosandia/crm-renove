import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  pipeline_members?: any[];
  pipeline_stages?: any[];
}

export interface CreatePipelineData {
  name: string;
  description: string;
  member_ids: string[];
}

export const usePipelines = () => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar pipelines de forma simples
  const loadPipelines = useCallback(async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar apenas pipelines básicas
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (pipelinesError) {
        console.error('Erro ao carregar pipelines:', pipelinesError);
        setError(pipelinesError.message);
        setPipelines([]);
        return;
      }

      // Definir pipelines sem tentar carregar relacionamentos
      const formattedPipelines = (pipelinesData || []).map(pipeline => ({
        ...pipeline,
        pipeline_stages: [],
        pipeline_members: []
      }));

      setPipelines(formattedPipelines);
    } catch (err: any) {
      console.error('Erro inesperado ao carregar pipelines:', err);
      setError(err.message || 'Erro ao carregar pipelines');
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  // Criar pipeline
  const createPipeline = useCallback(async (data: CreatePipelineData): Promise<boolean> => {
    if (!user?.tenant_id || !user?.email) return false;

    try {
      setError(null);

      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          name: data.name,
          description: data.description,
          tenant_id: user.tenant_id,
          created_by: user.email
        })
        .select()
        .single();

      if (pipelineError) {
        throw pipelineError;
      }

      await loadPipelines();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar pipeline');
      console.error('Erro ao criar pipeline:', err);
      return false;
    }
  }, [user?.tenant_id, user?.email, loadPipelines]);

  // Atualizar pipeline
  const updatePipeline = useCallback(async (id: string, data: Partial<CreatePipelineData>): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabase
        .from('pipelines')
        .update({
          name: data.name,
          description: data.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', user?.tenant_id);

      if (error) {
        throw error;
      }

      await loadPipelines();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar pipeline');
      console.error('Erro ao atualizar pipeline:', err);
      return false;
    }
  }, [user?.tenant_id, loadPipelines]);

  // Excluir pipeline
  const deletePipeline = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user?.tenant_id);

      if (error) {
        throw error;
      }

      await loadPipelines();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir pipeline');
      console.error('Erro ao excluir pipeline:', err);
      return false;
    }
  }, [user?.tenant_id, loadPipelines]);

  // Adicionar membro (placeholder)
  const addMember = useCallback(async (pipelineId: string, memberId: string): Promise<boolean> => {
    try {
      // Implementação básica sem erro
      return true;
    } catch (err: any) {
      return false;
    }
  }, []);

  // Remover membro (placeholder)
  const removeMember = useCallback(async (pipelineId: string, memberId: string): Promise<boolean> => {
    try {
      // Implementação básica sem erro
      return true;
    } catch (err: any) {
      return false;
    }
  }, []);

  // Carregar pipelines ao montar o hook
  useEffect(() => {
    if (user?.tenant_id && (user.role === 'admin' || user.role === 'member')) {
      loadPipelines();
    }
  }, [user?.tenant_id, user?.role, loadPipelines]);

  return {
    pipelines,
    loading,
    error,
    loadPipelines,
    createPipeline,
    updatePipeline,
    deletePipeline,
    addMember,
    removeMember,
  };
}; 