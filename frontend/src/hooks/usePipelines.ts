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
  pipeline_stages?: PipelineStage[];
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

export interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  temperature_score: number;
  max_days_allowed: number;
  color: string;
  follow_ups?: FollowUp[];
}

export interface FollowUp {
  id: string;
  day_offset: number;
  note: string;
  is_active: boolean;
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

  const API_BASE = 'http://localhost:5001/api';

  // Carregar pipelines
  const loadPipelines = useCallback(async () => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/pipelines?tenant_id=${user.tenant_id}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar pipelines');
      }

      const data = await response.json();
      setPipelines(data.pipelines || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao carregar pipelines:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  // Criar pipeline
  const createPipeline = useCallback(async (data: CreatePipelineData): Promise<boolean> => {
    if (!user?.tenant_id || !user?.email) return false;

    try {
      setError(null);

      const response = await fetch(`${API_BASE}/pipelines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          tenant_id: user.tenant_id,
          created_by: user.email
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar pipeline');
      }

      await loadPipelines(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pipeline');
      console.error('Erro ao criar pipeline:', err);
      return false;
    }
  }, [user?.tenant_id, user?.email, loadPipelines]);

  // Atualizar pipeline
  const updatePipeline = useCallback(async (id: string, data: Partial<CreatePipelineData>): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE}/pipelines/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar pipeline');
      }

      await loadPipelines(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar pipeline');
      console.error('Erro ao atualizar pipeline:', err);
      return false;
    }
  }, [loadPipelines]);

  // Excluir pipeline
  const deletePipeline = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE}/pipelines/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir pipeline');
      }

      await loadPipelines(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir pipeline');
      console.error('Erro ao excluir pipeline:', err);
      return false;
    }
  }, [loadPipelines]);

  // Adicionar membro
  const addMember = useCallback(async (pipelineId: string, memberId: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE}/pipelines/${pipelineId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ member_id: memberId }),
      });

      if (!response.ok) {
        throw new Error('Erro ao adicionar membro');
      }

      await loadPipelines(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar membro');
      console.error('Erro ao adicionar membro:', err);
      return false;
    }
  }, [loadPipelines]);

  // Remover membro
  const removeMember = useCallback(async (pipelineId: string, memberId: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE}/pipelines/${pipelineId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao remover membro');
      }

      await loadPipelines(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover membro');
      console.error('Erro ao remover membro:', err);
      return false;
    }
  }, [loadPipelines]);

  // Carregar pipelines ao montar o hook
  useEffect(() => {
    if (user?.tenant_id && (user.role === 'admin' || user.role === 'member')) {
      loadPipelines();
    }
  }, [user?.tenant_id, user?.role]);

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