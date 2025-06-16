
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
      return [
        { id: 'Relatório', label: 'Relatório', icon: '📊' },
        { id: 'Meu Perfil', label: 'Meu Perfil', icon: '👤' },
        { id: 'Comentários', label: 'Comentários', icon: '💬' },
        { id: 'Clientes', label: 'Clientes', icon: '👥' },
        { id: 'Integrações', label: 'Integrações', icon: '🔗' }
      ];
    }
    
    if (user.role === 'admin') {
      return [
        { id: 'Meta', label: 'Meta', icon: '🎯' },
        { id: 'Vendedores', label: 'Vendedores', icon: '💼' },
        { id: 'Criador de pipeline', label: 'Criador de pipeline', icon: '🔧' },
        { id: 'Criador de formulários', label: 'Criador de formulários', icon: '📝' },
        { id: 'Relatório', label: 'Relatório', icon: '📊' },
        { id: 'Acompanhamento', label: 'Acompanhamento', icon: '👀' },
        { id: 'Leads', label: 'Leads', icon: '🎪' },
        { id: 'Meu Perfil', label: 'Meu Perfil', icon: '👤' }
      ];
    }
    
    if (user.role === 'member') {
      return [
        { id: 'Relatório', label: 'Relatório', icon: '📊' },
        { id: 'Pipeline', label: 'Pipeline', icon: '🔄' },
        { id: 'Acompanhamento', label: 'Acompanhamento', icon: '👀' },
        { id: 'Leads', label: 'Leads', icon: '🎪' },
        { id: 'Meu Perfil', label: 'Meu Perfil', icon: '👤' },
        { id: 'Calendário Público', label: 'Calendário Público', icon: '📅' },
        { id: 'Encurtador de URL', label: 'Encurtador de URL', icon: '🔗' }
      ];
    }
    
    return [{ id: 'Meu Perfil', label: 'Meu Perfil', icon: '👤' }];
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
      <div className="modern-card p-8">
        <div className="flex items-center space-x-3 mb-6">
          <span className="text-2xl">{menuItems.find(item => item.id === activeMenu)?.icon}</span>
          <h2 className="text-2xl font-semibold text-gray-900">{activeMenu}</h2>
        </div>
        
        <div className="text-gray-600 mb-6">
          <p>Conteúdo da seção "{activeMenu}" para usuário {user.role}</p>
        </div>
        
        {activeMenu === 'Meu Perfil' && (
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                <p className="text-gray-900 font-medium">{user.first_name} {user.last_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900 font-medium">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Função</label>
                <span className={`modern-badge ${
                  user.role === 'super_admin' ? 'modern-badge-error' :
                  user.role === 'admin' ? 'modern-badge-success' :
                  user.role === 'member' ? 'modern-badge-primary' : 'modern-badge-warning'
                }`}>
                  {user.role === 'super_admin' ? 'Super Admin' : 
                   user.role === 'admin' ? 'Admin' : 
                   user.role === 'member' ? 'Member' : user.role}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tenant ID</label>
                <p className="text-gray-900 font-medium">{user.tenant_id}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Menu Header Card */}
      <div className="modern-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Menu - {user.role.replace('_', ' ').toUpperCase()}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Selecione uma opção para navegar pelo sistema
            </p>
          </div>
        </div>
      </div>

      {/* Menu Navigation */}
      <div className="modern-card p-2">
        <div className="flex flex-wrap gap-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeMenu === item.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="slide-in-right">
        {renderContent()}
      </div>
    </div>
  );
};

export default RoleBasedMenu;
