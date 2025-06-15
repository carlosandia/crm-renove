
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Customer, User } from '../types/User';
import RoleBasedMenu from './RoleBasedMenu';

const AppDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="app-dashboard">
      <header className="app-header">
        <div className="header-content">
          <h1>🚀 CRM Sistema</h1>
          <div className="user-info">
            <span>Olá, {user?.first_name || user?.email}</span>
            <button onClick={logout} className="logout-button">Sair</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="stats-section">
          <div className="stat-card">
            <h3>👥 Clientes</h3>
            <p className="stat-number">{customers.length}</p>
          </div>
          {user && (user.role === 'admin' || user.role === 'super_admin') && (
            <div className="stat-card">
              <h3>👤 Usuários</h3>
              <p className="stat-number">{users.length}</p>
            </div>
          )}
          <div className="stat-card">
            <h3>🏢 Tenant</h3>
            <p className="stat-text">{user?.tenant_id}</p>
          </div>
        </div>

        <RoleBasedMenu />
      </div>
    </div>
  );
};

export default AppDashboard;
