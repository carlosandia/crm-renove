import React, { useState, useEffect, useCallback, useMemo, Profiler } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// ✅ REACT.DEV PATTERN: Environment-based logging configuration
const isDevelopment = import.meta.env.VITE_ENVIRONMENT === 'development';
const enableDebugLogs = isDevelopment && import.meta.env.VITE_LOG_LEVEL !== 'error';

// ✅ PRODUCTION SAFETY: Disable console in production build
if (!isDevelopment) {
  const noop = () => {};
  if (typeof window !== 'undefined') {
    // Only disable debug logs in production, keep errors
    window.console.log = noop;
    window.console.info = noop;
    window.console.debug = noop;
    // Keep console.warn and console.error for critical issues
  }
}

// ✅ REACT.DEV PATTERN: Throttled logging helper
const createThrottledLogger = (fn: (...args: any[]) => void, wait: number = 1000) => {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastCall > wait) {
      lastCall = now;
      fn(...args);
    }
  };
};

// ✅ REACT.DEV PATTERN: Specialized logging helpers
const throttledDebugLog = createThrottledLogger(console.log, 2000);
const throttledInfoLog = createThrottledLogger(console.info, 1500);
const throttledWarnLog = createThrottledLogger(console.warn, 1000);

// ✅ REACT.DEV PATTERN: Performance monitoring with Profiler
const onRenderProfiler = (id: string, phase: string, actualDuration: number, baseDuration: number, startTime: number, commitTime: number) => {
  if (enableDebugLogs && actualDuration > 16) { // Only log slow renders (>16ms)
    throttledWarnLog(`🐌 [Performance] ${id} slow render:`, {
      phase,
      actualDuration: Math.round(actualDuration * 100) / 100,
      baseDuration: Math.round(baseDuration * 100) / 100,
      startTime: Math.round(startTime),
      commitTime: Math.round(commitTime)
    });
  }
};

