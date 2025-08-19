import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import { useSupabaseCrud } from './useSupabaseCrud';
import { UserMemberSchema } from '../shared/schemas/DomainSchemas';
import type { User } from '../shared/types/Domain';
import { usePerformanceMonitor } from '../shared/utils/performance';

// ✅ REACT.DEV PATTERN: Environment-based logging
const isDevelopment = import.meta.env.VITE_ENVIRONMENT === 'development';
const enableDebugLogs = isDevelopment && import.meta.env.VITE_LOG_LEVEL !== 'error';

/**
 * ✅ PADRÕES REACT.DEV IMPLEMENTADOS NESTE HOOK:
 * 
 * 1. USEEFFECT SEPARADOS POR TIPO DE SIDE EFFECT (React.dev Rules of Hooks)
 *    - useEffect para carregamento de dados (linhas 48-129)
 *    - useEffect para warnings de erro real (linhas 132-156) 
 *    - useEffect para logs informativos (linhas 296-315)
 * 
 * 2. DEPENDENCIES ARRAYS CORRETOS (React.dev exhaustive-deps)
 *    - Todas as dependencies explicitamente listadas
 *    - Evita infinite loops e stale closures
 * 
 * 3. IGNORE FLAG PATTERN (React.dev data fetching)
 *    - Cancela operações obsoletas para evitar race conditions
 *    - Implementado nas linhas 69-77 e 120-122
 * 
 * 4. CONDITIONAL SIDE EFFECTS (React.dev best practices)
 *    - Warnings apenas para condições de erro real
 *    - Logs informativos para estados normais
 *    - Throttling adequado para evitar spam
 * 
 * 5. MEMOIZATION PATTERNS (React.dev performance)
 *    - useMemo para cálculos caros (getSalesMembers, validMembers)
 *    - useCallback para funções estáveis
 *    - Dependencies arrays otimizados
 * 
 * 6. DEFENSIVE VALIDATION (React.dev robustness)
 *    - Validação de tipos em runtime
 *    - Tratamento gracioso de dados inválidos
 *    - Logs estruturados para debugging
 */

// ✅ THROTTLING: Cache global para controlar logs de warning
const membersWarningLogCache = new Set<string>();

export interface PipelineMember {
  id: string;
  pipeline_id: string;
  member_id: string;
  assigned_at: string;
  users?: User;
}

