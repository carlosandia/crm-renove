
import React from 'react';
import ModernDashboard from './ModernDashboard';
import ClientesModule from './ClientesModule';
import VendedoresModule from './VendedoresModule';
import PerformanceModule from './PerformanceModule';
import PipelineModule from './Pipeline/PipelineModule';
import LeadsModule from './LeadsModule';

interface AppContentProps {
  activeModule: string;
  userRole: string;
}

const AppContent: React.FC<AppContentProps> = ({ activeModule, userRole }) => {
  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <ModernDashboard userRole={userRole} />;
      case 'pipelines':
        return <PipelineModule />;
      case 'leads':
        return <LeadsModule />;
      case 'clientes':
        return <ClientesModule />;
      case 'vendedores':
        return userRole === 'admin' ? <VendedoresModule /> : <div>Acesso negado</div>;
      case 'performance':
        return <PerformanceModule />;
      default:
        return <ModernDashboard userRole={userRole} />;
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      {renderContent()}
    </div>
  );
};

export default AppContent;