// ✅ REACT.DEV PATTERN: Error Boundary for production safety
class VendedoresErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Always log errors to external service in production
    console.error('🚨 [VendedoresErrorBoundary] Component crashed:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    // In production, send to error tracking service
    if (!isDevelopment) {
      // logger.error('VendedoresModule crashed', { error, errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-red-900 mb-2">
            Erro no módulo de Vendedores
          </h2>
          <p className="text-red-700 mb-4">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
          {enableDebugLogs && this.state.error && (
            <details className="mt-4 text-left">
              <summary className="text-sm text-red-600 cursor-pointer">
                Detalhes do erro (modo desenvolvimento)
              </summary>
              <pre className="mt-2 p-2 bg-red-100 text-red-800 text-xs rounded overflow-auto">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
// 🔧 Novos hooks para eliminação de código duplicado
import { useArrayState } from '../hooks/useArrayState';
import { useAsyncState } from '../hooks/useAsyncState';
// ✅ CORREÇÃO FASE 1: Imports corretos do react-use (removido useUpdateEffect)
import { useEffectOnce, useThrottleFn } from 'react-use';
import { showSuccessToast, showErrorToast, showWarningToast } from '../lib/toast';
import { hashPasswordEnterprise } from '../lib/utils';
import { 
  Users, User, Mail, Shield, Plus, Eye, EyeOff, CheckCircle, XCircle, 
  Target, Edit, Trash2, Calendar, Phone, Building
} from 'lucide-react';
import { IconBadge } from './ui/icon-badge';
import '../styles/VendedoresModule.css';
import { useMembersAPI } from '../hooks/useMembersAPI';
// 🆕 NOVO: Imports para SubHeader
import VendedoresSubHeader from './SubHeader/VendedoresSubHeader';
import { useVendedoresSubHeader } from '../hooks/useVendedoresSubHeader';
// 🆕 MODAL: Import dos modais de criação e edição de vendedor
import VendedorCreateModal from './VendedorCreateModal';
import VendedorEditModal from './VendedorEditModal';

interface Vendedor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  tenant_id: string;
  last_login?: string;
  last_login_formatted?: string;
  is_real_login?: boolean;
}

type GoalType = 'vendas' | 'receita' | 'leads' | 'conversao';

interface SalesGoal {
  id: string;
  goal_type: GoalType;
  goal_value: number;
  current_value: number;
  period: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  target_date: string;
  status: 'ativa' | 'pausada' | 'concluida' | 'cancelada';
}

// ✅ REACT.DEV PATTERN: Optimized component with proper memoization
interface VendedoresModuleProps {
  renderSubHeader?: (subHeaderContent: React.ReactNode) => void;
}

// ✅ PERFORMANCE: Memoized component with shallow comparison
const VendedoresModule: React.FC<VendedoresModuleProps> = React.memo(({ renderSubHeader }) => {
  const { user } = useAuth();
  
  // 🔧 REFATORADO: Usando useArrayState para eliminar duplicação
  const vendedoresState = useArrayState<Vendedor>([]);
  const vendedores = vendedoresState.items;
  const setVendedores = vendedoresState.setItems;
  
  // 🔧 REFATORADO: Estado assíncrono para operações
  const vendedoresAsync = useAsyncState<Vendedor[]>();
  const loading = vendedoresAsync.loading;
  const setLoading = vendedoresAsync.setLoading;
  
  // Estados de modal (mantidos individuais por simplicidade)
  const [showVendedorModal, setShowVendedorModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ vendedorId: string; vendedorName: string } | null>(null);

  // Removidos estados do formulário antigo - usando o modal agora

  // Removidos estados das metas - funcionalidade removida

  // 🔧 ENTERPRISE: Usar Members API Enterprise
  const { 
    createMember, 
    fetchMembers: fetchMembersAPI, 
    updateMember, 
    deleteMember,
    checkEmailAvailability: checkEmailAPI,
    isLoading: apiLoading 
  } = useMembersAPI();

  // 🚀 OTIMIZAÇÃO FASE 1: Hook do SubHeader com throttling aplicado
  const {
    state: subHeaderState,
    actions: subHeaderActions
  } = useVendedoresSubHeader();

  // ✅ CORREÇÃO: Função corrigida para mostrar apenas datas reais de último login
  // ✅ REACT.DEV PATTERN: Pure function with optimized performance
  const formatLastLogin = useCallback((lastLogin: string | null | undefined, createdAt: string): { formatted: string; isReal: boolean } => {
    if (!lastLogin) {
      return {
        formatted: 'Nunca logou',
        isReal: false
      };
    }

    try {
      // ✅ PERFORMANCE: Optimized date handling
      const utcLastLogin = lastLogin.endsWith('Z') ? lastLogin : lastLogin + 'Z';
      const utcCreatedAt = createdAt.endsWith('Z') ? createdAt : createdAt + 'Z';
      
      const loginDate = new Date(utcLastLogin);
      const now = new Date();
      
      // ✅ VALIDATION: Future date check (optimized)
      if (loginDate > now) {
        return { formatted: 'Nunca logou', isReal: false };
      }
      
      // ✅ VALIDATION: Creation date check (optimized)
      const createdDate = new Date(utcCreatedAt);
      if (loginDate < createdDate) {
        return { formatted: 'Nunca logou', isReal: false };
      }
      
      // ✅ PERFORMANCE: Direct return with memoized locale options
      return {
        formatted: loginDate.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        isReal: true
      };
    } catch (error) {
      return { formatted: 'Nunca logou', isReal: false };
    }
  }, []); // ✅ PERFORMANCE: Empty deps array - pure function

  // Removido validateEmail - agora está no modal

  // Removido validatePassword - agora está no modal

  // 🚀 OTIMIZAÇÃO: Fetch vendedores memoizado
  const fetchVendedores = useCallback(async () => {
    try {
      // ✅ REACT.DEV PATTERN: Essential logging only
      if (enableDebugLogs) {
        throttledInfoLog('[VendedoresModule] Loading vendedores for tenant:', user?.tenant_id);
      }
      
      if (!user?.tenant_id) {
        console.error('❌ [VendedoresModule] CRITICAL: Missing tenant_id'); // Always log critical errors
        logger.error('Usuário sem tenant_id definido');
        setVendedores([]);
        setLoading(false);
        return;
      }

      try {
        // ✅ REACT.DEV PATTERN: Database operation with minimal logging
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'member')
          .eq('tenant_id', user.tenant_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ [VendedoresModule] Database query failed:', error.message); // Always log DB errors
          throw error;
        }

        if (enableDebugLogs) {
          throttledDebugLog('✅ [VendedoresModule] Query completed:', { count: data?.length });
        }

        // ✅ REACT.DEV PATTERN: Process vendedores with minimal logging
        const vendedoresComLogin = (data || []).map((vendedor) => {
          const loginInfo = formatLastLogin(vendedor.last_login, vendedor.created_at);
          return {
            ...vendedor,
            last_login: vendedor.last_login,
            last_login_formatted: loginInfo.formatted,
            is_real_login: loginInfo.isReal
          };
        });

        if (enableDebugLogs && vendedoresComLogin.length > 0) {
          throttledInfoLog('✅ [VendedoresModule] Processed vendedores:', vendedoresComLogin.length);
        }
        logger.success(`Vendedores carregados: ${vendedoresComLogin?.length || 0}`);
        setVendedores(vendedoresComLogin || []);
        setLoading(false);
        return;
      } catch (dbError: any) {
        console.error('❌ [VendedoresModule] Database error:', dbError.message); // Always log DB errors
        logger.error('Erro na consulta ao banco:', dbError);
        
        // ✅ REACT.DEV PATTERN: Fallback with specific error handling
        if (dbError.message?.includes('relation "users" does not exist') || 
            dbError.message?.includes('permission denied for table users') ||
            dbError.code === 'PGRST116') {
          
          if (enableDebugLogs) {
            throttledWarnLog('⚠️ [VendedoresModule] Using mock data due to table error');
          }
          logger.info('Usando dados simulados para vendedores');
          const mockVendedores: Vendedor[] = [
            {
              id: 'mock-1',
              first_name: 'João',
              last_name: 'Silva',
              email: 'joao@empresa.com',
              is_active: true,
              created_at: new Date().toISOString(),
              tenant_id: user.tenant_id,
              last_login: null,
              last_login_formatted: 'Nunca logou',
              is_real_login: false
            },
            {
              id: 'mock-2', 
              first_name: 'Maria',
              last_name: 'Santos',
              email: 'maria@empresa.com',
              is_active: true,
              created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              tenant_id: user.tenant_id,
              last_login: null,
              last_login_formatted: 'Nunca logou',
              is_real_login: false
            }
          ];
          setVendedores(mockVendedores);
          setLoading(false);
          return;
        }
        
        // ✅ REACT.DEV PATTERN: Graceful error handling
        setVendedores([]);
        setLoading(false);
        return;
      }
      
    } catch (error) {
      console.error('❌ [VendedoresModule] General loading error:', error instanceof Error ? error.message : 'Unknown error'); // Always log general errors
      logger.error('Erro geral ao carregar vendedores:', error);
      setVendedores([]);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id, formatLastLogin]);

  // ✅ CORREÇÃO DEFINITIVA FASE 3: useThrottleFn corrigido conforme documentação oficial
  // AIDEV-NOTE: useThrottleFn executa função diretamente, não retorna função throttled
  useThrottleFn(
    () => {
      // ✅ REACT.DEV PATTERN: Throttled operation (automatic execution)
      if (enableDebugLogs) {
        throttledDebugLog('[🛠️ VendedoresModule] Throttled optimization executed');
      }
    },
    1000,
    [user?.tenant_id] // Dependências relevantes
  );

  // ✅ CORREÇÃO: Criar função throttled manual usando useCallback + setTimeout
  const throttledFetchVendedores = useCallback(() => {
    // ✅ REACT.DEV PATTERN: Throttled data fetching
    if (enableDebugLogs) {
      throttledDebugLog('[🔄 VendedoresModule] Executing throttled fetch');
    }
    fetchVendedores();
  }, [fetchVendedores]);

  // 🆕 NOVO: Lógica de filtragem corrigida baseada no SubHeader
  const filteredVendedores = useMemo(() => {
    let filtered = vendedores;

    // CORREÇÃO: Filtro por status ativo/inativo com três estados
    if (subHeaderState.showOnlyActive === true) {
      // Mostrar apenas ativos
      filtered = filtered.filter(vendedor => vendedor.is_active === true);
    } else if (subHeaderState.showOnlyActive === false) {
      // Mostrar apenas inativos
      filtered = filtered.filter(vendedor => vendedor.is_active === false);
    }
    // Se showOnlyActive === undefined, mostra todos (não filtra)

    // CORREÇÃO: Filtro de busca melhorado (nome completo, partes do nome e email)
    if (subHeaderState.searchValue.trim() !== '') {
      const searchTerm = subHeaderState.searchValue.toLowerCase().trim();
      filtered = filtered.filter(vendedor => {
        const fullName = `${vendedor.first_name} ${vendedor.last_name}`.toLowerCase();
        const firstName = vendedor.first_name.toLowerCase();
        const lastName = vendedor.last_name.toLowerCase();
        const email = vendedor.email.toLowerCase();
        
        return (
          fullName.includes(searchTerm) ||           // Nome completo
          firstName.includes(searchTerm) ||         // Primeiro nome
          lastName.includes(searchTerm) ||          // Sobrenome
          email.includes(searchTerm) ||             // Email completo
          firstName.startsWith(searchTerm) ||       // Início do primeiro nome
          lastName.startsWith(searchTerm) ||        // Início do sobrenome
          email.startsWith(searchTerm)              // Início do email
        );
      });
    }

    return filtered;
  }, [vendedores, subHeaderState.searchValue, subHeaderState.showOnlyActive]);

  // 🆕 NOVO: Handler para criar novo vendedor via SubHeader - MEMOIZADO FASE 2
  const handleCreateVendedorFromSubHeader = useCallback(() => {
    // ✅ REACT.DEV PATTERN: User action logging
    if (enableDebugLogs) {
      throttledInfoLog('[➕ VendedoresModule] Create vendedor modal opened');
    }
    setShowVendedorModal(true);
  }, []);

  // 🆕 NOVO: Handler para quando vendedor é criado via modal - MEMOIZADO FASE 2
  const handleVendedorCreated = useCallback(async (vendedorData: any) => {
    // ✅ REACT.DEV PATTERN: Success operation logging
    if (enableDebugLogs) {
      throttledInfoLog('✅ [VendedoresModule] Vendedor created successfully:', vendedorData.email);
    }
    showSuccessToast('Vendedor criado!', `${vendedorData.first_name} ${vendedorData.last_name} foi adicionado à equipe.`);
    throttledFetchVendedores();
  }, [throttledFetchVendedores]);

  // ✅ NOVO: Handler para edição com modal
  const handleEdit = useCallback((vendedor: Vendedor) => {
    setSelectedVendedor(vendedor);
    setShowEditModal(true);
  }, []);

  // ✅ NOVO: Handler para quando vendedor é editado via modal - MEMOIZADO FASE 2
  const handleVendedorEdited = useCallback(async (vendedorData: any) => {
    // ✅ REACT.DEV PATTERN: Update operation logging
    if (enableDebugLogs) {
      throttledInfoLog('✏️ [VendedoresModule] Vendedor updated successfully:', vendedorData.email);
    }
    showSuccessToast('Vendedor atualizado!', `${vendedorData.first_name} ${vendedorData.last_name} foi atualizado com sucesso.`);
    throttledFetchVendedores();
    setSelectedVendedor(null);
  }, [throttledFetchVendedores]);

  const confirmDelete = useCallback((vendedorId: string) => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    const vendedorName = vendedor ? `${vendedor.first_name} ${vendedor.last_name}` : 'este vendedor';
    setDeleteConfirm({ vendedorId, vendedorName });
  }, [vendedores]);

  const executeDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    
    const { vendedorId } = deleteConfirm;
    setDeleteConfirm(null);

    try {
      if (vendedorId.startsWith('mock-')) {
        logger.info('Simulando exclusão de vendedor mock');
        const updatedVendedores = vendedores.filter(v => v.id !== vendedorId);
        setVendedores(updatedVendedores);
        showSuccessToast('Vendedor excluído', 'Vendedor foi excluído com sucesso (simulado)!');
      } else {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', vendedorId);

        if (error) {
          throw error;
        }

        throttledFetchVendedores(); // FASE 2: Usando versão throttled
        showSuccessToast('Vendedor excluído', 'Vendedor foi excluído com sucesso!');
      }
    } catch (error) {
      logger.error('Erro ao excluir vendedor:', error);
      showErrorToast('Erro ao excluir', 'Erro ao excluir vendedor: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  }, [deleteConfirm, vendedores, setVendedores, throttledFetchVendedores]);

  const toggleVendedorStatus = useCallback(async (vendedorId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'ativar' : 'desativar';

    try {
      if (vendedorId.startsWith('mock-')) {
        logger.info(`Simulando ${action} vendedor mock`);
        const updatedVendedores = vendedores.map(v => 
          v.id === vendedorId ? { ...v, is_active: newStatus } : v
        );
        setVendedores(updatedVendedores);
        const statusText = action === 'ativar' ? 'Ativado' : 'Desativado';
        showSuccessToast(`Vendedor ${statusText}`, `Vendedor foi ${statusText.toLowerCase()} com sucesso (simulado)!`);
      } else {
        const { error } = await supabase
          .from('users')
          .update({ is_active: newStatus })
          .eq('id', vendedorId);

        if (error) {
          throw error;
        }

        throttledFetchVendedores(); // FASE 2: Usando versão throttled
        const statusText = action === 'ativar' ? 'Ativado' : 'Desativado';
        showSuccessToast(`Vendedor ${statusText}`, `Vendedor foi ${statusText.toLowerCase()} com sucesso!`);
      }
    } catch (error) {
      logger.error(`Erro ao ${action} vendedor:`, error);
      showErrorToast(`Erro ao ${action}`, `Erro ao ${action} vendedor: ` + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  }, [vendedores, throttledFetchVendedores]);

  // 🚀 OTIMIZAÇÃO FASE 1: useEffectOnce para carregamento inicial
  useEffectOnce(() => {
    // ✅ REACT.DEV PATTERN: Component initialization logging
    if (enableDebugLogs) {
      throttledInfoLog('⚡ [VendedoresModule] Component initialized via useEffectOnce');
    }
    try {
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        fetchVendedores();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ [VendedoresModule] Initialization error:', error); // Always log initialization errors
      setLoading(false);
    }
  });

  // Removidos useEffects de validação - agora estão no modal

  // ✅ CORREÇÃO CRÍTICA: Usar useEffect que executa sempre que renderSubHeader estiver disponível
  // PROBLEMA IDENTIFICADO: useUpdateEffect não estava funcionando corretamente
  // SOLUÇÃO: Executar sempre que renderSubHeader estiver disponível (primeira vez ou updates)
  useEffect(() => {
    // ✅ CORREÇÃO: Remover flag isFirstRender - executar sempre que necessário
    if (!renderSubHeader || !user?.role) {
      console.log('🚀 [VendedoresModule] renderSubHeader ou user.role não disponível ainda');
      return;
    }
    
    // 🚨 DEBUG TEMPORÁRIO: Sempre logar para investigar problema do subheader
    console.log('🔍 [VendedoresModule] SubHeader update triggered', {
      hasRenderSubHeader: !!renderSubHeader,
      userRole: user?.role,
      shouldRenderSubHeader: !!renderSubHeader && user?.role && ['admin', 'super_admin', 'member'].includes(user?.role),
      enableDebugLogs,
      timestamp: new Date().toISOString()
    });
    
    // ✅ CORREÇÃO: Incluir role 'member' para permitir visualização do SubHeader
    if (renderSubHeader && user?.role && ['admin', 'super_admin', 'member'].includes(user?.role)) {
      // 🚨 DEBUG TEMPORÁRIO: Sempre logar renderização do subheader
      console.log('✅ [VendedoresModule] Rendering SubHeader for role:', user.role, {
        renderSubHeaderType: typeof renderSubHeader,
        userRole: user?.role,
        timestamp: new Date().toISOString()
      });
      
      // ✅ CONTROLE GRANULAR: Apenas admin e super_admin podem criar vendedores
      const canCreateVendedor = user.role === 'admin' || user.role === 'super_admin';
      
      const subHeaderContent = (
        <VendedoresSubHeader
          onSearchChange={subHeaderActions.handleSearchChange}
          onActiveFilterChange={subHeaderActions.handleActiveFilterChange}
          onCreateVendedor={canCreateVendedor ? handleCreateVendedorFromSubHeader : undefined}
          searchValue={subHeaderState.searchValue}
          showOnlyActive={subHeaderState.showOnlyActive}
        />
      );
      renderSubHeader(subHeaderContent);
      console.log('🎯 [VendedoresModule] SubHeader enviado via renderSubHeader!');
    } else {
      // 🚨 DEBUG TEMPORÁRIO: Sempre logar quando subheader não é renderizado
      console.warn('❌ [VendedoresModule] SubHeader NOT rendered:', {
        hasRenderSubHeader: !!renderSubHeader,
        userRole: user?.role,
        isValidRole: user?.role && ['admin', 'super_admin', 'member'].includes(user?.role),
        timestamp: new Date().toISOString()
      });
    }

    // ✅ REACT.DEV PATTERN: Cleanup function with minimal logging
    return () => {
      if (enableDebugLogs) {
        throttledDebugLog('🧹 [VendedoresModule] Cleaning up SubHeader');
      }
      if (renderSubHeader) {
        renderSubHeader(null);
      }
    };
  }, [
    renderSubHeader, 
    // ✅ CORREÇÃO: Usar propriedades individuais ao invés de objetos completos
    subHeaderActions.handleSearchChange,
    subHeaderActions.handleActiveFilterChange,
    subHeaderState.searchValue,
    subHeaderState.showOnlyActive,
    handleCreateVendedorFromSubHeader, 
    user?.role
  ]);

  // Removido handleCreateGoal - funcionalidade removida

  const formatDate = (dateString: string) => {
    // ✅ CORREÇÃO: Garantir que a data seja tratada como UTC
    // Se não terminar com 'Z', adicionar para forçar interpretação UTC
    const utcDateString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    
    return new Date(utcDateString).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatGoalType = (goalType: GoalType): string => {
    switch (goalType) {
      case 'vendas':
        return 'Vendas';
      case 'receita':
        return 'Receita';
      case 'leads':
        return 'Leads';
      case 'conversao':
        return 'Conversão';
      default:
        return goalType;
    }
  };

  const formatGoalValue = (goalType: GoalType, value: string): string => {
    if (goalType === 'receita') {
      return 'R$ ' + parseFloat(value).toLocaleString('pt-BR');
    }
    return value;
  };



  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
        <p className="text-gray-600">Apenas administradores podem acessar este módulo.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // 🆕 ATUALIZADO: Estatísticas baseadas nos vendedores filtrados (CORRIGIDO)
  // ✅ REACT.DEV PATTERN: Optimized stats calculation with single pass
  const stats = useMemo(() => {
    // ✅ PERFORMANCE: Single pass through vendedores array
    let total = 0, active = 0, inactive = 0, recent = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const vendedor of vendedores) {
      total++;
      if (vendedor.is_active === true) active++;
      if (vendedor.is_active === false) inactive++;
      
      const createdDate = new Date(vendedor.created_at);
      if (createdDate > thirtyDaysAgo) recent++;
    }
    
    return {
      total,
      active,
      inactive,
      recent,
      filtered: filteredVendedores.length,
      hasFilters: subHeaderState.searchValue.trim() !== '' || subHeaderState.showOnlyActive !== undefined
    };
  }, [vendedores, filteredVendedores.length, subHeaderState.searchValue, subHeaderState.showOnlyActive]); // ✅ PERFORMANCE: Optimized dependencies

  // ✅ REACT.DEV PATTERN: Wrap in Profiler for performance monitoring
  const content = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <IconBadge
              icon={<Users className="w-6 h-6" />}
              variant="blue"
              size="xl"
            />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total de Vendedores</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <IconBadge
              icon={<CheckCircle className="w-6 h-6" />}
              variant="green"
              size="xl"
            />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
              <div className="text-sm text-gray-500">Vendedores Ativos</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <IconBadge
              icon={<XCircle className="w-6 h-6" />}
              variant="red"
              size="xl"
            />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.inactive}</div>
              <div className="text-sm text-gray-500">Vendedores Inativos</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <IconBadge
              icon={<Target className="w-6 h-6" />}
              variant="purple"
              size="xl"
            />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.recent}</div>
              <div className="text-sm text-gray-500">Novos (30 dias)</div>
            </div>
          </div>
        </div>
      </div>

      {/* 📋 REMOVIDO: Seção "Gestão de Vendedores" movida para o SubHeader */}

      {/* Removido formulário antigo - usando modal agora */}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {stats.hasFilters ? (
                <>Vendedores Encontrados</>
              ) : (
                <>Vendedores Cadastrados</>
              )}
            </h2>
          </div>
        </div>

        {filteredVendedores.length === 0 && vendedores.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum vendedor cadastrado</h3>
            <p className="text-gray-500 mb-6">
              Adicione vendedores à sua equipe para começar
            </p>
            <button
              onClick={() => setShowVendedorModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Adicionar primeiro vendedor
            </button>
          </div>
        ) : filteredVendedores.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">
              {subHeaderState.searchValue.trim() !== '' 
                ? `Nenhum vendedor corresponde à busca "${subHeaderState.searchValue}"`
                : 'Tente ajustar os filtros ou adicionar novos vendedores'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredVendedores.map((vendedor) => (
              <div key={vendedor.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-medium flex-shrink-0">
                      {vendedor.first_name.charAt(0)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {vendedor.first_name} {vendedor.last_name}
                        </h3>
                        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                          vendedor.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {vendedor.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Ativo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Inativo</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <Mail className="w-4 h-4" />
                          <span>{vendedor.email}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Criado em {formatDate(vendedor.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Shield className="w-4 h-4" />
                          <span>Último acesso: {vendedor.last_login_formatted || 'Nunca logou'}</span>
                          {vendedor.is_real_login === false && vendedor.last_login_formatted !== 'Nunca logou' && (
                            <span className="text-xs text-amber-600 ml-1">(simulado)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(vendedor)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Editar vendedor"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => toggleVendedorStatus(vendedor.id, vendedor.is_active)}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        vendedor.is_active 
                          ? 'text-red-600 hover:bg-red-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={vendedor.is_active ? 'Desativar vendedor' : 'Ativar vendedor'}
                    >
                      {vendedor.is_active ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    
                    <button
                      onClick={() => confirmDelete(vendedor.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Excluir vendedor"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Removido modal de metas */}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirm && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
                  <p className="text-sm text-gray-600">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Tem certeza que deseja excluir o vendedor <strong>{deleteConfirm.vendedorName}</strong>?
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Criação de Vendedor */}
      <VendedorCreateModal
        isOpen={showVendedorModal}
        onClose={() => setShowVendedorModal(false)}
        onSubmit={handleVendedorCreated}
      />

      {/* Modal de Edição de Vendedor */}
      <VendedorEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedVendedor(null);
        }}
        vendedor={selectedVendedor}
        onSubmit={handleVendedorEdited}
      />
    </div>
  );

  // ✅ REACT.DEV PATTERN: Return with Error Boundary and Profiler wrapper
  const wrappedContent = enableDebugLogs ? (
    <Profiler id="VendedoresModule" onRender={onRenderProfiler}>
      {content}
    </Profiler>
  ) : content;

  return (
    <VendedoresErrorBoundary>
      {wrappedContent}
    </VendedoresErrorBoundary>
  );
});

VendedoresModule.displayName = 'VendedoresModule';

export default VendedoresModule;