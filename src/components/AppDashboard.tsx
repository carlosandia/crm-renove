import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Customer, User } from '../types/User';
import CRMLayout from './CRMLayout';
import ModernDashboard from './ModernDashboard';
import PipelineModule from './PipelineModule';
import ClientesModule from './ClientesModule';
import VendedoresModule from './VendedoresModule';
import PerformanceModule from './PerformanceModule';

const AppDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState('dashboard');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carregar clientes
        const customersResponse = await fetch('http://localhost:5001/api/customers');
        if (customersResponse.ok) {
          const customersData = await customersResponse.json();
          setCustomers(customersData.customers || []);
        }

        // Carregar usuários (apenas para admin e super_admin)
        if (user && (user.role === 'admin' || user.role === 'super_admin')) {
          const usersResponse = await fetch('http://localhost:5001/api/users');
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            setUsers(usersData.users || []);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Listener para navegação entre módulos
  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      setActiveModule(event.detail.module);
    };

    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('navigate', handleNavigate as EventListener);
    };
  }, []);

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <ModernDashboard />;
      case 'pipeline':
        return <PipelineModule />;
      case 'clientes':
        return <ClientesModule />;
      case 'vendedores':
        return <VendedoresModule />;
      case 'performance':
        return <PerformanceModule />;
      default:
        return <ModernDashboard />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Carregando...</h2>
      </div>
    );
  }

  return (
    <CRMLayout user={user} onLogout={logout}>
      {renderActiveModule()}
    </CRMLayout>
  );
};

export default AppDashboard;
