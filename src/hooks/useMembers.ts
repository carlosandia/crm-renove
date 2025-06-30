import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useSupabaseCrud } from './useSupabaseCrud';

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
  
  // ✅ USANDO NOVO HOOK BASE UNIFICADO
  const usersCrud = useSupabaseCrud<User>({
    tableName: 'users',
    selectFields: 'id, first_name, last_name, email, role, phone, is_active, tenant_id, created_at',
    defaultOrderBy: { column: 'first_name', ascending: true },
    enableCache: true,
    cacheKeyPrefix: 'members',
    cacheDuration: 300000 // 5 minutos
  });

  // ============================================
  // CARREGAMENTO AUTOMÁTICO
  // ============================================

  useEffect(() => {
    if (user?.tenant_id && (user.role === 'admin' || user.role === 'member' || user.role === 'super_admin')) {
      // Filtrar usuários do tenant com roles específicos
      usersCrud.fetchAll({
        filters: {
          tenant_id: user.tenant_id
        }
      }).catch(error => {
        console.warn('⚠️ [useMembers] Erro no carregamento automático:', error);
      });
    }
  }, [user?.tenant_id, user?.role]);

  // ============================================
  // FUNÇÕES DE CONVENIÊNCIA (MANTIDAS)
  // ============================================

  // Filtrar membros disponíveis (não vinculados a uma pipeline específica)
  const getAvailableMembers = useCallback((excludeMembers: string[] = []): User[] => {
    return usersCrud.data.filter(member => !excludeMembers.includes(member.id));
  }, [usersCrud.data]);

  // Buscar membros de uma pipeline específica
  const getPipelineMembers = useCallback(async (pipelineId: string): Promise<User[]> => {
    try {
      console.log('🔍 [useMembers] Buscando membros da pipeline:', pipelineId);
      
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

      console.log('✅ [useMembers] Membros da pipeline encontrados:', users?.length || 0);
      return users || [];
    } catch (err: any) {
      console.error('❌ [useMembers] Erro ao buscar membros da pipeline:', err);
      return [];
    }
  }, []);

  // Vincular membro a pipeline
  const linkMemberToPipeline = useCallback(async (pipelineId: string, memberId: string): Promise<boolean> => {
    try {
      console.log('🔗 [useMembers] Vinculando membro à pipeline:', { pipelineId, memberId });
      
      const { error } = await supabase
        .from('pipeline_members')
        .insert({
          pipeline_id: pipelineId,
          member_id: memberId
        });

      if (error) throw error;
      
      console.log('✅ [useMembers] Membro vinculado com sucesso');
      return true;
    } catch (err: any) {
      console.error('❌ [useMembers] Erro ao vincular membro à pipeline:', err);
      return false;
    }
  }, []);

  // Desvincular membro de pipeline
  const unlinkMemberFromPipeline = useCallback(async (pipelineId: string, memberId: string): Promise<boolean> => {
    try {
      console.log('🔗 [useMembers] Desvinculando membro da pipeline:', { pipelineId, memberId });
      
      const { error } = await supabase
        .from('pipeline_members')
        .delete()
        .eq('pipeline_id', pipelineId)
        .eq('member_id', memberId);

      if (error) throw error;
      
      console.log('✅ [useMembers] Membro desvinculado com sucesso');
      return true;
    } catch (err: any) {
      console.error('❌ [useMembers] Erro ao desvincular membro da pipeline:', err);
      return false;
    }
  }, []);

  // Obter vendedores (apenas role 'member')
  const getSalesMembers = useCallback((): User[] => {
    return usersCrud.data.filter(member => member.role === 'member' && member.is_active !== false);
  }, [usersCrud.data]);

  // Obter admins
  const getAdminMembers = useCallback((): User[] => {
    return usersCrud.data.filter(member => member.role === 'admin' && member.is_active !== false);
  }, [usersCrud.data]);

  // ============================================
  // INTERFACE COMPATÍVEL (MANTIDA)
  // ============================================

  return {
    // ✅ DADOS DO HOOK BASE UNIFICADO
    members: usersCrud.data,
    loading: usersCrud.isLoading,
    error: usersCrud.error,
    
    // ✅ OPERAÇÕES DO HOOK BASE UNIFICADO  
    loadMembers: () => usersCrud.fetchAll({
      filters: {
        tenant_id: user?.tenant_id
      }
    }),
    
    // ✅ FUNÇÕES ESPECÍFICAS MANTIDAS
    getAvailableMembers,
    getPipelineMembers,
    linkMemberToPipeline,
    unlinkMemberFromPipeline,
    getSalesMembers,
    getAdminMembers,
    
    // ✅ FUNCIONALIDADES EXTRAS DO HOOK BASE
    refresh: usersCrud.refresh,
    findMember: (predicate: (member: User) => boolean) => usersCrud.findOne(predicate),
    findMembers: (predicate: (member: User) => boolean) => usersCrud.findMany(predicate),
    createMember: usersCrud.create,
    updateMember: usersCrud.update,
    deleteMember: usersCrud.remove,
    
    // ✅ ESTADOS DETALHADOS
    states: {
      isEmpty: usersCrud.isEmpty,
      hasData: usersCrud.hasData,
      fetchState: usersCrud.fetchState,
      createState: usersCrud.createState,
      updateState: usersCrud.updateState,
      deleteState: usersCrud.deleteState
    },
    
    // ✅ CONTROLES DE CACHE
    clearCache: usersCrud.clearCache
  };
}; 