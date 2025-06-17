
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
  
  // Módulos que precisam de layout full-width sem padding e sem header
  const fullWidthModules = ['Pipeline'];
  const isFullWidth = fullWidthModules.includes(activeModule);

  return (
    <div className="min-h-screen bg-gray-50 flex w-full">
      <CRMSidebar 
        activeModule={activeModule}
        onNavigate={onNavigate}
      />
      
      <div className="flex-1 flex flex-col ml-64">
        {/* Header moderno com sombra sutil */}
        {!isFullWidth && (
          <CRMHeader 
            user={user} 
            onLogout={onLogout}
            showSearch={true}
          />
        )}
        
        <main className="flex-1 bg-gray-50">
          {isFullWidth ? (
            <div className="h-screen bg-white">
              {children}
            </div>
          ) : (
            <div className="flex flex-col w-full px-6 pt-6 pb-10">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CRMLayout;
