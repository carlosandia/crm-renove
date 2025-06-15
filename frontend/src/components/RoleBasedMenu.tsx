
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart3, 
  User, 
  MessageSquare, 
  Users, 
  Settings, 
  Target, 
  UsersRound, 
  GitBranch, 
  FileText, 
  TrendingUp, 
  Eye, 
  UserPlus, 
  Calendar, 
  Link 
} from 'lucide-react';
import ClientesModule from './ClientesModule';
import VendedoresModule from './VendedoresModule';
import PipelineModule from './PipelineModule';
import PipelineViewModule from './PipelineViewModule';
import './PipelineViewModule.css';

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

  const getMenuIcon = (item: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'Relatório': <BarChart3 size={16} />,
      'Meu Perfil': <User size={16} />,
      'Comentários': <MessageSquare size={16} />,
      'Clientes': <Users size={16} />,
      'Integrações': <Settings size={16} />,
      'Meta': <Target size={16} />,
      'Vendedores': <UsersRound size={16} />,
      'Criador de pipeline': <GitBranch size={16} />,
      'Criador de formulários': <FileText size={16} />,
      'Acompanhamento': <TrendingUp size={16} />,
      'Leads': <UserPlus size={16} />,
      'Pipeline': <Eye size={16} />,
      'Calendário Público': <Calendar size={16} />,
      'Encurtador de URL': <Link size={16} />
    };
    
    return iconMap[item] || <Settings size={16} />;
  };

  const menuItems = getMenuItems();

  const renderContent = () => {
    if (activeMenu === 'Clientes' && user.role === 'super_admin') {
      return <ClientesModule />;
    }

    if (activeMenu === 'Vendedores' && user.role === 'admin') {
      return <VendedoresModule />;
    }

    if (activeMenu === 'Criador de pipeline' && user.role === 'admin') {
      return <PipelineModule />;
    }

    if (activeMenu === 'Pipeline' && user.role === 'member') {
      return <PipelineViewModule />;
    }

    return (
      <div className="menu-content">
        <h4>{getMenuIcon(activeMenu)} {activeMenu}</h4>
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
            {getMenuIcon(item)}
            <span style={{ marginLeft: '8px' }}>{item}</span>
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  );
};

export default RoleBasedMenu;
