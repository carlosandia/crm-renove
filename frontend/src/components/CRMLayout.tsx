
import React from 'react';
import CRMHeader from './CRMHeader';
import '../styles/modern-crm.css';

interface CRMLayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="crm-layout-no-sidebar">
      <CRMHeader 
        user={user} 
        onLogout={onLogout}
      />
      <main className="crm-content-full">
        {children}
      </main>
    </div>
  );
};

export default CRMLayout;
