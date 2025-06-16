
import React from 'react';
import CRMHeader from './CRMHeader';
import '../styles/modern-crm.css';
import '../styles/modern-theme.css';

interface CRMLayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CRMHeader 
        user={user} 
        onLogout={onLogout}
      />
      <main className="pt-16">
        <div className="modern-container py-6">
          <div className="fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CRMLayout;
