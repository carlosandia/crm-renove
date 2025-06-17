import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ClientesModule from './ClientesModule';
import VendedoresModule from './VendedoresModule';
import PipelineModule from './PipelineModule';
import PipelineViewModule from './PipelineViewModule';
import LeadsModule from './LeadsModule';
import './PipelineViewModule.css';

interface RoleBasedMenuProps {
  activeModule?: string;
  onNavigate?: (module: string) => void;
}

const RoleBasedMenu: React.FC<RoleBasedMenuProps> = ({ 
  activeModule = 'Relatório',
  onNavigate = () => {}
}) => {
  const { user } = useAuth();

  if (!user) return null;

  const renderContent = () => {
    if (activeModule === 'Clientes' && user.role === 'super_admin') {
      return <ClientesModule />;
    }

    if (activeModule === 'Vendedores' && user.role === 'admin') {
      return <VendedoresModule />;
    }

    if (activeModule === 'Criador de pipeline' && user.role === 'admin') {
      return <PipelineModule />;
    }

    if (activeModule === 'Pipeline' && user.role === 'member') {
      return <PipelineViewModule />;
    }

    // Novo módulo de Leads - acessível para admin e member
    if (activeModule === 'Leads' && (user.role === 'admin' || user.role === 'member')) {
      return <LeadsModule />;
    }

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📊</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{activeModule}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Módulo {activeModule} para usuário {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Módulo {activeModule}
            </h3>
            <p className="text-gray-500 mb-6">
              Conteúdo da seção "{activeModule}" para usuário {user.role}
            </p>
            
            {activeModule === 'Meu Perfil' && (
              <div className="max-w-md mx-auto">
                <div className="bg-green-50 rounded-xl p-6 text-left border border-green-200">
                  <h4 className="font-medium text-gray-900 mb-4">Informações do Perfil</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nome Completo</label>
                      <p className="text-gray-900 font-medium">{user.first_name} {user.last_name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                      <p className="text-gray-900 font-medium">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Função</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'super_admin' ? 'bg-green-100 text-green-800' :
                        user.role === 'admin' ? 'bg-green-100 text-green-800' :
                        user.role === 'member' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'super_admin' ? 'Super Admin' : 
                         user.role === 'admin' ? 'Admin' : 
                         user.role === 'member' ? 'Vendedor' : user.role}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tenant ID</label>
                      <p className="text-gray-900 font-medium font-mono text-sm">{user.tenant_id}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return renderContent();
};

export default RoleBasedMenu;
