import React, { useState, useEffect } from 'react';
import './App.css';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  created_at: string;
}

function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<string>('Verificando...');

  // Verificar status do backend
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:5000/health');
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

  // Carregar clientes
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/customers');
        if (response.ok) {
          const data = await response.json();
          setCustomers(data.customers || []);
          setError(null);
        } else {
          setError('Erro ao carregar clientes');
        }
      } catch (error) {
        setError('Erro de conexão com o backend');
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const testBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/test-db');
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

        <div className="actions">
          <button onClick={testBackendConnection} className="test-button">
            🔍 Testar Conexão Backend
          </button>
        </div>

        <div className="customers-section">
          <h2>📋 Clientes</h2>
          
          {loading && <p>Carregando clientes...</p>}
          
          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
              <p>💡 Certifique-se de que o backend está rodando na porta 5000</p>
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
