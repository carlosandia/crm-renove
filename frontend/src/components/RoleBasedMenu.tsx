
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ClientesModule from './ClientesModule';

const RoleBasedMenu: React.FC = () => {
  const { user } = useAuth();
  const [activeMenu, setActiveMenu] = useState('Relatório');

  if (!user) return null;

  const getMenuItems = () => {
    if (user.role === 'super_admin') {
      return ['Relatório', 'Meu Perfil', 'Comentários', 'Clientes', 'Integrações'];
    }
    
    if (user.role === 'admin') {
      return ['Meta', 'Vendedores', 'Criador de pipeline', 'Criador de formulários', 'Relatório', 'Acompanhamento', 'Leads', 'Meu Perfil'];
    }
    
    if (user.role === 'member') {
      return ['Relatório', 'Pipeline', 'Acompanhamento', 'Leads', 'Meu Perfil', 'Calendário Público', 'Encurtador de URL'];
    }
    
    return ['Meu Perfil'];
  };

  const menuItems = getMenuItems();

  const renderContent = () => {
    if (activeMenu === 'Clientes' && user.role === 'super_admin') {
      return <ClientesModule />;
    }

    return (
      <div className="menu-content">
        <h4>📄 {activeMenu}</h4>
        <p>Conteúdo da seção "{activeMenu}" para usuário {user.role}</p>
        {activeMenu === 'Meu Perfil' && (
          <div className="profile-info">
            <p><strong>Nome:</strong> {user.first_name} {user.last_name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> <span className={`role-badge role-${user.role}`}>{user.role}</span></p>
            <p><strong>Tenant:</strong> {user.tenant_id}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="role-based-menu">
      <div className="menu-header">
        <h3>Menu - {user.role.replace('_', ' ').toUpperCase()}</h3>
      </div>
      <div className="menu-items">
        {menuItems.map((item) => (
          <button
            key={item}
            onClick={() => setActiveMenu(item)}
            className={`menu-item ${activeMenu === item ? 'active' : ''}`}
          >
            {item}
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  );
};

export default RoleBasedMenu;
