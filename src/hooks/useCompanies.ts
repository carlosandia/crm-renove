import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Company, CompanyAdmin } from '../types/Company';
import { useAuth } from '../providers/AuthProvider';
import { showSuccessToast, showErrorToast } from './useToast';

export const useCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  // 🔧 CORREÇÃO: Usar padrão básico Supabase Authentication
  const { user } = useAuth();
  
  const formatDateBrasilia = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data inválida';
    }
  }, []);

  /**
   * 🔧 CORREÇÃO CRÍTICA: Busca de empresas corrigida para super_admin
   */
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 [useCompanies] Iniciando busca de empresas...');

      let companiesData: Company[] = [];

      // ✅ CORREÇÃO: Usar Supabase direto com autenticação básica
      console.log('🔄 [useCompanies] Usando Supabase...');
      try {
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (supabaseError) {
          throw new Error(`Supabase error: ${supabaseError.message}`);
        }
        
        companiesData = supabaseData || [];
        console.log(`✅ [useCompanies] Supabase: ${companiesData.length} empresas encontradas`);
      } catch (supabaseError: any) {
        console.error('❌ [useCompanies] Supabase falhou:', supabaseError.message);
        throw supabaseError;
      }

      // 🔧 Processar empresas buscando admin via queries separadas
      const companiesWithAdmin = await Promise.all(
        companiesData.map(async (company: Company) => {
          try {
            // Buscar admin da empresa via Supabase
            const { data: adminData, error: adminError } = await supabase
              .from('users')
              .select('id, first_name, last_name, email, created_at, is_active')
              .eq('role', 'admin')
              .eq('tenant_id', company.id)
              .maybeSingle();

            let admin: CompanyAdmin | undefined;
            
            if (!adminError && adminData) {
              // Determinar status de ativação
              let activationStatus: 'pending' | 'sent' | 'activated' | 'expired' | 'inactive' = 'pending';
              let invitationToken: string | undefined = undefined;
              let invitationSentAt: string | undefined = undefined;
              
              // 1. Se usuário está ativo, considerar como ativado
              if (adminData.is_active) {
                activationStatus = 'activated';
              } else {
                // 2. Se usuário está inativo, considerar como inativo (não pendente)
                activationStatus = 'inactive';
                
                // OPCIONAL: Verificar se existe convite pendente apenas para casos especiais
                try {
                  const { data: invitationData } = await supabase
                    .from('admin_invitations')
                    .select('invitation_token, sent_at, status, expires_at')
                    .eq('email', adminData.email)
                    .eq('company_id', company.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (invitationData) {
                    invitationToken = invitationData.invitation_token;
                    invitationSentAt = invitationData.sent_at;
                    
                    // Só alterar status se há convite pendente/enviado (casos especiais)
                    if (invitationData.status === 'expired') {
                      activationStatus = 'expired';
                    } else if (invitationData.status === 'pending' || invitationData.status === 'sent') {
                      activationStatus = 'pending';
                    }
                  }
                } catch (invitationError) {
                  console.warn(`⚠️ Erro ao buscar convite para "${adminData.email}":`, invitationError);
                  // Manter 'inactive' como padrão
                }
              }
              
              admin = {
                id: adminData.id,
                name: `${adminData.first_name} ${adminData.last_name}`.trim(),
                email: adminData.email,
                role: 'admin',
                tenant_id: company.id,
                is_active: adminData.is_active,
                created_at: adminData.created_at,
                activation_status: activationStatus,
                invitation_id: invitationToken,
                invitation_sent_at: invitationSentAt,
                invitation_expires_at: invitationSentAt && invitationSentAt !== 'null' && !isNaN(new Date(invitationSentAt).getTime()) ? 
                  new Date(new Date(invitationSentAt).getTime() + 48 * 60 * 60 * 1000).toISOString() : 
                  undefined,
                resend_count: 0
              };
            }

            return {
              ...company,
              admin
            } as Company;
          } catch (error) {
            console.error(`❌ Erro ao processar admin da empresa "${company.name}":`, error);
            return company as Company;
          }
        })
      );

      setCompanies(companiesWithAdmin);
      console.log(`🎉 [useCompanies] ${companiesWithAdmin.length} empresas processadas com sucesso`);

    } catch (error: any) {
      console.error('❌ [useCompanies] Erro ao carregar empresas:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleCompanyStatus = useCallback(async (company: Company) => {
    const novoStatus = !company.is_active;
    const acao = novoStatus ? 'ativar' : 'desativar';
    
    try {
      logger.info(`${acao.charAt(0).toUpperCase() + acao.slice(1)}ando empresa:`, company.name);

      if (!novoStatus) {
        // DESATIVAR: empresa + todos usuários
        console.log(`🔐 [toggleCompanyStatus] SEGURANÇA: Desativando empresa e todos usuários "${company.name}" (tenant_id: ${company.id})`);
        
        // Executar operações em paralelo para melhor performance
        const [companyResult, usersResult] = await Promise.all([
          // Desativar empresa
          supabase
            .from('companies')
            .update({
              is_active: false,
              segment: `${company.industry} | ${company.city}/${company.state} | Leads:${company.expected_leads_monthly} Vendas:${company.expected_sales_monthly} Seg:${company.expected_followers_monthly} | ATIVO:false`,
              updated_at: new Date().toISOString()
            })
            .eq('id', company.id),
          
          // Desativar todos usuários (admin e member) da empresa
          supabase
            .from('users')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('tenant_id', company.id)
            .neq('role', 'super_admin') // Nunca desativar super_admin
        ]);
        
        if (companyResult.error) {
          throw new Error(`Erro ao desativar empresa: ${companyResult.error.message}`);
        }
        
        if (usersResult.error) {
          throw new Error(`Erro ao desativar usuários: ${usersResult.error.message}`);
        }
        
        console.log(`✅ [toggleCompanyStatus] Empresa desativada e ${usersResult.count || 0} usuários desativados com sucesso`);
        
      } else {
        // ATIVAR: empresa + usuários + convites
        console.log(`🚀 [toggleCompanyStatus] ATIVAÇÃO AUTOMÁTICA: Ativando empresa e todos usuários "${company.name}" (tenant_id: ${company.id})`);
        
        // Executar operações em paralelo para melhor performance
        const [companyResult, usersResult, invitationsResult] = await Promise.all([
          // Ativar empresa
          supabase
            .from('companies')
            .update({
              is_active: true,
              segment: `${company.industry} | ${company.city}/${company.state} | Leads:${company.expected_leads_monthly} Vendas:${company.expected_sales_monthly} Seg:${company.expected_followers_monthly} | ATIVO:true`,
              updated_at: new Date().toISOString()
            })
            .eq('id', company.id),
          
          // Ativar todos usuários admin/member da empresa
          supabase
            .from('users')
            .update({ 
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('tenant_id', company.id)
            .neq('role', 'super_admin'), // super_admin já está sempre ativo
          
          // Marcar convites como aceitos/ativados
          supabase
            .from('admin_invitations')
            .update({ 
              status: 'accepted',
              accepted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('company_id', company.id)
            .in('status', ['pending', 'sent', 'expired']) // Apenas convites não aceitos
        ]);
        
        if (companyResult.error) {
          throw new Error(`Erro ao ativar empresa: ${companyResult.error.message}`);
        }
        
        if (usersResult.error) {
          throw new Error(`Erro ao ativar usuários: ${usersResult.error.message}`);
        }
        
        // Erro em convites não é crítico (pode não existir)
        if (invitationsResult.error) {
          console.warn(`⚠️ [toggleCompanyStatus] Aviso ao atualizar convites: ${invitationsResult.error.message}`);
        }
        
        console.log(`✅ [toggleCompanyStatus] Empresa ativada, ${usersResult.count || 0} usuários ativados e ${invitationsResult.count || 0} convites marcados como aceitos`);
      }

      await fetchCompanies();
      
      const statusMessage = !novoStatus 
        ? `✅ Empresa "${company.name}" foi desativada e todos usuários perderam acesso!`
        : `✅ Empresa "${company.name}" foi ativada e todos usuários foram automaticamente ativados!`;
      
      logger.success(`Empresa "${company.name}" ${acao === 'ativar' ? 'ativada' : 'desativada'} com sucesso`);
      
      return { success: true, message: statusMessage };
      
    } catch (error) {
      logger.error(`Erro ao ${acao} empresa:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, message: `❌ Erro ao ${acao} empresa: ${errorMessage}` };
    }
  }, [fetchCompanies]);

  const deleteCompany = useCallback(async (company: Company) => {
    try {
      console.log(`🗑️ [useCompanies] Excluindo empresa: ${company.name}`);
      
      // ✅ CORREÇÃO: Usar Supabase diretamente
      const { error } = await supabase
        .from('companies')
        .update({ is_active: false })
        .eq('id', company.id);
      
      if (!error) {
        console.log(`✅ [useCompanies] Empresa excluída com sucesso: ${company.name}`);
        await fetchCompanies(); // Atualizar dados
        showSuccessToast('Empresa excluída', `Empresa "${company.name}" excluída com sucesso!`);
      } else {
        console.error(`❌ [useCompanies] Erro ao excluir empresa:`, error);
        showErrorToast('Erro ao excluir', `Erro ao excluir empresa: ${error.message}`);
      }
    } catch (error) {
      console.error(`❌ [useCompanies] Erro de conexão:`, error);
      showErrorToast('Erro de conexão', `${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, [fetchCompanies]);

  const resendActivationEmail = useCallback(async (company: Company) => {
    if (!company.admin) {
      return { success: false, message: 'Admin não encontrado' };
    }

    try {
      console.log(`📧 [useCompanies] Reenviando email para: ${company.admin.email}`);
      
      // ✅ MIGRADO: Usar autenticação básica Supabase
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      // Verificar se é super_admin
      const userRole = currentUser.user_metadata?.role;
      if (userRole !== 'super_admin') {
        return { success: false, message: 'Acesso negado: apenas super_admin pode reenviar convites' };
      }
      
      // ✅ BÁSICO: Obter token do usuário autenticado  
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, message: 'Token de autenticação não disponível' };
      }
      
      // Fazer requisição usando URL relativa (proxy Vite)
      const response = await fetch('/api/admin-invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          adminEmail: company.admin.email,
          adminName: company.admin.name,
          companyName: company.name,
          companyId: company.id
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ [useCompanies] Email reenviado com sucesso:`, result.messageId);
        await fetchCompanies(); // Atualizar dados
        return { 
          success: true, 
          message: `✅ Email de ativação reenviado para ${company.admin.email}` 
        };
      } else {
        console.error(`❌ [useCompanies] Erro ao reenviar email:`, result.error);
        return { 
          success: false, 
          message: `❌ Erro ao reenviar email: ${result.error}` 
        };
      }
    } catch (error) {
      console.error(`❌ [useCompanies] Erro de conexão:`, error);
      return { 
        success: false, 
        message: `❌ Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      };
    }
  }, [fetchCompanies]);

  useEffect(() => {
    fetchCompanies();
    
    // Listener para refresh automático após ativação
    const handleAdminActivated = (event: CustomEvent) => {
      console.log('🔄 [useCompanies] Admin ativado detectado, atualizando lista:', event.detail);
      setTimeout(() => {
        fetchCompanies();
      }, 1000);
    };

    // ✅ OTIMIZAÇÃO: Listener único e simplificado para criação de empresa
    const handleCompanyCreated = (event: CustomEvent) => {
      console.log('🔄 [useCompanies] Empresa criada detectada:', event.detail);
      console.log('📋 [useCompanies] Executando refresh da lista...');
      
      // ✅ OTIMIZAÇÃO: Refresh simples sem force clear
      fetchCompanies().then(() => {
        console.log('✅ [useCompanies] Lista atualizada com sucesso');
      }).catch(error => {
        console.error('❌ [useCompanies] Erro na atualização:', error);
      });
    };

    window.addEventListener('admin-activated', handleAdminActivated as EventListener);
    window.addEventListener('company-created', handleCompanyCreated as EventListener);
    
    return () => {
      window.removeEventListener('admin-activated', handleAdminActivated as EventListener);
      window.removeEventListener('company-created', handleCompanyCreated as EventListener);
    };
  }, [fetchCompanies]);

  const startPolling = useCallback(() => {
    if (isPolling) return;
    
    setIsPolling(true);
    const interval = setInterval(() => {
      console.log('🔄 [useCompanies] Polling - atualizando dados...');
      fetchCompanies();
    }, 45000); // ✅ OTIMIZADO: Intervalo aumentado para 45s (melhor performance)
    
    setTimeout(() => {
      clearInterval(interval);
      setIsPolling(false);
      console.log('⏹️ [useCompanies] Polling parado');
    }, 3 * 60 * 1000); // ✅ OTIMIZADO: Polling reduzido para 3min (economia de recursos)
    
    return () => clearInterval(interval);
  }, [fetchCompanies, isPolling]);

  return {
    companies,
    loading,
    error,
    fetchCompanies,
    toggleCompanyStatus,
    deleteCompany,
    resendActivationEmail,
    refetch: fetchCompanies,
    startPolling
  };
}; 
