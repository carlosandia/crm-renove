
import React from 'react';

interface CRMHeaderProps {
  user: any;
  onLogout: () => void;
}

const CRMHeader: React.FC<CRMHeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="crm-header">
      <div className="header-left">
        <div className="breadcrumb">
          <span>Dashboard CRM</span>
        </div>
      </div>

      <div className="header-center hidden md:block">
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Pesquisar leads, clientes, vendedores..." 
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

        <div className="user-menu flex items-center gap-4">
          <div className="user-info text-right hidden sm:block">
            <div className="user-name text-sm font-semibold text-gray-800">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="user-role text-xs text-gray-500 capitalize">
              {user?.role?.replace('_', ' ')}
            </div>
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
