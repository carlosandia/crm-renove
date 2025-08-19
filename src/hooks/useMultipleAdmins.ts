import { useState, useCallback, useEffect } from 'react';
import { CompanyAdmin, AdminFormData, MultipleAdminsState, AdminOperations } from '../types/Company';
import { supabase } from '../lib/supabase';
import { showSuccessToast, showErrorToast } from './useToast';
import { api } from '../services/api';

interface UseMultipleAdminsProps {
  companyId: string;
  initialAdmins?: CompanyAdmin[];
  onRefetch?: () => void;
}

export const useMultipleAdmins = ({ 
  companyId, 
  initialAdmins = [], 
  onRefetch 
}: UseMultipleAdminsProps): MultipleAdminsState & AdminOperations => {
  // Estado principal
  const [state, setState] = useState<MultipleAdminsState>({
    admins: initialAdmins,
    isLoading: false,
    isAdding: false,
    editingAdminId: null,
    showAddForm: false
  });

  // AIDEV-NOTE: Carregar administradores da empresa via Supabase
  const fetchAdmins = useCallback(async () => {
    if (!companyId) return;

    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', companyId)
        .eq('role', 'admin');
        // AIDEV-NOTE: Removido filtro is_active para mostrar admins inativos também

      if (error) {
        console.error('❌ [useMultipleAdmins] Erro ao buscar admins:', error);
        showErrorToast('Erro', 'Falha ao carregar administradores');
        return;
      }

      // Converter para formato CompanyAdmin
      const admins: CompanyAdmin[] = (users || []).map(user => ({
        id: user.id,
        name: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}`.trim()
          : user.first_name || user.last_name || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        is_active: user.is_active,
        created_at: user.created_at,
        activation_status: user.is_active ? 'activated' : 'inactive' // AIDEV-NOTE: Status baseado no is_active do banco
      }));

      setState(prev => ({ ...prev, admins, isLoading: false }));
    } catch (error: any) {
      console.error('❌ [useMultipleAdmins] Exception ao buscar admins:', error);
      showErrorToast('Erro', `Falha ao carregar administradores: ${error.message}`);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [companyId]);

  // Carregar administradores na inicialização
  useEffect(() => {
    if (companyId && initialAdmins.length === 0) {
      fetchAdmins();
    }
  }, [companyId, fetchAdmins, initialAdmins.length]);

  // AIDEV-NOTE: Adicionar novo administrador
  const addAdmin = useCallback(async (adminData: AdminFormData): Promise<boolean> => {
    if (!companyId) {
      showErrorToast('Erro', 'ID da empresa não encontrado');
      return false;
    }

    setState(prev => ({ ...prev, isAdding: true }));

    try {
      // Validações
      if (!adminData.name || !adminData.email) {
        showErrorToast('Erro', 'Nome e email são obrigatórios');
        setState(prev => ({ ...prev, isAdding: false }));
        return false;
      }

      // Validar senha obrigatória para novos admins
      if (!adminData.password) {
        showErrorToast('Erro', 'Senha é obrigatória para novos administradores');
        setState(prev => ({ ...prev, isAdding: false }));
        return false;
      }

      // Verificar se email já existe na tabela users
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', adminData.email);

      if (checkError) {
        console.error('❌ [useMultipleAdmins] Erro ao verificar email:', checkError);
        showErrorToast('Erro', 'Falha ao verificar disponibilidade do email');
        setState(prev => ({ ...prev, isAdding: false }));
        return false;
      }

      // Verificar se encontrou algum usuário com este email
      if (existingUsers && existingUsers.length > 0) {
        showErrorToast('Erro', 'Email já está em uso por outro usuário');
        setState(prev => ({ ...prev, isAdding: false }));
        return false;
      }

      // Separar nome completo
      const fullName = adminData.name.trim();
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      console.log('🚀 [useMultipleAdmins] Criando admin via API backend (service role)');

      // ✅ CORREÇÃO: Usar API backend com service role ao invés de frontend
      const response = await api.createAdmin({
        email: adminData.email,
        password: adminData.password,
        first_name: firstName,
        last_name: lastName,
        tenant_id: companyId,
        role: 'admin'
      });

      // ✅ CORREÇÃO: Fallback para ambas estruturas - response.data ou response.user
      const userData = (response as any).user || response.data;
      
      if (!response.success || !userData) {
        console.error('❌ [useMultipleAdmins] Erro na API backend:', response);
        showErrorToast('Erro', response.message || 'Falha ao criar administrador via API backend');
        setState(prev => ({ ...prev, isAdding: false }));
        return false;
      }

      const newUser = userData;
      console.log('✅ [useMultipleAdmins] Admin criado via API backend:', newUser.id?.substring(0, 8));

      // Adicionar ao estado local
      const newAdmin: CompanyAdmin = {
        id: newUser.id,
        name: fullName,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        role: newUser.role,
        tenant_id: newUser.tenant_id,
        is_active: newUser.is_active,
        created_at: newUser.created_at,
        activation_status: 'activated'
      };

      setState(prev => ({
        ...prev,
        admins: [...prev.admins, newAdmin],
        isAdding: false
        // AIDEV-NOTE: Mantém showAddForm: true para permitir adições consecutivas
      }));

      showSuccessToast('Sucesso', `Administrador ${fullName} adicionado com sucesso!`);
      
      // Recarregar dados se necessário
      if (onRefetch) {
        onRefetch();
      }

      return true;
    } catch (error: any) {
      console.error('❌ [useMultipleAdmins] Exception ao adicionar admin:', error);
      showErrorToast('Erro', `Falha ao adicionar administrador: ${error.message}`);
      setState(prev => ({ ...prev, isAdding: false }));
      return false;
    }
  }, [companyId, onRefetch]);

  // AIDEV-NOTE: Remover administrador com validações
  const removeAdmin = useCallback(async (adminId: string): Promise<boolean> => {
    // Validação: não permitir remoção se é o único admin
    if (state.admins.length <= 1) {
      showErrorToast('Erro', 'A empresa deve ter pelo menos um administrador ativo');
      return false;
    }

    try {
      // AIDEV-NOTE: Remoção real do banco (DELETE) ao invés de soft delete
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', adminId)
        .eq('tenant_id', companyId);

      if (error) {
        console.error('❌ [useMultipleAdmins] Erro ao remover admin:', error);
        showErrorToast('Erro', `Falha ao remover administrador: ${error.message}`);
        return false;
      }

      // Remover do estado local
      setState(prev => ({
        ...prev,
        admins: prev.admins.filter(admin => admin.id !== adminId)
      }));

      showSuccessToast('Sucesso', 'Administrador removido com sucesso!');
      
      if (onRefetch) {
        onRefetch();
      }

      return true;
    } catch (error: any) {
      console.error('❌ [useMultipleAdmins] Exception ao remover admin:', error);
      showErrorToast('Erro', `Falha ao remover administrador: ${error.message}`);
      return false;
    }
  }, [companyId, state.admins.length, onRefetch]);

  // AIDEV-NOTE: Atualizar informações do administrador
  const updateAdmin = useCallback(async (adminId: string, adminData: AdminFormData): Promise<boolean> => {
    try {
      // Validações
      if (!adminData.name || !adminData.email) {
        showErrorToast('Erro', 'Nome e email são obrigatórios');
        return false;
      }

      // Separar nome completo
      const fullName = adminData.name.trim();
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: adminData.email
        })
        .eq('id', adminId)
        .eq('tenant_id', companyId)
        .select()
        .single();

      if (error || !updatedUser) {
        console.error('❌ [useMultipleAdmins] Erro ao atualizar admin:', error);
        showErrorToast('Erro', `Falha ao atualizar administrador: ${error?.message || 'Erro desconhecido'}`);
        return false;
      }

      // Atualizar estado local
      setState(prev => ({
        ...prev,
        admins: prev.admins.map(admin => 
          admin.id === adminId 
            ? {
                ...admin,
                name: fullName,
                first_name: firstName,
                last_name: lastName,
                email: updatedUser.email
              }
            : admin
        ),
        editingAdminId: null
      }));

      showSuccessToast('Sucesso', 'Informações do administrador atualizadas!');
      
      if (onRefetch) {
        onRefetch();
      }

      return true;
    } catch (error: any) {
      console.error('❌ [useMultipleAdmins] Exception ao atualizar admin:', error);
      showErrorToast('Erro', `Falha ao atualizar administrador: ${error.message}`);
      return false;
    }
  }, [companyId, onRefetch]);

  // Funções de controle de UI
  const toggleAddForm = useCallback(() => {
    setState(prev => ({ ...prev, showAddForm: !prev.showAddForm }));
  }, []);

  const startEditingAdmin = useCallback((adminId: string) => {
    setState(prev => ({ ...prev, editingAdminId: adminId }));
  }, []);

  const stopEditingAdmin = useCallback(() => {
    setState(prev => ({ ...prev, editingAdminId: null }));
  }, []);

  return {
    // Estado
    ...state,
    // Operações
    addAdmin,
    removeAdmin,
    updateAdmin,
    toggleAddForm,
    startEditingAdmin,
    stopEditingAdmin
  };
};