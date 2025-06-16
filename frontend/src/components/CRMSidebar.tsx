import React, { useState, useEffect } from 'react';

interface CRMSidebarProps {
  user: any;
  isOpen: boolean;
  onToggle: () => void;
}

const CRMSidebar: React.FC<CRMSidebarProps> = ({ user, isOpen, onToggle }) => {
  const [activeModule, setActiveModule] = useState('dashboard');

  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      setActiveModule(event.detail.module);
    };

    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('navigate', handleNavigate as EventListener);
    };
  }, []);

  // Função para obter itens de menu baseado na role do usuário
  const getMenuItems = () => {
    if (!user) return [];

    if (user.role === 'super_admin') {
      return [
        { id: 'relatorio', label: 'Relatório', icon: '📊' },
        { id: 'perfil', label: 'Meu Perfil', icon: '👤' },
        { id: 'comentarios', label: 'Comentários', icon: '💬' },
        { id: 'clientes', label: 'Clientes', icon: '👥' },
        { id: 'integracoes', label: 'Integrações', icon: '🔗' },
      ];
    }
    
    if (user.role === 'admin') {
      return [
        { id: 'meta', label: 'Meta', icon: '🎯' },
        { id: 'vendedores', label: 'Vendedores', icon: '💼' },
        { id: 'pipeline-creator', label: 'Criador de pipeline', icon: '🔧' },
        { id: 'form-creator', label: 'Criador de formulários', icon: '📝' },
        { id: 'relatorio', label: 'Relatório', icon: '📊' },
        { id: 'acompanhamento', label: 'Acompanhamento', icon: '👀' },
        { id: 'leads', label: 'Leads', icon: '🎪' },
        { id: 'perfil', label: 'Meu Perfil', icon: '👤' },
      ];
    }
    
    if (user.role === 'member') {
      return [
        { id: 'relatorio', label: 'Relatório', icon: '📊' },
        { id: 'pipeline', label: 'Pipeline', icon: '🔄' },
        { id: 'acompanhamento', label: 'Acompanhamento', icon: '👀' },
        { id: 'leads', label: 'Leads', icon: '🎪' },
        { id: 'perfil', label: 'Meu Perfil', icon: '👤' },
        { id: 'calendario', label: 'Calendário Público', icon: '📅' },
        { id: 'encurtador', label: 'Encurtador de URL', icon: '🔗' },
      ];
    }
    
    // Fallback para usuários sem role definida ou role desconhecida
    return [
      { id: 'perfil', label: 'Meu Perfil', icon: '👤' },
    ];
  };

  const menuItems = getMenuItems();

  const handleMenuClick = (moduleId: string) => {
    setActiveModule(moduleId);
    const event = new CustomEvent('navigate', { detail: { module: moduleId } });
    window.dispatchEvent(event);
  };

  return (
    <aside className={`crm-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo">
          {isOpen && <h2>CRM System</h2>}
          {!isOpen && <h2>CRM</h2>}
        </div>
        <button className="toggle-btn" onClick={onToggle}>
          {isOpen ? '←' : '→'}
        </button>
      </div>
      
      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.first_name?.charAt(0) || 'U'}
        </div>
        {isOpen && (
          <div className="user-info">
            <span className="user-name">
              {user?.first_name} {user?.last_name}
            </span>
            <span className="user-role">
              {user?.role === 'super_admin' ? 'Super Admin' : 
               user?.role === 'admin' ? 'Admin' : 
               user?.role === 'member' ? 'Member' : 
               user?.role || 'Usuário'}
            </span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeModule === item.id ? 'active' : ''}`}
            onClick={() => handleMenuClick(item.id)}
            title={!isOpen ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {isOpen && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default CRMSidebar;
