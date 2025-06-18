
import React, { useState } from 'react';
import CRMSidebar from './CRMSidebar';
import CRMHeader from './CRMHeader';

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
  
  // Todos os módulos agora têm header contextual
  const needsHeader = true;

  // Função para toggle da sidebar
  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <CRMSidebar 
        isCollapsed={sidebarCollapsed}
        activeModule={activeModule}
        onNavigate={onNavigate}
        onToggle={handleSidebarToggle}
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'ml-[70px]' : 'ml-[250px]'
      }`}>
        {/* Header contextual unificado para todos os módulos */}
        {needsHeader && (
          <CRMHeader 
            user={user} 
            activeModule={activeModule}
            onNavigate={onNavigate}
            onLogout={onLogout}
          />
        )}
        
        <main className="flex-1 bg-background">
          {isFullWidth ? (
            <div className={`${needsHeader ? 'h-[calc(100vh-80px)]' : 'h-screen'} bg-background overflow-hidden`}>
              {children}
            </div>
          ) : (
            <div className="flex flex-col w-full p-6">
              <div className="card-modern p-6 min-h-[calc(100vh-140px)] animate-fade-in">
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
