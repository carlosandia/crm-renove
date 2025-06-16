import React from 'react';

interface CRMSidebarProps {
  user: any;
  isOpen: boolean;
  onToggle: () => void;
}

const CRMSidebar: React.FC<CRMSidebarProps> = ({ user, isOpen, onToggle }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'pipeline', label: 'Pipeline', icon: '🔄' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'vendedores', label: 'Vendedores', icon: '💼' },
    { id: 'performance', label: 'Performance', icon: '📈' },
  ];

  const handleMenuClick = (moduleId: string) => {
    // Implementar navegação entre módulos
    const event = new CustomEvent('navigate', { detail: { module: moduleId } });
    window.dispatchEvent(event);
  };

  return (
    <aside className={`crm-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo">
          <h2>CRM System</h2>
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
            <span className="user-role">{user?.role}</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className="nav-item"
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