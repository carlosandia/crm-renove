
import React, { useState } from 'react';
import CRMSidebar from './CRMSidebar';
import CRMHeader from './CRMHeader';
import '../styles/modern-crm.css';

interface CRMLayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="crm-layout">
      <CRMSidebar 
        user={user} 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className={`crm-main ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        <CRMHeader 
          user={user} 
          onLogout={onLogout}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="crm-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CRMLayout;
