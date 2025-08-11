import { useState, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { showSuccessToast, showErrorToast } from '../lib/toast';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';

interface MemberData {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  tenant_id?: string;
}

interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
  auth_user_id: string | null;
  role: 'member';
  tenant_id: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export const useMembersAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  /**
   * ENTERPRISE PATTERN: Criar member via Backend API
   * Segue o mesmo padrão de criação de empresa + admin
   */
  const createMember = useCallback(async (memberData: MemberData): Promise<{ success: boolean; member?: Member; error?: string }> => {
    console.log('🚀 [ENTERPRISE-MEMBER] Criando member via Backend API...');
    setIsLoading(true);

    try {
      // Validações básicas
      if (!memberData.first_name || !memberData.last_name || !memberData.email) {
        throw new Error('Campos obrigatórios não preenchidos');
      }

      if (!user?.tenant_id) {
        throw new Error('Usuário sem tenant_id definido');
      }

      // Preparar dados para a API
      const apiData = {
        first_name: memberData.first_name.trim(),
        last_name: memberData.last_name.trim(),
        email: memberData.email.toLowerCase().trim(),
        password: memberData.password || '123456'
        // tenant_id será obtido automaticamente do usuário autenticado
      };

      console.log('📊 [ENTERPRISE-MEMBER] Dados preparados:', {
        email: apiData.email,
        hasCustomPassword: !!memberData.password
      });

      // ✅ Fazer requisição autenticada usando Supabase tokens
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<{ member: Member; company: any; credentials: any }> = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Falha na criação do member');
      }

      console.log('✅ [ENTERPRISE-MEMBER] Member criado com sucesso:', result.data.member.email);

      // Mostrar mensagem de sucesso
      showSuccessToast(
        'Member criado com sucesso!',
        `${result.data.member.first_name} ${result.data.member.last_name} foi adicionado à equipe. Senha: ${result.data.credentials.password}`
      );

      return { 
        success: true, 
        member: result.data.member 
      };

    } catch (error: any) {
      console.error('❌ [ENTERPRISE-MEMBER] Erro na criação:', error);
      logger.error('Erro ao criar member via API:', error);
      
      showErrorToast(
        'Erro ao criar member',
        error.message || 'Erro desconhecido'
      );

      return { 
        success: false, 
        error: error.message 
      };

    } finally {
      setIsLoading(false);
    }
  }, [user?.tenant_id]);

  /**
   * Listar members da empresa
   */
  const fetchMembers = useCallback(async (): Promise<{ success: boolean; members?: Member[]; error?: string }> => {
    console.log('📋 [ENTERPRISE-MEMBER] Buscando members via Backend API...');
    setIsLoading(true);

    try {
      // ✅ Fazer requisição autenticada usando Supabase tokens
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<Member[]> = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Falha ao buscar members');
      }

      console.log('✅ [ENTERPRISE-MEMBER] Members carregados:', result.data.length);

      return { 
        success: true, 
        members: result.data 
      };

    } catch (error: any) {
      console.error('❌ [ENTERPRISE-MEMBER] Erro ao buscar members:', error);
      logger.error('Erro ao buscar members via API:', error);

      return { 
        success: false, 
        error: error.message 
      };

    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Atualizar member
   */
  const updateMember = useCallback(async (memberId: string, updates: Partial<MemberData>): Promise<{ success: boolean; member?: Member; error?: string }> => {
    console.log('🔄 [ENTERPRISE-MEMBER] Atualizando member via Backend API...');
    setIsLoading(true);

    try {
      // ✅ Fazer requisição autenticada usando Supabase tokens
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<Member> = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Falha ao atualizar member');
      }

      console.log('✅ [ENTERPRISE-MEMBER] Member atualizado:', result.data.email);

      showSuccessToast(
        'Member atualizado',
        `${result.data.first_name} ${result.data.last_name} foi atualizado com sucesso`
      );

      return { 
        success: true, 
        member: result.data 
      };

    } catch (error: any) {
      console.error('❌ [ENTERPRISE-MEMBER] Erro ao atualizar member:', error);
      logger.error('Erro ao atualizar member via API:', error);
      
      showErrorToast(
        'Erro ao atualizar member',
        error.message || 'Erro desconhecido'
      );

      return { 
        success: false, 
        error: error.message 
      };

    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remover member
   */
  const deleteMember = useCallback(async (memberId: string): Promise<{ success: boolean; error?: string }> => {
    console.log('🗑️ [ENTERPRISE-MEMBER] Removendo member via Backend API...');
    setIsLoading(true);

    try {
      // ✅ Fazer requisição autenticada usando Supabase tokens
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<null> = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Falha ao remover member');
      }

      console.log('✅ [ENTERPRISE-MEMBER] Member removido com sucesso');

      showSuccessToast(
        'Member removido',
        'Member foi removido da equipe com sucesso'
      );

      return { success: true };

    } catch (error: any) {
      console.error('❌ [ENTERPRISE-MEMBER] Erro ao remover member:', error);
      logger.error('Erro ao remover member via API:', error);
      
      showErrorToast(
        'Erro ao remover member',
        error.message || 'Erro desconhecido'
      );

      return { 
        success: false, 
        error: error.message 
      };

    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verificar disponibilidade de email
   */
  const checkEmailAvailability = useCallback(async (email: string): Promise<{ available: boolean; message: string }> => {
    try {
      // Para verificação rápida, vamos usar a listagem
      const membersResult = await fetchMembers();
      
      if (membersResult.success && membersResult.members) {
        const emailExists = membersResult.members.some(m => m.email.toLowerCase() === email.toLowerCase());
        
        if (emailExists) {
          return { available: false, message: 'Este email já está em uso por outro member' };
        }
      }

      return { available: true, message: 'Email disponível' };

    } catch (error: any) {
      logger.error('Erro na verificação de email:', error);
      return { available: true, message: 'Verificação com erro - email disponível' };
    }
  }, [fetchMembers]);

  return {
    createMember,
    fetchMembers,
    updateMember,
    deleteMember,
    checkEmailAvailability,
    isLoading
  };
}; 