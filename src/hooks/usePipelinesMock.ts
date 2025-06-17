import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  pipeline_members?: PipelineMember[];
  pipeline_stages?: any[];
}

export interface PipelineMember {
  id: string;
  assigned_at: string;
  member_id: string;
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
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

  const loadPipelines = useCallback(async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const mockPipelines = [
        {
          id: '1',
          name: 'Pipeline Vendas B2B',
          description: 'Pipeline principal para vendas B2B',
          tenant_id: user.tenant_id,
          created_by: user.id || user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          pipeline_members: []
        }
      ];

      await new Promise(resolve => setTimeout(resolve, 500));
      setPipelines(mockPipelines);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pipelines');
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id, user?.id, user?.email]);

  const createPipeline = useCallback(async (data: CreatePipelineData): Promise<boolean> => {
    const newPipeline = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      tenant_id: user?.tenant_id || '',
      created_by: user?.id || user?.email || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pipeline_members: []
    };
    setPipelines(prev => [newPipeline, ...prev]);
    return true;
  }, [user?.tenant_id, user?.id, user?.email]);

  const updatePipeline = useCallback(async (id: string, data: Partial<CreatePipelineData>): Promise<boolean> => {
    setPipelines(prev => prev.map(p => 
      p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p
    ));
    return true;
  }, []);

  const deletePipeline = useCallback(async (id: string): Promise<boolean> => {
    setPipelines(prev => prev.filter(p => p.id !== id));
    return true;
  }, []);

  const addMember = useCallback(async (pipelineId: string, memberId: string): Promise<boolean> => {
    return true;
  }, []);

  const removeMember = useCallback(async (pipelineId: string, memberId: string): Promise<boolean> => {
    return true;
  }, []);

  useEffect(() => {
    if (user?.tenant_id) {
      loadPipelines();
    }
  }, [user?.tenant_id, loadPipelines]);

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