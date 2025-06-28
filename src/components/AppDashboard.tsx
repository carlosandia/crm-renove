import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RoleBasedMenu from './RoleBasedMenu';
import CRMLayout from './CRMLayout';
import { logger } from '../utils/logger';
import { CheckCircle, Users, BarChart3, Settings, X } from 'lucide-react';

const AppDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 🎉 DETECÇÃO: Verificar se é um admin recém-ativado (CORREÇÃO CRÍTICA #3)
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{
    message: string;
    isNewActivation: boolean;
    autoLoginAttempts?: number;
    tokensStored?: boolean;
    activationMethod?: 'location' | 'event';
  } | null>(null);
  
  // 🔄 PERSISTÊNCIA: Recuperar módulo ativo do localStorage ou usar padrão baseado no role
  const getDefaultModule = (userRole: string) => {
    switch (userRole) {
      case 'super_admin':
        return 'Dashboard Admin';
      case 'admin':
        return 'Dashboard Admin';
      case 'member':
        return 'Meu Dashboard';
      default:
        return 'Dashboard Admin';
    }
  };

  // 📋 VALIDAÇÃO: Módulos válidos por role
  const getValidModulesForRole = (userRole: string): string[] => {
    switch (userRole) {
      case 'super_admin':
        return ['Dashboard Admin', 'Relatório', 'Feedback', 'Clientes', 'Configurações da Plataforma', 'Notificações'];
      case 'admin':
        return ['Dashboard Admin', 'Vendedores', 'Gestão de pipeline', 'Gestão de formulários', 'Acompanhamento', 'Leads', 'Integrações'];
      case 'member':
        return ['Meu Dashboard', 'Pipeline', 'Gestão de pipeline', 'Leads', 'Acompanhamento'];
      default:
        return ['Dashboard Admin'];
    }
  };

  // 🔍 VALIDAÇÃO: Verificar se módulo salvo é válido para o role atual
  const isModuleValidForRole = (moduleName: string, userRole: string): boolean => {
    const validModules = getValidModulesForRole(userRole);
    return validModules.includes(moduleName);
  };

  // 🔄 PERSISTÊNCIA: Estado com recuperação automática otimizada
  const [activeModule, setActiveModule] = useState(() => {
    // Durante a inicialização, usar um valor padrão temporário
    // O valor correto será definido no useEffect quando o user estiver disponível
    return 'Dashboard Admin';
  });

  // 🔄 PERSISTÊNCIA: Salvar módulo ativo sempre que mudar (useCallback para evitar re-renders)
  const handleNavigateWithPersistence = useCallback((moduleName: string) => {
    console.log(`📍 Navegando para: ${moduleName}`);
    
    try {
      // Salvar no localStorage
      localStorage.setItem('crm_active_module', moduleName);
      
      // Atualizar estado
      setActiveModule(moduleName);
      
      console.log(`✅ Módulo '${moduleName}' salvo com sucesso`);
    } catch (error) {
      console.error('Erro ao salvar módulo ativo:', error);
      // Mesmo com erro, atualizar o estado
      setActiveModule(moduleName);
    }
  }, []);

  // 🎉 CORREÇÃO CRÍTICA #3: Detecção melhorada de admins recém-ativados
  useEffect(() => {
    // 📍 MÉTODO 1: Detecção via location.state (redirecionamento direto)
    if (location.state?.isNewActivation && location.state?.welcomeMessage) {
      console.log('🎉 [CRITICAL-FIX-3] Admin recém-ativado detectado via location.state');
      setWelcomeData({
        message: location.state.welcomeMessage,
        isNewActivation: location.state.isNewActivation,
        autoLoginAttempts: location.state.autoLoginAttempts || 1,
        activationMethod: 'location'
      });
      setShowWelcomeMessage(true);
      
      // Limpar o state da location para evitar mostrar novamente
      navigate('/dashboard', { replace: true });
    }
  }, [location.state, navigate]);

  // 🎧 CORREÇÃO CRÍTICA #3: Listener para evento admin-activated
  useEffect(() => {
    const handleAdminActivated = (event: CustomEvent) => {
      console.log('🎉 [CRITICAL-FIX-3] Evento admin-activated recebido:', event.detail);
      
      const { adminEmail, tokensStored, attempt } = event.detail;
      
      // Verificar se é o usuário atual
      if (user && user.email === adminEmail) {
        console.log('✅ [CRITICAL-FIX-3] Evento corresponde ao usuário atual, exibindo boas-vindas');
        
        setWelcomeData({
          message: `Bem-vindo ao CRM! Sua conta foi ativada com sucesso e você foi logado automaticamente.`,
          isNewActivation: true,
          autoLoginAttempts: attempt,
          tokensStored: tokensStored,
          activationMethod: 'event'
        });
        setShowWelcomeMessage(true);
      } else {
        console.log('ℹ️ [CRITICAL-FIX-3] Evento não corresponde ao usuário atual, ignorando');
      }
    };

    // Registrar listener
    window.addEventListener('admin-activated', handleAdminActivated as EventListener);
    console.log('🎧 [CRITICAL-FIX-3] Listener admin-activated registrado');

    // Cleanup
    return () => {
      window.removeEventListener('admin-activated', handleAdminActivated as EventListener);
      console.log('🧹 [CRITICAL-FIX-3] Listener admin-activated removido');
    };
  }, [user?.email]);

  // 🔄 PERSISTÊNCIA: Sincronizar com mudanças de usuário (corrigido para evitar loop)
  useEffect(() => {
    if (user) {
      const savedModule = localStorage.getItem('crm_active_module');
      const defaultModule = getDefaultModule(user.role);
      
      console.log(`🔄 Usuário disponível (${user.role})`);
      console.log(`📦 Módulo salvo: ${savedModule || 'nenhum'}`);
      console.log(`🎯 Módulo padrão para role: ${defaultModule}`);
      
      // Verificar se o módulo salvo é válido para o role atual
      if (savedModule && isModuleValidForRole(savedModule, user.role)) {
        console.log(`✅ Módulo salvo '${savedModule}' é válido para role '${user.role}' - mantendo`);
        setActiveModule(savedModule);
      } else {
        if (savedModule) {
          console.log(`⚠️ Módulo salvo '${savedModule}' não é válido para role '${user.role}' - usando padrão`);
        }
        console.log(`🔄 Definindo módulo padrão: ${defaultModule}`);
        localStorage.setItem('crm_active_module', defaultModule);
        setActiveModule(defaultModule);
      }
    }
  }, [user?.id, user?.role]); // Dependências específicas para evitar loops

  // 🧹 LIMPEZA: Limpar módulo ativo no logout
  const handleLogout = async () => {
    try {
      logger.info('Iniciando processo de logout', 'AppDashboard');
      
      // Limpar módulo ativo do localStorage
      localStorage.removeItem('crm_active_module');
      console.log('🧹 Módulo ativo limpo do localStorage');
      
      await logout();
      logger.info('Logout concluído, redirecionando', 'AppDashboard');
      navigate('/login');
    } catch (error) {
      logger.error('Erro durante logout', 'AppDashboard', error);
      // Forçar redirecionamento mesmo em caso de erro
      window.location.href = '/login';
    }
  };

  // 🎉 CORREÇÃO CRÍTICA #3: Modal de boas-vindas melhorado para novos admins
  const WelcomeModal = () => {
    if (!showWelcomeMessage || !welcomeData) return null;

          return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden transform animate-fade-in-up">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-blue-600 px-6 py-8 text-white text-center relative">
            <button
              onClick={() => {
                console.log('🔄 [CRITICAL-FIX-3] Modal de boas-vindas fechado pelo usuário');
                setShowWelcomeMessage(false);
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold">🎉 Bem-vindo ao CRM!</h2>
            <p className="text-green-100 mt-2">Sua conta foi ativada com sucesso</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                {welcomeData.message}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Como administrador, você tem acesso a todas as funcionalidades do sistema.
              </p>
              
              {/* 🔧 CORREÇÃO CRÍTICA #3: Informações contextuais de ativação */}
              {(welcomeData.autoLoginAttempts || welcomeData.tokensStored || welcomeData.activationMethod) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">ℹ️ Detalhes da Ativação</h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    {welcomeData.activationMethod && (
                      <p>• Método: {welcomeData.activationMethod === 'event' ? 'Auto-detecção por evento' : 'Redirecionamento direto'}</p>
                    )}
                    {welcomeData.autoLoginAttempts && (
                      <p>• Login automático: Sucesso na {welcomeData.autoLoginAttempts}ª tentativa</p>
                    )}
                    {typeof welcomeData.tokensStored === 'boolean' && (
                      <p>• Tokens de segurança: {welcomeData.tokensStored ? '✅ Armazenados' : '⚠️ Não armazenados'}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 🔧 CORREÇÃO CRÍTICA #3: Quick Actions melhorados */}
            <div className="space-y-3 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">🚀 Primeiros passos recomendados:</h3>
              
              <button
                onClick={() => {
                  console.log('🎯 [CRITICAL-FIX-3] Quick action: Navegando para Vendedores');
                  setShowWelcomeMessage(false);
                  handleNavigateWithPersistence('Vendedores');
                }}
                className="w-full flex items-center space-x-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:shadow-md text-left group"
              >
                <Users className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium text-blue-900">Gerenciar Vendedores</p>
                  <p className="text-sm text-blue-700">Adicione e configure sua equipe de vendas</p>
                </div>
              </button>

              <button
                onClick={() => {
                  console.log('🎯 [CRITICAL-FIX-3] Quick action: Navegando para Pipeline');
                  setShowWelcomeMessage(false);
                  handleNavigateWithPersistence('Gestão de pipeline');
                }}
                className="w-full flex items-center space-x-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all duration-200 hover:shadow-md text-left group"
              >
                <BarChart3 className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium text-purple-900">Configurar Pipeline</p>
                  <p className="text-sm text-purple-700">Defina as etapas do seu processo de vendas</p>
                </div>
              </button>

              <button
                onClick={() => {
                  console.log('🎯 [CRITICAL-FIX-3] Quick action: Navegando para Integrações');
                  setShowWelcomeMessage(false);
                  handleNavigateWithPersistence('Integrações');
                }}
                className="w-full flex items-center space-x-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-all duration-200 hover:shadow-md text-left group"
              >
                <Settings className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium text-green-900">Configurar Integrações</p>
                  <p className="text-sm text-green-700">Conecte suas ferramentas favoritas</p>
                </div>
              </button>
            </div>

            {/* 🔧 CORREÇÃO CRÍTICA #3: Botão principal melhorado */}
            <button
              onClick={() => {
                console.log('✅ [CRITICAL-FIX-3] Modal de boas-vindas concluído - usuário pronto para usar o CRM');
                setShowWelcomeMessage(false);
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
            >
              ✨ Começar a usar o CRM
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
    <CRMLayout 
      user={user} 
      onLogout={handleLogout}
      activeModule={activeModule}
      onNavigate={handleNavigateWithPersistence}
    >
      <RoleBasedMenu 
        selectedItem={activeModule}
        userRole={user?.role || 'member'}
      />
    </CRMLayout>
      
      {/* Modal de boas-vindas */}
      <WelcomeModal />
    </>
  );
};

export default AppDashboard;

