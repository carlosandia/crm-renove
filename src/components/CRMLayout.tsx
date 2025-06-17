import React, { useState } from 'react';
import CRMSidebar from './CRMSidebar';

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
    <div className="min-h-screen bg-background flex w-full">
      <CRMSidebar 
        activeModule={activeModule}
        onNavigate={onNavigate}
        onToggle={handleSidebarToggle}
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>        
        <main className="flex-1 bg-background">
          {isFullWidth ? (
            <div className="h-screen bg-background">
              {children}
            </div>
          ) : (
            <div className="flex flex-col w-full p-6">
              <div className="card-modern p-6 min-h-[calc(100vh-60px)] animate-fade-in">
                {children}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CRMLayout;
