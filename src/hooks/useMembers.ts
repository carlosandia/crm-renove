import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone?: string;
  is_active?: boolean;
  tenant_id?: string;
  created_at?: string;
}

export interface PipelineMember {
  id: string;
  pipeline_id: string;
  member_id: string;
  assigned_at: string;
  users?: User;
}

export const useMembers = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar membros
  const loadMembers = useCallback(async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar todos os usuários do tenant
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, phone, is_active, tenant_id, created_at')
        .eq('tenant_id', user.tenant_id)
        .in('role', ['admin', 'member', 'super_admin'])
        .order('first_name', { ascending: true });

      if (usersError) {
        throw usersError;
      }

      setMembers(usersData || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar membros');
      console.error('Erro ao carregar membros:', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  // Filtrar membros disponíveis (não vinculados a uma pipeline específica)
  const getAvailableMembers = useCallback((excludeMembers: string[] = []): User[] => {
    return members.filter(member => !excludeMembers.includes(member.id));
  }, [members]);

  // Buscar membros de uma pipeline específica
  const getPipelineMembers = useCallback(async (pipelineId: string): Promise<User[]> => {
    try {
      const { data: pipelineMembers, error } = await supabase
        .from('pipeline_members')
        .select('member_id')
        .eq('pipeline_id', pipelineId);

      if (error) throw error;

      if (!pipelineMembers || pipelineMembers.length === 0) {
        return [];
      }

      const memberIds = pipelineMembers.map(pm => pm.member_id);
      
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, phone, is_active, tenant_id, created_at')
        .in('id', memberIds);

      if (usersError) throw usersError;

      return users || [];
    } catch (err: any) {
      console.error('Erro ao buscar membros da pipeline:', err);
      return [];
    }
  }, []);

  // Vincular membro a pipeline
  const linkMemberToPipeline = useCallback(async (pipelineId: string, memberId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('pipeline_members')
        .insert({
          pipeline_id: pipelineId,
          member_id: memberId
        });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Erro ao vincular membro à pipeline:', err);
      return false;
    }
  }, []);

  // Desvincular membro de pipeline
  const unlinkMemberFromPipeline = useCallback(async (pipelineId: string, memberId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('pipeline_members')
        .delete()
        .eq('pipeline_id', pipelineId)
        .eq('member_id', memberId);

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Erro ao desvincular membro da pipeline:', err);
      return false;
    }
  }, []);

  // Obter vendedores (apenas role 'member')
  const getSalesMembers = useCallback((): User[] => {
    return members.filter(member => member.role === 'member' && member.is_active !== false);
  }, [members]);

  // Obter admins
  const getAdminMembers = useCallback((): User[] => {
    return members.filter(member => member.role === 'admin' && member.is_active !== false);
  }, [members]);

  // Carregar membros ao montar o hook
  useEffect(() => {
    if (user?.tenant_id && (user.role === 'admin' || user.role === 'member' || user.role === 'super_admin')) {
      loadMembers();
    }
  }, [user?.tenant_id, user?.role, loadMembers]);

  return {
    members,
    loading,
    error,
    loadMembers,
    getAvailableMembers,
    getPipelineMembers,
    linkMemberToPipeline,
    unlinkMemberFromPipeline,
    getSalesMembers,
    getAdminMembers,
  };
}; 