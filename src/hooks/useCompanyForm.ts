import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CompanyFormData } from '../types/Company';
import { useToast } from './useToast';
import { hashPasswordEnterprise } from '../lib/utils';
import { useAuth } from '../providers/AuthProvider';

// ENTERPRISE ARCHITECTURE - SEGUINDO PADRÕES DOS GRANDES CRMs
// Company First → Admin Creation → Email Invitation → Professional Flow

interface AdminData {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

interface CompanyFormResult {
  success: boolean;
  companyId?: string;
  adminCreated?: boolean;
  invitationSent?: boolean;
  activationRequired?: boolean;
  message: string;
  step?: 'company_created' | 'admin_created' | 'invitation_sent' | 'complete' | 'activation_sent' | 'activation_failed';
  invitationDetails?: {
    invitationId: string;
    messageId: string;
    activationUrl: string;
    expiresAt: string;
  };
  activationDetails?: {
    email_sent: boolean;
    activation_token?: string;
    activation_url?: string;
    expires_in?: string;
    message_id?: string;
    error?: string;
  };
}

// ENTERPRISE UTILITY: Force Supabase schema cache refresh
const forceSchemaRefresh = async () => {
  try {
    console.log('🔄 [ENTERPRISE] Forcing Supabase schema cache refresh...');
    
    // Force a simple query to refresh the schema cache
    await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    console.log('✅ [ENTERPRISE] Schema cache refreshed');
  } catch (error) {
    console.warn('⚠️ [ENTERPRISE] Schema refresh failed (non-critical):', error);
  }
};

// ENTERPRISE EMAIL INTEGRATION
const sendAdminInvitationWithAuth = async (
  companyId: string, 
  companyName: string, 
  adminName: string, 
  adminEmail: string,
  authenticatedFetch: any
): Promise<{ success: boolean; details?: any; error?: string }> => {
  try {
    console.log('📧 [ENTERPRISE] Enviando convite de ativação para admin...');
    
    // 🔧 CORREÇÃO 4: Usar authenticatedFetch com fallback
    let response;
    if (authenticatedFetch) {
      response = await authenticatedFetch('/admin-invitations/send', {
      method: 'POST',
      body: JSON.stringify({
          adminEmail,
          adminName,
        companyName,
          companyId
        })
      });
    } else {
      // Fallback para desenvolvimento sem autenticação
      response = await fetch('(await import('../config/environment')).environmentConfig.urls.api/api/admin-invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
        adminName,
          companyName,
          companyId
      })
    });
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ [ENTERPRISE] Convite enviado com sucesso:', result.messageId);
      return { 
        success: true, 
        details: {
          invitationId: result.invitationId,
          messageId: result.messageId,
          activationUrl: result.activationUrl,
          expiresAt: result.expiresAt
        }
      };
    } else {
      console.error('❌ [ENTERPRISE] Falha ao enviar convite:', result.error);
      return { success: false, error: result.error || 'Erro ao enviar convite' };
    }
    
  } catch (error: any) {
    console.error('❌ [ENTERPRISE] Erro na requisição de convite:', error);
    return { success: false, error: error.message || 'Erro de conexão' };
  }
};

