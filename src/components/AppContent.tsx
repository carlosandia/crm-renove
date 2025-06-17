
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from './LoginForm';
import AppDashboard from './AppDashboard';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Carregando...</h2>
      </div>
    );
  }

  // ✅ Redirecionamento único: se não logado, mostra login; se logado, vai para /app
  return (
    <div className="App">
      {!user ? <LoginForm /> : <AppDashboard />}
    </div>
  );
};

export default AppContent;
