import { useState, useCallback, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Company, CompanyAdmin } from '../types/Company';
import AuthContext from '../contexts/AuthContext';

export const useCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  // 🔧 CORREÇÃO: Usar contexto de autenticação com verificação
  const authContext = useContext(AuthContext);
  const authenticatedFetch = authContext?.authenticatedFetch;
  const user = authContext?.user;
  
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

      let companiesData: any[] = [];
      let usedBackendAPI = false;

      // 🔧 TENTATIVA 1: Backend API com autenticação (se disponível)
      if (authenticatedFetch) {
        console.log('🚀 [useCompanies] Tentando Backend API...');
        try {
          const response = await authenticatedFetch('/companies');
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              companiesData = result.data;
              usedBackendAPI = true;
              console.log(`✅ [useCompanies] Backend API: ${companiesData.length} empresas encontradas`);
            } else {
              console.warn('⚠️ [useCompanies] Backend API retornou erro:', result.error);
            }
          } else {
            console.warn(`⚠️ [useCompanies] Backend API HTTP ${response.status}`);
          }
        } catch (backendError: any) {
          console.warn('⚠️ [useCompanies] Backend API falhou:', backendError.message);
        }
      }

      // 🔄 FALLBACK: Se Backend API falhou, usar Supabase direto
      if (!usedBackendAPI || companiesData.length === 0) {
        console.log('🔄 [useCompanies] Usando fallback Supabase...');
        try {
          const { data: supabaseData, error: supabaseError } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (supabaseError) {
            throw new Error(`Supabase error: ${supabaseError.message}`);
          }
          
          companiesData = supabaseData || [];
          console.log(`🔄 [useCompanies] Supabase Fallback: ${companiesData.length} empresas encontradas`);
        } catch (supabaseError: any) {
          console.error('❌ [useCompanies] Supabase fallback falhou:', supabaseError.message);
          throw supabaseError;
        }
      }

      // 🔧 Processar empresas buscando admin via queries separadas
      const companiesWithAdmin = await Promise.all(
        companiesData.map(async (company: any) => {
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
              let activationStatus: 'pending' | 'sent' | 'activated' | 'expired' = 'pending';
              let invitationToken: string | undefined = undefined;
              let invitationSentAt: string | undefined = undefined;
              
              // 1. Se usuário está ativo, considerar como ativado
              if (adminData.is_active) {
                activationStatus = 'activated';
              } else {
                // 2. Verificar convites na tabela admin_invitations
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
                    
                    if (invitationData.status === 'accepted') {
                      activationStatus = 'activated';
                    } else if (invitationData.status === 'expired') {
                      activationStatus = 'expired';
                    } else {
                      activationStatus = 'sent';
                    }
                  } else {
                    // 3. FALLBACK: Verificar no campo segment da empresa
                    if (company.segment && company.segment.includes('INVITATION:')) {
                      const segments = company.segment.split('|');
                      const invitationSegment = segments.find((s: string) => s.includes('INVITATION:'));
                      if (invitationSegment) {
                        const parts = invitationSegment.split(':');
                        if (parts.length >= 3) {
                          invitationToken = parts[1];
                          invitationSentAt = parts[2];
                          activationStatus = invitationSegment.includes('ACCEPTED') ? 'activated' : 'sent';
                        }
                      }
                    }
                  }
                } catch (invitationError) {
                  console.warn(`⚠️ Erro ao buscar convite para "${adminData.email}":`, invitationError);
                  // FALLBACK para segment se tabela admin_invitations falhar
                  if (company.segment && company.segment.includes('INVITATION:')) {
                    activationStatus = company.segment.includes('ACCEPTED') ? 'activated' : 'sent';
                  }
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
  }, [authenticatedFetch]);

  const toggleCompanyStatus = useCallback(async (company: Company) => {
    const novoStatus = !company.is_active;
    const acao = novoStatus ? 'ativar' : 'desativar';
    
    try {
      logger.info(`${acao.charAt(0).toUpperCase() + acao.slice(1)}ando empresa:`, company.name);

      const { error } = await supabase
        .from('companies')
        .update({
          is_active: novoStatus,
          segment: `${company.industry} | ${company.city}/${company.state} | Leads:${company.expected_leads_monthly} Vendas:${company.expected_sales_monthly} Seg:${company.expected_followers_monthly} | ATIVO:${novoStatus}`
        })
        .eq('id', company.id);

      if (error) {
        throw new Error(`Erro do banco de dados: ${error.message}`);
      }

      await fetchCompanies();
      logger.success(`Empresa "${company.name}" ${acao === 'ativar' ? 'ativada' : 'desativada'} com sucesso`);
      
      return { success: true, message: `✅ Empresa "${company.name}" foi ${acao === 'ativar' ? 'ativada' : 'desativada'} com sucesso!` };
      
    } catch (error) {
      logger.error(`Erro ao ${acao} empresa:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, message: `❌ Erro ao ${acao} empresa: ${errorMessage}` };
    }
  }, [fetchCompanies]);

  const deleteCompany = useCallback(async (company: Company) => {
    try {
      console.log(`🗑️ [useCompanies] Excluindo empresa: ${company.name}`);
      
      // 🔧 CORREÇÃO: Usar authenticatedFetch com fallback
      let response;
      if (authenticatedFetch) {
        response = await authenticatedFetch(`/companies/${company.id}`, {
          method: 'DELETE'
        });
      } else {
        // Fallback para desenvolvimento sem autenticação
        response = await fetch(`http://localhost:3001/api/companies/${company.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ [useCompanies] Empresa excluída com sucesso: ${company.name}`);
        await fetchCompanies(); // Atualizar dados
        alert(`✅ Empresa "${company.name}" excluída com sucesso!`);
      } else {
        console.error(`❌ [useCompanies] Erro ao excluir empresa:`, result.error);
        alert(`❌ Erro ao excluir empresa: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ [useCompanies] Erro de conexão:`, error);
      alert(`❌ Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, [fetchCompanies, authenticatedFetch]);

  const resendActivationEmail = useCallback(async (company: Company) => {
    if (!company.admin) {
      return { success: false, message: 'Admin não encontrado' };
    }

    try {
      console.log(`📧 [useCompanies] Reenviando email para: ${company.admin.email}`);
      
      // 🔧 CORREÇÃO 4: Usar authenticatedFetch com fallback
      let response;
      if (authenticatedFetch) {
        response = await authenticatedFetch('/admin-invitations/send', {
          method: 'POST',
          body: JSON.stringify({
            adminEmail: company.admin.email,
            adminName: company.admin.name,
            companyName: company.name,
            companyId: company.id
          })
        });
      } else {
        // Fallback para desenvolvimento sem autenticação
        response = await fetch('http://localhost:3001/api/admin-invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: company.admin.email,
          adminName: company.admin.name,
          companyName: company.name,
          companyId: company.id
        })
      });
      }

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

    window.addEventListener('admin-activated', handleAdminActivated as EventListener);
    
    return () => {
      window.removeEventListener('admin-activated', handleAdminActivated as EventListener);
    };
  }, [fetchCompanies]);

  const startPolling = useCallback(() => {
    if (isPolling) return;
    
    setIsPolling(true);
    const interval = setInterval(() => {
      console.log('🔄 [useCompanies] Polling - atualizando dados...');
      fetchCompanies();
    }, 30000);
    
    setTimeout(() => {
      clearInterval(interval);
      setIsPolling(false);
      console.log('⏹️ [useCompanies] Polling parado');
    }, 5 * 60 * 1000);
    
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
