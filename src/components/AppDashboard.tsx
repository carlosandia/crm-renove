import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Customer, User } from '../types/User';
import CRMLayout from './CRMLayout';
import ModernDashboard from './ModernDashboard';
import PipelineModule from './PipelineModule';
import PipelineViewModule from './PipelineViewModule';
import ClientesModule from './ClientesModule';
import VendedoresModule from './VendedoresModule';
import PerformanceModule from './PerformanceModule';
import { logger } from '../lib/logger';

const AppDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState('relatorio');

  // Função de logout personalizada com redirecionamento
  const handleLogout = async () => {
    try {
      logger.info('Iniciando processo de logout...');
      await logout();
      logger.success('Logout concluído, redirecionando...');
      router.push('/');
    } catch (error) {
      logger.error('Erro durante logout:', error);
      // Forçar redirecionamento mesmo em caso de erro
      window.location.href = '/';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Log da role do usuário para debug
        if (user) {
          logger.debug('Usuário logado', {
            role: user.role,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email
          });
        }

        // Dados mock para clientes (removendo chamada para API externa)
        const mockCustomers: Customer[] = [
          { 
            id: '1', 
            name: 'Cliente Exemplo 1', 
            email: 'cliente1@exemplo.com',
            tenant_id: user?.tenant_id || 'default',
            created_at: new Date().toISOString()
          },
          { 
            id: '2', 
            name: 'Cliente Exemplo 2', 
            email: 'cliente2@exemplo.com',
            tenant_id: user?.tenant_id || 'default',
            created_at: new Date().toISOString()
          }
        ];
        setCustomers(mockCustomers);

        // Dados mock para usuários (apenas para admin e super_admin)
        if (user && (user.role === 'admin' || user.role === 'super_admin')) {
          const mockUsers: User[] = [
            { 
              id: '1', 
              first_name: 'Admin', 
              last_name: 'User', 
              email: 'admin@crm.com', 
              role: 'admin',
              tenant_id: user.tenant_id,
              is_active: true,
              created_at: new Date().toISOString()
            },
            { 
              id: '2', 
              first_name: 'Member', 
              last_name: 'User', 
              email: 'member@crm.com', 
              role: 'member',
              tenant_id: user.tenant_id,
              is_active: true,
              created_at: new Date().toISOString()
            }
          ];
          setUsers(mockUsers);
        }

        logger.success('Dados carregados com sucesso (usando dados mock)');
      } catch (error) {
        logger.error('Erro ao carregar dados', error);
        // Em caso de erro, definir arrays vazios para evitar crashes
        setCustomers([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Listener para navegação entre módulos
  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      setActiveModule(event.detail.module);
    };

    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('navigate', handleNavigate as EventListener);
    };
  }, []);

  const renderActiveModule = () => {
    if (!user) return <ModernDashboard />;

    // Verificar permissões baseadas na role do usuário
    const hasPermission = (moduleId: string): boolean => {
      if (user.role === 'super_admin') {
        const allowedModules = ['relatorio', 'perfil', 'comentarios', 'clientes', 'integracoes'];
        return allowedModules.includes(moduleId);
      }
      
      if (user.role === 'admin') {
        const allowedModules = ['meta', 'vendedores', 'pipeline-creator', 'form-creator', 'relatorio', 'acompanhamento', 'leads', 'perfil'];
        return allowedModules.includes(moduleId);
      }
      
      if (user.role === 'member') {
        const allowedModules = ['relatorio', 'pipeline', 'acompanhamento', 'leads', 'perfil', 'calendario', 'encurtador'];
        return allowedModules.includes(moduleId);
      }
      
      return false;
    };

    // Verificar se o usuário tem permissão para acessar o módulo
    if (!hasPermission(activeModule)) {
      return (
        <div className="access-denied">
          <h3>🚫 Acesso Negado</h3>
          <p>Você não tem permissão para acessar este módulo.</p>
          <p>Seu nível de acesso: <strong>{user.role}</strong></p>
        </div>
      );
    }

    switch (activeModule) {
      case 'relatorio':
        return (
          <div className="module-content">
            <h2>📊 Relatório</h2>
            <p>Módulo de relatórios para {user.role}</p>
          </div>
        );
      case 'perfil':
        return (
          <div className="module-content">
            <h2>👤 Meu Perfil</h2>
            <div className="profile-info">
              <p><strong>Nome:</strong> {user.first_name} {user.last_name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p><strong>Tenant:</strong> {user.tenant_id}</p>
            </div>
          </div>
        );
      
      // Módulos do Super Admin
      case 'comentarios':
        if (user.role === 'super_admin') {
          return (
            <div className="module-content">
              <h2>💬 Comentários</h2>
              <p>Gerenciamento de comentários do sistema</p>
            </div>
          );
        }
        break;
      case 'clientes':
        if (user.role === 'super_admin') {
          return <ClientesModule />;
        }
        break;
      case 'integracoes':
        if (user.role === 'super_admin') {
          return (
            <div className="module-content">
              <h2>🔗 Integrações</h2>
              <p>Gerenciamento de integrações do sistema</p>
            </div>
          );
        }
        break;

      // Módulos do Admin
      case 'meta':
        if (user.role === 'admin') {
          return (
            <div className="module-content">
              <h2>🎯 Meta</h2>
              <p>Definição e acompanhamento de metas</p>
            </div>
          );
        }
        break;
      case 'vendedores':
        if (user.role === 'admin') {
          return <VendedoresModule />;
        }
        break;
      case 'pipeline-creator':
        if (user.role === 'admin') {
          return <PipelineModule />;
        }
        break;
      case 'form-creator':
        if (user.role === 'admin') {
          return (
            <div className="module-content">
              <h2>📝 Criador de Formulários</h2>
              <p>Ferramenta para criar e gerenciar formulários</p>
            </div>
          );
        }
        break;
      case 'acompanhamento':
        if (user.role === 'admin' || user.role === 'member') {
          return (
            <div className="module-content">
              <h2>👀 Acompanhamento</h2>
              <p>Acompanhamento de leads e oportunidades</p>
            </div>
          );
        }
        break;
      case 'leads':
        if (user.role === 'admin' || user.role === 'member') {
          return (
            <div className="module-content">
              <h2>🎪 Leads</h2>
              <p>Gerenciamento de leads</p>
            </div>
          );
        }
        break;

      // Módulos do Member
      case 'pipeline':
        if (user.role === 'member') {
          return <PipelineViewModule />;
        }
        break;
      case 'calendario':
        if (user.role === 'member') {
          return (
            <div className="module-content">
              <h2>📅 Calendário Público</h2>
              <p>Calendário público para agendamentos</p>
            </div>
          );
        }
        break;
      case 'encurtador':
        if (user.role === 'member') {
          return (
            <div className="module-content">
              <h2>🔗 Encurtador de URL</h2>
              <p>Ferramenta para encurtar URLs</p>
            </div>
          );
        }
        break;

      // Módulos legados (compatibilidade)
      case 'dashboard':
        return <ModernDashboard />;
      case 'performance':
        return <PerformanceModule />;
      
      default:
        return <ModernDashboard />;
    }

    // Fallback caso não encontre o módulo
    return <ModernDashboard />;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Carregando...</h2>
      </div>
    );
  }

  return (
    <CRMLayout user={user} onLogout={handleLogout}>
      {renderActiveModule()}
    </CRMLayout>
  );
};

export default AppDashboard;
