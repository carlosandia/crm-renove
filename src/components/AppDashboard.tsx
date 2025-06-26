import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RoleBasedMenu from './RoleBasedMenu';
import CRMLayout from './CRMLayout';
import { logger } from '../utils/logger';

const AppDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
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
  );
};

export default AppDashboard;

