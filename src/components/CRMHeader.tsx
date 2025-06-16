import React from 'react';

interface CRMHeaderProps {
  user: any;
  onLogout: () => void;
  onMenuToggle: () => void;
}

const CRMHeader: React.FC<CRMHeaderProps> = ({ user, onLogout, onMenuToggle }) => {
  return (
    <header className="crm-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          ☰
        </button>
        <div className="breadcrumb">
          <span>Dashboard</span>
        </div>
      </div>

      <div className="header-center">
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Pesquisar leads, clientes..." 
            className="search-input"
          />
          <button className="search-btn">🔍</button>
        </div>
      </div>

      <div className="header-right">
        <div className="notifications">
          <button className="notification-btn">
            🔔
            <span className="notification-badge">3</span>
          </button>
        </div>

        <div className="user-menu">
          <div className="user-info">
            <span className="user-name">
              {user?.first_name} {user?.last_name}
            </span>
            <span className="user-role">{user?.role}</span>
          </div>
          <div className="user-avatar">
            {user?.first_name?.charAt(0) || 'U'}
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Sair
          </button>
        </div>
      </div>
    </header>
  );
};

export default CRMHeader; 