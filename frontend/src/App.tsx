import React, { useState, useEffect } from 'react';
import './App.css';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tenant_id: string;
  created_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  tenant_id: string;
  is_active: boolean;
  created_at: string;
}

function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<string>('Verificando...');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'users'>('dashboard');

  // Verificar status do backend
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:5001/health');
        if (response.ok) {
          const data = await response.json();
          setBackendStatus(`✅ Backend Online - ${data.status}`);
        } else {
          setBackendStatus('❌ Backend Offline');
        }
      } catch (error) {
        setBackendStatus('❌ Backend não encontrado - Inicie o servidor backend');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000); // Verificar a cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simular usuário logado (em produção viria da autenticação)
        const mockUser: User = {
          id: '1',
          name: 'Admin User',
          email: 'admin@crm.com',
          role: 'admin',
          tenant_id: 'tenant-1',
          is_active: true,
          created_at: new Date().toISOString()
        };
        setCurrentUser(mockUser);

        // Carregar clientes
        const customersResponse = await fetch('http://localhost:5001/api/customers');
        if (customersResponse.ok) {
          const customersData = await customersResponse.json();
          setCustomers(customersData.customers || []);
        }

        // Carregar usuários (apenas para admin e manager)
        if (mockUser.role === 'admin' || mockUser.role === 'manager') {
          const usersResponse = await fetch('http://localhost:5001/api/users');
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            setUsers(usersData.users || []);
          }
        }

        setError(null);
      } catch (error) {
        setError('Erro de conexão com o backend');
        setCustomers([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const testBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/test-db');
      const data = await response.json();
      alert(`Teste de conexão: ${data.message}`);
    } catch (error) {
      alert('Erro ao testar conexão com o backend');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 CRM Sistema</h1>
        <p>Sistema de Gerenciamento de Relacionamento com Cliente</p>
        
        <div className="status-bar">
          <div className="status-item">
            <strong>Frontend:</strong> ✅ React + TypeScript Online
          </div>
          <div className="status-item">
            <strong>Backend:</strong> {backendStatus}
          </div>
        </div>

        {currentUser && (
          <div className="user-info">
            <h3>👤 Usuário Logado</h3>
            <p><strong>Nome:</strong> {currentUser.name}</p>
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p><strong>Role:</strong> <span className={`role-badge role-${currentUser.role}`}>{currentUser.role}</span></p>
            <p><strong>Tenant:</strong> {currentUser.tenant_id}</p>
          </div>
        )}

        <div className="navigation">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('customers')} 
            className={`nav-button ${activeTab === 'customers' ? 'active' : ''}`}
          >
            👥 Clientes
          </button>
          {/* ✅ Renderização condicional - apenas admin e manager veem usuários */}
          {currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <button 
              onClick={() => setActiveTab('users')} 
              className={`nav-button ${activeTab === 'users' ? 'active' : ''}`}
            >
              👤 Usuários
            </button>
          )}
        </div>

        <div className="actions">
          <button onClick={testBackendConnection} className="test-button">
            🔍 Testar Conexão Backend
          </button>
        </div>

        {/* ✅ Renderização condicional baseada na aba ativa */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-section">
            <h2>📊 Dashboard</h2>
            <div className="dashboard-stats">
              <div className="stat-card">
                <h3>👥 Total de Clientes</h3>
                <p className="stat-number">{customers.length}</p>
              </div>
              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                <div className="stat-card">
                  <h3>👤 Total de Usuários</h3>
                  <p className="stat-number">{users.length}</p>
                </div>
              )}
              <div className="stat-card">
                <h3>🏢 Tenant Atual</h3>
                <p className="stat-text">{currentUser?.tenant_id || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="customers-section">
            <h2>👥 Clientes</h2>
            
            {loading && <p>Carregando clientes...</p>}
            
            {error && (
              <div className="error-message">
                <p>❌ {error}</p>
                <p>💡 Certifique-se de que o backend está rodando na porta 5001</p>
              </div>
            )}
            
            {!loading && !error && customers.length === 0 && (
              <div className="empty-state">
                <p>📝 Nenhum cliente encontrado</p>
                <p>O banco de dados está vazio ou a tabela 'customers' não existe</p>
              </div>
            )}
            
            {customers.length > 0 && (
              <div className="customers-list">
                <p>Total de clientes: {customers.length}</p>
                {customers.map((customer) => (
                  <div key={customer.id} className="customer-card">
                    <h3>{customer.name}</h3>
                    <p>📧 {customer.email}</p>
                    {customer.phone && <p>📞 {customer.phone}</p>}
                    {customer.company && <p>🏢 {customer.company}</p>}
                    <small>Criado em: {new Date(customer.created_at).toLocaleDateString('pt-BR')}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ✅ Renderização condicional - apenas admin e manager veem usuários */}
        {activeTab === 'users' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
          <div className="users-section">
            <h2>👤 Usuários</h2>
            
            {loading && <p>Carregando usuários...</p>}
            
            {!loading && users.length === 0 && (
              <div className="empty-state">
                <p>📝 Nenhum usuário encontrado</p>
                <p>A tabela 'users' está vazia ou não existe</p>
              </div>
            )}
            
            {users.length > 0 && (
              <div className="users-list">
                <p>Total de usuários: {users.length}</p>
                {users.map((user) => (
                  <div key={user.id} className="user-card">
                    <h3>{user.name}</h3>
                    <p>📧 {user.email}</p>
                    <p>🔑 Role: <span className={`role-badge role-${user.role}`}>{user.role}</span></p>
                    <p>🏢 Tenant: {user.tenant_id}</p>
                    <p>📊 Status: {user.is_active ? '✅ Ativo' : '❌ Inativo'}</p>
                    <small>Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="tech-stack">
          <h3>🛠️ Stack Tecnológica</h3>
          <div className="tech-items">
            <span className="tech-item">⚛️ React</span>
            <span className="tech-item">📘 TypeScript</span>
            <span className="tech-item">🟢 Node.js</span>
            <span className="tech-item">🚀 Express</span>
            <span className="tech-item">🗄️ Supabase</span>
            <span className="tech-item">🐘 PostgreSQL</span>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
