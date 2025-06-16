import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RoleBasedMenu from './RoleBasedMenu';
import CRMLayout from './CRMLayout';
import { logger } from '../lib/logger';

const AppDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Função de logout personalizada com redirecionamento
  const handleLogout = async () => {
    try {
      logger.info('Iniciando processo de logout...');
      await logout();
      logger.success('Logout concluído, redirecionando...');
      navigate('/login');
    } catch (error) {
      logger.error('Erro durante logout:', error);
      // Forçar redirecionamento mesmo em caso de erro
      window.location.href = '/login';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <CRMLayout user={user} onLogout={handleLogout}>
      <RoleBasedMenu />
    </CRMLayout>
  );
};

export default AppDashboard;

