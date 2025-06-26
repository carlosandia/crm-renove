import React, { useState } from 'react';
import CRMSidebar from './CRMSidebar';
import { NotificationCenter } from './NotificationCenter/NotificationCenter';

interface CRMLayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  activeModule?: string;
  onNavigate?: (module: string) => void;
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  activeModule = 'Relatório',
  onNavigate = () => {}
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Módulos que precisam de layout full-width sem padding
  const fullWidthModules = ['Pipeline'];
  const isFullWidth = fullWidthModules.includes(activeModule);

  // Função para receber o estado collapsed da sidebar
  const handleSidebarToggle = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  };

  return (
    <div className="h-screen bg-background flex w-full overflow-hidden">
      {/* Sidebar fixa */}
      <CRMSidebar 
        activeModule={activeModule}
        onNavigate={onNavigate}
        onToggle={handleSidebarToggle}
      />
      
      {/* Conteúdo principal com margem para não sobrepor o sidebar */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      } overflow-hidden`}>
        <main className="flex-1 bg-background relative overflow-hidden">
          {/* Sistema de notificações - Posicionamento absoluto no canto superior direito */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
            {/* NotificationCenter Enterprise */}
            <NotificationCenter className="order-2" />
          </div>
          
          {isFullWidth ? (
            <div className="h-full bg-background overflow-x-auto overflow-y-hidden">
              {children}
            </div>
          ) : (
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <div className="p-6">
                <div className="card-modern p-6 min-h-[calc(100vh-60px)]">
                  {children}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CRMLayout;