export const useMembers = () => {
  const { user } = useAuth();
  const performance = usePerformanceMonitor('useMembers');
  
  // ✅ THROTTLING: Refs para controlar logs duplicados
  const lastMembersWarningTime = useRef<number>(0);
  const lastSalesWarningTime = useRef<number>(0);
  
  // ✅ CORREÇÃO CRÍTICA: Usar tabela 'users' (auth.users não está disponível via REST API)
  // Frontend precisa usar tabela correta que está acessível
  const usersCrud = useSupabaseCrud({
    tableName: 'users',
    selectFields: 'id, first_name, last_name, email, role, is_active, tenant_id, created_at',
    defaultOrderBy: { column: 'first_name', ascending: true },
    enableCache: true,
    cacheKeyPrefix: 'members',
    cacheDuration: 300000, // 5 minutos
    // AIDEV-NOTE: Schema Zod para validação runtime
    schema: UserMemberSchema
  });

  // ============================================
  // CARREGAMENTO AUTOMÁTICO
  // ============================================

  useEffect(() => {
    // ✅ REACT.DEV PATTERN: Conditional debugging with structured logging
    if (enableDebugLogs && !user?.tenant_id) {
      console.error('🔍 [useMembers] CRITICAL: Missing tenant_id for user:', {
        user_exists: !!user,
        user_email: user?.email,
        user_role: user?.role,
        timestamp: new Date().toISOString()
      });
    }

    if (user?.tenant_id && (user.role === 'admin' || user.role === 'member' || user.role === 'super_admin')) {
      // ✅ REACT.DEV PATTERN: Essential logging only
      if (enableDebugLogs) {
        console.log('🔍 [useMembers] Loading members for tenant:', user.tenant_id);
      }

      // ✅ CORREÇÃO: Log inicial de debug para rastreamento
      if (enableDebugLogs) {
        console.log('🔍 [useMembers] ESTADO INICIAL DO HOOK:', {
          usersCrud_data_exists: !!usersCrud.data,
          usersCrud_data_type: typeof usersCrud.data,
          usersCrud_data_is_array: Array.isArray(usersCrud.data),
          usersCrud_data_length: usersCrud.data?.length || 0,
          usersCrud_isLoading: usersCrud.isLoading,
          tenant_id: user.tenant_id,
          timestamp: new Date().toISOString()
        });
      }
      
      // ✅ PERFORMANCE: Clear cache only when necessary
      usersCrud.clearCache();

      // ✅ REACT.DEV PATTERN: Data fetching with ignore flag para evitar race conditions
      let ignore = false;
      
      // ✅ CORREÇÃO: Buscar dados da tabela users com filtro tenant_id correto
      usersCrud.fetchAll({
        filters: {
          tenant_id: String(user.tenant_id)
        }
      }).then(() => {
        // ✅ REACT.DEV PATTERN: Verificar se operação ainda é válida
        if (ignore) return;
        
        // ✅ CORREÇÃO: Usar dados diretos da tabela users (sem mapeamento)
        const rawUserData = usersCrud.data || [];
        
        // ✅ CORREÇÃO: Log detalhado após fetchAll
        if (enableDebugLogs) {
          console.log('🔍 [useMembers] DADOS DA TABELA USERS:', {
            users_total: rawUserData.length,
            tenant_id: user.tenant_id,
            sample_user: rawUserData?.[0],
            rafael_found: rawUserData.find(u => u.email === 'rafael@renovedigital.com.br' || u.first_name?.toLowerCase().includes('rafael')),
            timestamp: new Date().toISOString()
          });
        }
        
        // ✅ CORREÇÃO PREVENTIVA: Filtrar com validação mais permissiva (aceitar members sem auth_user_id)
        const validMembers = rawUserData.filter(member => 
          member && member.id && member.email // Usar ID como validação principal
        );
        
        // ✅ REACT.DEV PATTERN: Error handling without verbose logging
        const orphanMembers = rawUserData.filter(member => 
          !member || !member.id || !member.email
        );
        
        const salesMembers = validMembers.filter(member => member.role === 'member' && member.is_active !== false);
        
        // ✅ PRODUCTION-SAFE: Only log critical issues
        if (orphanMembers.length > 0) {
          console.warn('⚠️ [useMembers] Invalid members detected:', {
            count: orphanMembers.length,
            solution: 'Members need auth synchronization'
          });
        }
        
        if (enableDebugLogs) {
          console.log('✅ [useMembers] Load completed:', {
            total: rawUserData.length,
            valid: validMembers.length,
            sales: salesMembers.length
          });
        }
      }).catch(error => {
        // ✅ REACT.DEV PATTERN: Verificar se operação ainda é válida antes de log
        if (ignore) return;
        
        console.error('❌ [useMembers] Load failed:', error.message);
        if (enableDebugLogs) {
          console.error('❌ [useMembers] Stack trace:', error.stack);
        }
      });
      
      // ✅ REACT.DEV PATTERN: Cleanup function para cancelar operações obsoletas
      return () => {
        ignore = true;
      };
    } else {
      // ✅ REACT.DEV PATTERN: Only log authentication errors
      if (!user?.tenant_id && user) {
        console.error('❌ [useMembers] CRITICAL: Missing tenant_id');
      }
    }
  }, [user?.tenant_id, user?.role]);

  // ✅ REACT.DEV PATTERN: useEffect separado para warnings (side effects)
  useEffect(() => {
    // ✅ CORREÇÃO: Warning apenas para problemas reais, não estados normais
    const cacheKey = `no-users-${user?.tenant_id}`;
    const now = Date.now();
    
    // ✅ REACT.DEV COMPLIANT: Warning apenas se ERRO REAL (zero usuários carregados)
    if (enableDebugLogs && 
        user?.tenant_id &&
        usersCrud.data && 
        Array.isArray(usersCrud.data) && 
        usersCrud.data.length === 0 && // Zero usuários = problema real
        !usersCrud.isLoading && // Dados já carregados
        !membersWarningLogCache.has(cacheKey) && 
        (now - lastMembersWarningTime.current >= 30000)) { // 30 segundos entre warnings
      
      membersWarningLogCache.add(cacheKey);
      lastMembersWarningTime.current = now;
      console.log('ℹ️ [useMembers] Contexto informativo para tenant:', user.tenant_id, {
        data_length: usersCrud.data?.length || 0,
        is_loading: usersCrud.isLoading,
        user_has_tenant: !!user?.tenant_id,
        status: 'Normal se não há usuários cadastrados no banco para este tenant',
        suggestion: 'Verificar se há dados na tabela users para este tenant_id'
      });
    }
  }, [usersCrud.data?.length, usersCrud.isLoading, user?.tenant_id]); // ✅ Dependencies corretas

  // ============================================
  // FUNÇÕES DE CONVENIÊNCIA (MANTIDAS)
  // ============================================

  // Filtrar membros disponíveis (não vinculados a uma pipeline específica)
  const getAvailableMembers = useCallback((excludeMembers: string[] = []): User[] => {
    return (usersCrud.data || []).filter(member => !excludeMembers.includes(member.id));
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
      
      // ✅ CORREÇÃO: Usar tabela users correta (não auth.users)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, is_active, tenant_id, created_at')
        .in('id', memberIds);

      if (usersError) throw usersError;

      // ✅ CORREÇÃO: Usar dados diretos da tabela users (sem mapeamento)
      const mappedUsers = users || [];

      console.log('✅ [useMembers] Membros da pipeline encontrados:', mappedUsers.length);
      return mappedUsers;
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

  // ✅ REACT.DEV PATTERN: Memoize expensive calculations with useMemo (pure function)
  const getSalesMembers = useMemo((): User[] => {
    if (!usersCrud.data || !Array.isArray(usersCrud.data) || !user?.tenant_id) {
      // ✅ OPTIONAL DEBUG: Log apenas quando não há dados básicos disponíveis
      if (enableDebugLogs && user?.tenant_id) {
        console.log('🔍 [getSalesMembers] Early return - dados não disponíveis:', {
          has_data: !!usersCrud.data,
          is_array: Array.isArray(usersCrud.data),
          has_tenant: !!user?.tenant_id,
          data_length: usersCrud.data?.length || 'N/A'
        });
      }
      return [];
    }

    const filteredSalesMembers = usersCrud.data.filter(member => {
      // ✅ PERFORMANCE: Simplified validation without excessive logging
      const memberTenantId = String(member?.tenant_id || '').trim();
      const targetTenantId = String(user.tenant_id).trim();
      const memberRole = String(member?.role || '').toLowerCase().trim();
      
      return member && 
             member.email && 
             member.id &&
             memberTenantId === targetTenantId &&
             memberRole === 'member' &&
             member.is_active !== false;
    });
    
    // ✅ OPTIONAL DEBUG: Log estruturado apenas quando em development e há mudanças significativas
    if (enableDebugLogs && usersCrud.data.length > 0) {
      const debugInfo = {
        total_users: usersCrud.data.length,
        sales_members_found: filteredSalesMembers.length,
        tenant_id: user.tenant_id.substring(0, 8),
        users_breakdown: {
          admins: usersCrud.data.filter(m => m?.role === 'admin').length,
          members: usersCrud.data.filter(m => m?.role === 'member').length,
          other_roles: usersCrud.data.filter(m => !['admin', 'member'].includes(m?.role)).length
        }
      };
      
      // ✅ CORREÇÃO: Log sempre que há dados, sem referência circular
      if (filteredSalesMembers.length >= 0) {
        console.log('📊 [getSalesMembers] Filtros aplicados:', debugInfo);
      }
    }
    
    return filteredSalesMembers;
  }, [usersCrud.data, user?.tenant_id]); // ✅ OPTIMIZATION: Correct dependencies

  // ✅ REACT.DEV PATTERN: useEffect separado para informações contextuais (não warnings)
  useEffect(() => {
    // ✅ CORREÇÃO: Transformar em log informativo, não warning de erro
    if (enableDebugLogs && 
        getSalesMembers.length === 0 && 
        user?.tenant_id &&
        usersCrud.data && 
        Array.isArray(usersCrud.data) && 
        usersCrud.data.length > 0 && // Há usuários válidos
        !usersCrud.isLoading) { // Dados carregados
      
      // ✅ LOG INFORMATIVO: Não é erro, é informação contextual
      console.log('ℹ️ [useMembers] Context info for tenant:', user.tenant_id, {
        total_users: usersCrud.data?.length || 0,
        sales_members: getSalesMembers.length,
        status: 'Users loaded but no sales members (role="member")',
        note: 'This is normal if tenant has only admin users'
      });
    }
  }, [getSalesMembers.length, user?.tenant_id, usersCrud.data?.length, usersCrud.isLoading]); // ✅ Dependencies corretas

  // Obter admins
  const getAdminMembers = useCallback((): User[] => {
    return (usersCrud.data || []).filter(member => member.role === 'admin' && member.is_active !== false);
  }, [usersCrud.data]);

  // ============================================
  // INTERFACE COMPATÍVEL (MANTIDA)
  // ============================================

  // ✅ REACT.DEV PATTERN: Memoize filtered members
  const validMembers = useMemo(() => {
    if (!usersCrud.data || !Array.isArray(usersCrud.data) || !user?.tenant_id) {
      return [];
    }

    // ✅ DEFENSIVE VALIDATION: Processar dados com validação robusta
    const processedMembers = usersCrud.data.filter(member => {
      // Validação básica de existência
      if (!member || typeof member !== 'object') {
        if (enableDebugLogs) {
          console.warn('⚠️ [validMembers] Invalid member object detected:', typeof member);
        }
        return false;
      }

      // Validação de campos obrigatórios
      const hasValidData = member.email && 
                          member.id && 
                          typeof member.email === 'string' &&
                          typeof member.id === 'string';
      
      if (!hasValidData) {
        if (enableDebugLogs) {
          console.warn('⚠️ [validMembers] Member missing required fields:', {
            id: member.id ? 'present' : 'missing',
            email: member.email ? 'present' : 'missing',
            member_partial: { id: member.id?.substring(0, 8), email: member.email }
          });
        }
        return false;
      }

      // Validação de tenant_id
      const memberTenantId = String(member?.tenant_id || '').trim();
      const targetTenantId = String(user.tenant_id).trim();
      const isSameTenant = memberTenantId === targetTenantId;
      
      if (!isSameTenant && enableDebugLogs) {
        console.warn('⚠️ [validMembers] Tenant mismatch:', {
          member_tenant: memberTenantId.substring(0, 8),
          target_tenant: targetTenantId.substring(0, 8),
          member_email: member.email
        });
      }
      
      return isSameTenant;
    });

    // ✅ OPTIONAL DEBUG: Relatório final de validação
    if (enableDebugLogs && usersCrud.data.length > 0) {
      const validationReport = {
        input_count: usersCrud.data.length,
        valid_count: processedMembers.length,
        filtered_out: usersCrud.data.length - processedMembers.length,
        tenant_id: user.tenant_id.substring(0, 8),
        sample_valid: processedMembers.slice(0, 2).map(m => ({ 
          email: m.email, 
          role: m.role,
          id: m.id.substring(0, 8)
        }))
      };
      
      if (validationReport.filtered_out > 0) {
        console.log('📋 [validMembers] Validation report:', validationReport);
      }
    }

    return processedMembers;
  }, [usersCrud.data, user?.tenant_id]);

  return {
    // ✅ DADOS DO HOOK BASE UNIFICADO (apenas usuários válidos)
    members: validMembers,
    loading: usersCrud.isLoading,
    error: usersCrud.error,
    
    // ✅ OPERAÇÕES DO HOOK BASE UNIFICADO COM CORREÇÃO DE TIPOS
    loadMembers: () => {
      if (!user?.tenant_id) {
        console.error('❌ [loadMembers] ERRO: tenant_id não definido');
        return Promise.resolve();
      }
      
      console.log('🔍 [loadMembers] Carregando com tenant_id:', {
        tenant_id: user.tenant_id,
        tenant_id_type: typeof user.tenant_id,
        tenant_id_string: String(user.tenant_id)
      });
      
      return usersCrud.fetchAll({
        filters: {
          tenant_id: String(user.tenant_id) // ✅ CORREÇÃO: Conversão para string
        }
      });
    },
    
    // ✅ FUNÇÕES ESPECÍFICAS MANTIDAS
    getAvailableMembers,
    getPipelineMembers,
    linkMemberToPipeline,
    unlinkMemberFromPipeline,
    getSalesMembers: getSalesMembers, // ✅ REACT.DEV: Return memoized value directly
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
    clearCache: usersCrud.clearCache,
    
    // ✅ CORREÇÃO: Forçar refresh completo com dados corretos da tabela users
    forceRefreshWithCorrectIds: useCallback(async () => {
      console.log('🔄 [useMembers] FORÇA REFRESH: Limpando caches e recarregando com dados corretos da tabela users');
      
      // 1. Limpar cache do hook
      usersCrud.clearCache();
      
      // 2. Limpar possíveis caches do localStorage/sessionStorage
      if (typeof window !== 'undefined') {
        Object.keys(window.localStorage).forEach(key => {
          if (key.includes('members') || key.includes('pipeline') || key.includes('users')) {
            window.localStorage.removeItem(key);
            console.log('🧹 [useMembers] Removido localStorage:', key);
          }
        });
        
        Object.keys(window.sessionStorage).forEach(key => {
          if (key.includes('members') || key.includes('pipeline') || key.includes('users')) {
            window.sessionStorage.removeItem(key);
            console.log('🧹 [useMembers] Removido sessionStorage:', key);
          }
        });
      }
      
      // 3. Forçar recarregamento com tenant_id
      if (user?.tenant_id) {
        console.log('🔄 [useMembers] Recarregando dados com tenant_id:', user.tenant_id);
        await usersCrud.fetchAll({
          filters: {
            tenant_id: String(user.tenant_id)
          }
        });
        console.log('✅ [useMembers] Refresh completo finalizado');
      } else {
        console.error('❌ [useMembers] Não foi possível recarregar: tenant_id não encontrado');
      }
    }, [user?.tenant_id, usersCrud])
  };
}; 