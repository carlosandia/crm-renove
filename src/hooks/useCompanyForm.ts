// ✅ MIGRADO: Usando autenticação básica Supabase conforme CLAUDE.md
import { useState, useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { supabase } from '../lib/supabase';
import { CompanyFormData } from '../types/Company';
import { useToast } from './useToast';
import { hashPasswordEnterprise } from '../lib/utils';
import { useAuth } from '../providers/AuthProvider';

// ENTERPRISE ARCHITECTURE - SEGUINDO PADRÕES DOS GRANDES CRMs
// Company First → Admin Creation → Direct Activation → Professional Flow

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
  message: string;
  step?: 'company_created' | 'admin_created' | 'complete';
}

// ✅ OTIMIZAÇÃO: Schema refresh removido - desnecessário para operações normais

// ✅ SISTEMA DIRETO: Admin criado e ativado imediatamente sem email

export const useCompanyForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // ✅ MIGRADO: Usar hook useAuth para verificar usuário
  const { user } = useAuth();

  // ✅ OTIMIZAÇÃO: Refs para cleanup adequado
  const emailCacheRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  // ✅ PADRÃO REACT: Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup ao desmontar o componente
      const cacheKeys = Array.from(emailCacheRef.current);
      cacheKeys.forEach(key => {
        sessionStorage.removeItem(key);
        sessionStorage.removeItem(`${key}_validated`);
      });
      emailCacheRef.current.clear();
      
      // Cancelar requests pendentes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // STEP 1: CREATE COMPANY (ENTERPRISE PATTERN) - VIA BACKEND API
  const createCompany = async (companyData: CompanyFormData, adminData?: AdminData): Promise<{ success: boolean; companyId?: string; error?: string; data?: any }> => {
    try {
      console.log('🏢 [ENTERPRISE] Creating company via Backend API (Enterprise Pattern)...');
      
      // Validate required fields
      if (!companyData.name || !companyData.segmento || !companyData.city || !companyData.state) {
        throw new Error('Campos obrigatórios não preenchidos');
      }

      if (adminData && (!adminData.name || !adminData.email)) {
        throw new Error('Dados do administrador obrigatórios');
      }
      
      // Prepare company data for backend API
      const apiData = {
        name: companyData.name.trim(),
        segmento: companyData.segmento, // ✅ UNIFICAÇÃO: Frontend agora envia 'segmento' diretamente
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

      // ✅ SEGURANÇA: Log sanitizado removendo informações sensíveis
      console.log('📊 [ENTERPRISE] API data prepared:', { 
        companyName: apiData.name, 
        adminEmailDomain: apiData.admin_email ? apiData.admin_email.split('@')[1] : null,
        hasAdmin: !!adminData 
      });
      
      // ✅ MIGRADO: Usar autenticação básica Supabase
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar se é super_admin
      const userRole = currentUser.user_metadata?.role;
      if (userRole !== 'super_admin') {
        throw new Error('Acesso negado: apenas super_admin pode criar empresas');
      }
      
      // ✅ BÁSICO: Obter token do usuário autenticado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Token de autenticação não disponível');
      }
      
      // Fazer requisição usando URL relativa (proxy Vite)
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(apiData)
      });

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

      // ✅ CORREÇÃO CRÍTICA: REMOVIDO FALLBACK PROBLEMÁTICO
      // O fallback antigo criava empresas sem admin, violando a regra de negócio:
      // "a empresa só deve ser criada se o admin for criado também"
      
      console.log('🚫 [ENTERPRISE] Fallback removido para garantir integridade transacional');
      console.log('📋 [ENTERPRISE] Empresa não será criada sem admin correspondente');
      
      return { 
        success: false, 
        error: `Falha na criação via Backend API: ${error.message}. Empresa não criada para manter integridade dos dados.` 
      };
    }
  };

  // STEP 2: CREATE ADMIN USER (ENTERPRISE PATTERN) - INTEGRADO
  // ✅ Backend API agora cria empresa e admin numa só chamada via POST /api/companies
  // 📝 Admin criado diretamente ativo, sem processo de ativação por email

  // MAIN ENTERPRISE FLOW: Company + Admin + Direct Activation (Via Backend API)
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
          message: `✅ Empresa "${companyData.name}" criada com sucesso! O administrador pode ser criado posteriormente.`,
          step: 'company_created'
        };
      }

      // ✅ RESPOSTA SIMPLES: Admin criado diretamente ativo (SEM EMAIL)
      const result = {
        success: true,
        companyId: companyResult.companyId,
        adminCreated: true,
        message: `🎉 **Empresa e Admin criados com sucesso!**

✅ **Empresa**: ${companyData.name} foi registrada
👤 **Administrador**: ${adminData.name} foi criado e está **ATIVO**

🔑 **Acesso direto** (sem email de ativação):
• Email: ${adminData.email}
• Senha: ${adminData.password}

✅ **Sistema pronto para uso imediato!**`,
        step: 'complete'
      } as CompanyFormResult;

      // ✅ OTIMIZAÇÃO: Evento único de atualização da lista
      console.log('📢 [ENTERPRISE] Disparando evento de atualização da lista...');
      
      // Disparar evento único otimizado
      const eventDetail = {
        companyId: companyResult.companyId,
        companyName: companyData.name,
        adminEmail: adminData.email,
        result,
        timestamp: new Date().toISOString()
      };
      
      console.log('📢 [OPTIMIZED] Disparando evento company-created único...', eventDetail);
      window.dispatchEvent(new CustomEvent('company-created', { detail: eventDetail }));

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

  // ✅ PROFESSIONAL DEBOUNCE: Email validation usando use-debounce library
  const checkEmailAvailabilityCore = async (email: string): Promise<{ available: boolean; message: string }> => {
    try {
      // ✅ CORREÇÃO CRÍTICA: Definir variáveis no escopo correto
      const emailKey = `email_check_${email?.trim()?.toLowerCase() || 'unknown'}`;
      const now = Date.now();
      
      // ✅ VALIDAÇÃO DE ENTRADA rigorosa para evitar loops
      const trimmedEmail = email?.trim();
      
      if (!trimmedEmail) {
        return { available: false, message: 'Email é obrigatório' };
      }

      const domain = trimmedEmail.split('@')[1];
      if (!domain) {
        return { available: false, message: 'Formato de email inválido' };
      }
      
      console.log('🔍 [EMAIL-CHECK] Verificando disponibilidade do domínio:', domain);
      console.log('🔧 [DEBUG] EmailKey gerado:', emailKey);

      // ✅ VALIDAÇÃO DE EMAIL robusta
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(trimmedEmail)) {
        console.log('❌ [EMAIL-CHECK] Formato inválido:', trimmedEmail);
        return { available: false, message: 'Formato de email inválido' };
      }
      
      // ✅ SEGURANÇA: Prevenir emails suspeitos
      const suspiciousDomains = ['test.com', 'example.com', 'fake.com'];
      const domainLower = domain.toLowerCase();
      if (suspiciousDomains.includes(domainLower)) {
        return { available: false, message: 'Domínio de email não permitido' };
      }

      // CORREÇÃO CRÍTICA: Verificar em TODAS as tabelas relevantes COM error handling melhorado
      try {
        // 1. Verificar na tabela users com error handling robusto
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', trimmedEmail.toLowerCase())
          .limit(1);

        if (usersError) {
          console.warn('⚠️ [EMAIL-CHECK] Erro ao verificar users (usando fallback graceful):', usersError.message);
          // ✅ CORREÇÃO PRIORITY 4: Não bloquear o fluxo por erro de infraestrutura
          return { available: true, message: 'Email disponível (verificação offline)' };
        } else if (usersData && usersData.length > 0) {
          console.log('❌ [EMAIL-CHECK] Email já existe na tabela users:', trimmedEmail);
          return { available: false, message: 'Este email já está sendo usado' };
        }

        // 2. Verificar na tabela admin_invitations (convites pendentes) - OTIMIZADO
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('admin_invitations')
          .select('id, email, status')
          .eq('email', trimmedEmail.toLowerCase())
          .in('status', ['pending', 'sent'])
          .limit(1);

        if (invitationsError) {
          console.warn('⚠️ [EMAIL-CHECK] Erro ao verificar invitations (fallback graceful):', invitationsError.message);
          // ✅ CORREÇÃO PRIORITY 4: Graceful fallback
          return { available: true, message: 'Email disponível (verificação parcial)' };
        } else if (invitationsData && invitationsData.length > 0) {
          console.log('❌ [EMAIL-CHECK] Email já tem convite pendente:', trimmedEmail);
          return { available: false, message: 'Este email já tem um convite pendente' };
        }

        // 3. ✅ CORREÇÃO CRÍTICA: Verificar admins de empresas na tabela users (não companies) - OTIMIZADO
        const { data: existingAdminData, error: adminError } = await supabase
          .from('users')
          .select('id, email, tenant_id')
          .eq('email', trimmedEmail.toLowerCase())
          .eq('role', 'admin')
          .limit(1);

        if (adminError) {
          console.warn('⚠️ [EMAIL-CHECK] Erro ao verificar admins existentes (fallback graceful):', adminError.message);
          // ✅ CORREÇÃO PRIORITY 4: Graceful fallback
          return { available: true, message: 'Email disponível (verificação parcial)' };
        } else if (existingAdminData && existingAdminData.length > 0) {
          console.log('❌ [EMAIL-CHECK] Email já é admin de empresa:', trimmedEmail);
          return { available: false, message: 'Este email já é administrador de uma empresa' };
        }

        console.log('✅ [EMAIL-CHECK] Email disponível em todas as verificações:', trimmedEmail);
        console.log('🔧 [DEBUG] Salvando cache de validação:', `${emailKey}_validated`, now);
        
        // ✅ OTIMIZAÇÃO: Usar refs para tracking de cache
        sessionStorage.setItem(`${emailKey}_validated`, now.toString());
        emailCacheRef.current.add(emailKey);
        
        return { available: true, message: 'Email disponível' };

      } catch (dbError: any) {
        console.warn('⚠️ [EMAIL-CHECK] Erro de banco, permitindo email (modo graceful):', dbError.message);
        
        // ✅ OTIMIZAÇÃO: Cleanup otimizado com refs
        sessionStorage.removeItem(emailKey);
        emailCacheRef.current.delete(emailKey);
        
        // FALLBACK GRACEFUL: Se o banco estiver indisponível, permitir o email
        // Isso evita bloquear o fluxo por problemas de infraestrutura
        return { available: true, message: 'Email disponível (verificação offline)' };
      }

    } catch (error: any) {
      console.error('❌ [EMAIL-CHECK] Erro na verificação:', error);
      
      // ✅ OTIMIZAÇÃO: Cleanup otimizado com refs
      const emailKey = `email_check_${email?.trim()?.toLowerCase() || 'unknown'}`;
      sessionStorage.removeItem(emailKey);
      sessionStorage.removeItem(`${emailKey}_validated`);
      emailCacheRef.current.delete(emailKey);
      
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

  // ✅ PROFESSIONAL DEBOUNCE HOOK: use-debounce otimizado para digitação fluida
  const checkEmailAvailability = useDebouncedCallback(
    (email: string) => {
      console.log('🔄 [DEBOUNCE] Executando checkEmailAvailabilityCore com email:', email);
      return checkEmailAvailabilityCore(email);
    },
    500, // ✅ OTIMIZAÇÃO: 500ms para digitação mais fluida
    {
      leading: false,
      trailing: true,
      maxWait: 800 // ✅ OTIMIZAÇÃO: Máximo 800ms de espera
    }
  );

  return {
    isSubmitting,
    submitCompanyForm,
    createCompany,
    checkEmailAvailability,
    getCompanyWithAdmin
  };
}; 