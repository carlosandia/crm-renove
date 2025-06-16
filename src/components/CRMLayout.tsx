
import React, { useState } from 'react';
import CRMSidebar from './CRMSidebar';
import CRMHeader from './CRMHeader';
import '../styles/modern-crm.css';
import '../styles/modern-theme.css';

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <CRMSidebar 
        activeModule={activeModule}
        onNavigate={onNavigate}
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        <CRMHeader 
          user={user} 
          onLogout={onLogout}
          showSearch={!isFullWidth}
        />
        
        <main className="flex-1 overflow-hidden">
          {isFullWidth ? (
            <div className="h-full">
              {children}
            </div>
          ) : (
            <div className="p-6 h-full overflow-y-auto">
              <div className="fade-in">
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
