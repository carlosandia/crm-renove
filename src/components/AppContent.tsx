import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from './LoginForm';
import AppDashboard from './AppDashboard';

const AppContent: React.FC = React.memo(() => {
  const { user, loading } = useAuth();

  const loadingComponent = useMemo(() => (
    <div className="loading-container">
      <h2>Carregando...</h2>
    </div>
  ), []);

  if (loading) {
    return loadingComponent;
  }

  // ✅ Redirecionamento único: se não logado, mostra login; se logado, vai para /app
  return (
    <div className="App">
      {!user ? <LoginForm /> : <AppDashboard />}
    </div>
  );
});

AppContent.displayName = 'AppContent';

export default AppContent;