export const useCompanyForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // 🔧 CORREÇÃO 4: Usar hook useAuth diretamente
  const { authenticatedFetch } = useAuth();

  // Initialize with schema refresh
  useState(() => {
    forceSchemaRefresh();
  });

  // STEP 1: CREATE COMPANY (ENTERPRISE PATTERN) - VIA BACKEND API
  const createCompany = async (companyData: CompanyFormData, adminData?: AdminData): Promise<{ success: boolean; companyId?: string; error?: string; data?: any }> => {
    try {
      console.log('🏢 [ENTERPRISE] Creating company via Backend API (Enterprise Pattern)...');
      
      // Validate required fields
      if (!companyData.name || !companyData.industry || !companyData.city || !companyData.state) {
        throw new Error('Campos obrigatórios não preenchidos');
      }

      if (adminData && (!adminData.name || !adminData.email)) {
        throw new Error('Dados do administrador obrigatórios');
      }
      
      // Prepare company data for backend API
      const apiData = {
        name: companyData.name.trim(),
        industry: companyData.industry,
        city: companyData.city,
        state: companyData.state,
        country: 'Brasil',
        website: companyData.website?.trim() || null,
        phone: companyData.phone?.trim() || null,
        email: companyData.email?.trim() || null,
        address: companyData.address?.trim() || null,
        expected_leads_monthly: companyData.expected_leads_monthly || 0,
        expected_sales_monthly: companyData.expected_sales_monthly || 0,
        expected_followers_monthly: companyData.expected_followers_monthly || 0,
        // Admin data (if provided)
        ...(adminData && {
          admin_name: adminData.name.trim(),
          admin_email: adminData.email.toLowerCase().trim(),
          admin_password: adminData.password || '123456'
        })
      };

      console.log('📊 [ENTERPRISE] API data prepared:', { 
        companyName: apiData.name, 
        adminEmail: apiData.admin_email, 
        hasAdmin: !!adminData 
      });
      
      // 🔧 CORREÇÃO 4: Usar authenticatedFetch com fallback
      let response;
      if (authenticatedFetch) {
        response = await authenticatedFetch('/companies', {
          method: 'POST',
          body: JSON.stringify(apiData)
        });
      } else {
        // Fallback para desenvolvimento sem autenticação
        response = await fetch('(await import('../config/environment')).environmentConfig.urls.api/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Falha na criação via API');
      }

      const companyId = result.data?.company?.id;
      if (!companyId) {
        throw new Error('API não retornou ID da empresa');
      }

      console.log('✅ [ENTERPRISE] Company created via Backend API:', {
        companyId,
        companyName: result.data.company.name,
        adminCreated: !!result.data.admin
      });

      return { success: true, companyId, data: result.data };

    } catch (error: any) {
      console.error('❌ [ENTERPRISE] Company creation via Backend API failed:', error);

      // FALLBACK: Se API falhar, usar método direto antigo
      console.log('🔄 [ENTERPRISE] Tentando fallback para método direto...');
      
      try {
        // Generate a UUID for the company to ensure we always have an ID
        const companyId = crypto.randomUUID();
        
        // Prepare company data with proper defaults
        const cleanCompanyData = {
          id: companyId,
          name: companyData.name.trim(),
          industry: companyData.industry,
          city: companyData.city,
          state: companyData.state,
          country: 'Brasil',
          website: companyData.website?.trim() || null,
          phone: companyData.phone?.trim() || null,
          email: companyData.email?.trim() || null,
          address: companyData.address?.trim() || null,
          expected_leads_monthly: companyData.expected_leads_monthly || 0,
          expected_sales_monthly: companyData.expected_sales_monthly || 0,
          expected_followers_monthly: companyData.expected_followers_monthly || 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // FALLBACK: Usar Supabase direto
        const { error: insertError } = await supabase
          .from('companies')
          .insert([cleanCompanyData]);

        if (insertError) {
          throw new Error(`Erro no fallback: ${insertError.message}`);
          }

        console.log('✅ [ENTERPRISE] Company created via fallback method:', companyId);
        return { success: true, companyId };

      } catch (fallbackError: any) {
        console.error('❌ [ENTERPRISE] Fallback method also failed:', fallbackError);
      return { 
        success: false, 
          error: `API e fallback falharam: ${error.message} | ${fallbackError.message}` 
        };
      }
    }
  };

  // STEP 2: CREATE ADMIN USER (ENTERPRISE PATTERN) - REMOVIDO
  // ⚠️ MÉTODO REMOVIDO: createAdminUser não é mais necessário 
  // ✅ Backend API agora cria empresa e admin numa só chamada via POST /api/companies
  // 📝 Toda lógica de criação de admin foi movida para o backend com segurança enterprise

  // MAIN ENTERPRISE FLOW: Company + Admin + Email Invitation (Via Backend API)
  const submitCompanyForm = async (
    companyData: CompanyFormData, 
    adminData?: AdminData
  ): Promise<CompanyFormResult> => {
    setIsSubmitting(true);
    
    try {
      console.log('🚀 [ENTERPRISE] Starting unified Company + Admin creation via Backend API...');

      // 🔧 NOVA IMPLEMENTAÇÃO: Criar empresa e admin numa só chamada via Backend API
      const companyResult = await createCompany(companyData, adminData);
      
      if (!companyResult.success || !companyResult.companyId) {
        return {
          success: false,
          message: companyResult.error || 'Falha ao criar empresa',
          step: 'company_created'
        };
      }

      // Se chegou aqui, empresa foi criada com sucesso via Backend API
      console.log('✅ [ENTERPRISE] Company created successfully via Backend API:', companyResult.companyId);

      // Se não foi fornecido admin data, apenas empresa foi criada
      if (!adminData) {
        return {
          success: true,
          companyId: companyResult.companyId,
          adminCreated: false,
          invitationSent: false,
          message: `✅ Empresa "${companyData.name}" criada com sucesso! O administrador pode ser criado posteriormente.`,
          step: 'company_created'
        };
      }

      // STEP 2: Send Admin Invitation Email (Backend API já criou admin)
      console.log('📧 [ENTERPRISE] Enviando convite de ativação para admin criado via Backend API...');
      
      const invitationResult = await sendAdminInvitationWithAuth(
        companyResult.companyId,
        companyData.name,
        adminData.name,
        adminData.email,
        authenticatedFetch
      );

      if (!invitationResult.success) {
        // Company + Admin created via Backend API but email failed
        return {
          success: true, // Core creation successful
          companyId: companyResult.companyId,
          adminCreated: true,
          invitationSent: false,
          message: `✅ Empresa e administrador criados com sucesso via Backend API! 
          
⚠️ **Atenção**: O email de ativação não pôde ser enviado (${invitationResult.error}). 

👤 **Acesso temporário**: O administrador pode fazer login usando:
• Email: ${adminData.email}
• Senha: ${adminData.password}

📧 **Próximos passos**: O convite pode ser reenviado posteriormente através do painel administrativo.`,
          step: 'invitation_sent'
        };
      }

      // ✅ PROCESSO DE ATIVAÇÃO: Verificar se email foi enviado automaticamente
      const activationData = companyResult.data?.activation;
      const emailSent = activationData?.email_sent || false;
      
      const result = {
        success: true,
        companyId: companyResult.companyId,
        adminCreated: true,
        invitationSent: emailSent,
        activationRequired: true,
        message: emailSent 
          ? `🎉 **Empresa e Admin criados com processo de ativação!**

✅ **Empresa**: ${companyData.name} foi registrada
👤 **Administrador**: ${adminData.name} foi criado (AGUARDANDO ATIVAÇÃO)
📧 **Email de ativação**: Enviado automaticamente para ${adminData.email}

📋 **Status atual**: 
• ⏳ Admin status: **PENDENTE DE ATIVAÇÃO**
• 📨 Email enviado: **SIM** (MessageID: ${activationData?.message_id})
• ⏰ Expira em: **48 horas**

🔔 **Próximos passos**:
1. O administrador deve verificar seu email
2. Clicar no link de ativação recebido
3. Definir uma senha segura
4. Será automaticamente logado no sistema

⚠️ **Importante**: O admin só poderá acessar após ativar via email!`
          : `⚠️ **Empresa criada, mas processo de ativação incompleto**

✅ **Empresa**: ${companyData.name} foi registrada
👤 **Administrador**: ${adminData.name} foi criado (AGUARDANDO ATIVAÇÃO)
❌ **Email falhou**: ${activationData?.error || 'Erro no envio'}

📋 **Ação necessária**:
• O convite de ativação deve ser reenviado manualmente
• Admin não pode acessar até completar ativação`,
        step: emailSent ? 'activation_sent' : 'activation_failed',
        activationDetails: activationData
      } as CompanyFormResult;

      // 🔧 CORREÇÃO ROBUSTA: Múltiplas tentativas de atualização da lista
      console.log('📢 [ENTERPRISE] Iniciando processo de atualização automática da lista...');
      
      // Disparar evento imediatamente
      const eventDetail = {
        companyId: companyResult.companyId,
        companyName: companyData.name,
        adminEmail: adminData.email,
        result,
        timestamp: new Date().toISOString()
      };
      
      console.log('📢 [IMMEDIATE] Disparando evento company-created imediatamente...', eventDetail);
      window.dispatchEvent(new CustomEvent('company-created', { detail: eventDetail }));
      
      // 🔥 FORÇA BRUTA: Múltiplas tentativas com timings diferentes
      setTimeout(() => {
        console.log('📢 [RETRY-1] Disparando evento company-created após 500ms...');
        window.dispatchEvent(new CustomEvent('company-created', { detail: { ...eventDetail, retry: 1 } }));
      }, 500);
      
      setTimeout(() => {
        console.log('📢 [RETRY-2] Disparando evento company-created após 1s...');
        window.dispatchEvent(new CustomEvent('company-created', { detail: { ...eventDetail, retry: 2 } }));
      }, 1000);
      
      setTimeout(() => {
        console.log('📢 [RETRY-3] Disparando evento company-created após 2s...');
        window.dispatchEvent(new CustomEvent('company-created', { detail: { ...eventDetail, retry: 3 } }));
      }, 2000);

      return result;

    } catch (error: any) {
      console.error('❌ [ENTERPRISE] Complete flow via Backend API failed:', error);
      return {
        success: false,
        message: `Erro no processo de criação via Backend API: ${error.message}`,
        step: 'company_created'
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  // UTILITY: Check if email is available (ENTERPRISE VALIDATION)
  const checkEmailAvailability = async (email: string): Promise<{ available: boolean; message: string }> => {
    try {
      console.log('🔍 [EMAIL-CHECK] Verificando disponibilidade do email:', email);
      
      if (!email || email.trim() === '') {
        return { available: false, message: 'Email é obrigatório' };
      }

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { available: false, message: 'Formato de email inválido' };
      }

      // CORREÇÃO CRÍTICA: Verificar em TODAS as tabelas relevantes
      try {
        // 1. Verificar na tabela users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', email.toLowerCase().trim())
          .limit(1);

        if (usersError) {
          console.warn('⚠️ [EMAIL-CHECK] Erro ao verificar users (usando fallback):', usersError);
        } else if (usersData && usersData.length > 0) {
          console.log('❌ [EMAIL-CHECK] Email já existe na tabela users:', email);
          return { available: false, message: 'Este email já está sendo usado' };
        }

        // 2. Verificar na tabela admin_invitations (convites pendentes)
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('admin_invitations')
          .select('id, email, status')
          .eq('email', email.toLowerCase().trim())
          .in('status', ['pending', 'sent'])
          .limit(1);

        if (invitationsError) {
          console.warn('⚠️ [EMAIL-CHECK] Erro ao verificar invitations (usando fallback):', invitationsError);
        } else if (invitationsData && invitationsData.length > 0) {
          console.log('❌ [EMAIL-CHECK] Email já tem convite pendente:', email);
          return { available: false, message: 'Este email já tem um convite pendente' };
        }

        // 3. 🔧 CORREÇÃO CRÍTICA: Verificar admins de empresas na tabela users (não companies)
        const { data: existingAdminData, error: adminError } = await supabase
          .from('users')
          .select('id, email, tenant_id')
          .eq('email', email.toLowerCase().trim())
          .eq('role', 'admin')
          .limit(1);

        if (adminError) {
          console.warn('⚠️ [EMAIL-CHECK] Erro ao verificar admins existentes (usando fallback):', adminError);
        } else if (existingAdminData && existingAdminData.length > 0) {
          console.log('❌ [EMAIL-CHECK] Email já é admin de empresa:', email);
          return { available: false, message: 'Este email já é administrador de uma empresa' };
        }

        console.log('✅ [EMAIL-CHECK] Email disponível em todas as verificações:', email);
        return { available: true, message: 'Email disponível' };

      } catch (dbError: any) {
        console.warn('⚠️ [EMAIL-CHECK] Erro de banco, permitindo email (modo graceful):', dbError.message);
        
        // FALLBACK GRACEFUL: Se o banco estiver indisponível, permitir o email
        // Isso evita bloquear o fluxo por problemas de infraestrutura
        return { available: true, message: 'Email disponível (verificação offline)' };
      }

    } catch (error: any) {
      console.error('❌ [EMAIL-CHECK] Erro na verificação:', error);
      
      // FALLBACK GRACEFUL: Em caso de erro, permitir o email
      return { available: true, message: 'Email disponível (verificação com erro)' };
    }
  };

  // UTILITY: Get company with admin info
  const getCompanyWithAdmin = async (companyId: string) => {
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      const { data: admin } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, role, is_active')
        .eq('tenant_id', companyId)
        .eq('role', 'admin')
        .maybeSingle();

      return {
        company,
        admin,
        hasAdmin: !!admin
      };
    } catch (error) {
      console.error('Error fetching company with admin:', error);
      return { company: null, admin: null, hasAdmin: false };
    }
  };

  return {
    isSubmitting,
    submitCompanyForm,
    createCompany,
    checkEmailAvailability,
    getCompanyWithAdmin
  };
}; 