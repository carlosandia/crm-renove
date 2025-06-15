import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role: 'super_admin' | 'admin' | 'member';
  tenant_id: string;
  is_active: boolean;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tenant_id: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

// Componente de Login
const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Credenciais inválidas');
      }
    } catch (error) {
      setError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>🔐 Login CRM</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
            />
          </div>
          <div className="form-group">
            <label>Senha:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Sua senha"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <div className="demo-credentials">
          <h4>Credenciais de Demonstração:</h4>
          <p><strong>Super Admin:</strong> superadmin@crm.com / 123456</p>
          <p><strong>Admin:</strong> admin@crm.com / 123456</p>
          <p><strong>Member:</strong> member@crm.com / 123456</p>
        </div>
      </div>
    </div>
  );
};

// Componente de Menu baseado em Role
const RoleBasedMenu: React.FC = () => {
  const { user } = useAuth();
  const [activeMenu, setActiveMenu] = useState('Relatório');

  if (!user) return null;

  const getMenuItems = () => {
    switch (user.role) {
      case 'super_admin':
        return ['Relatório', 'Meu Perfil', 'Comentários', 'Clientes', 'Integrações'];
      case 'admin':
        return ['Meta', 'Vendedores', 'Criador de pipeline', 'Criador de formulários', 'Relatório', 'Acompanhamento', 'Leads', 'Meu Perfil'];
      case 'member':
        return ['Relatório', 'Pipeline', 'Acompanhamento', 'Leads', 'Meu Perfil', 'Calendário Público', 'Encurtador de URL'];
      default:
        return ['Meu Perfil'];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="role-based-menu">
      <div className="menu-header">
        <h3>Menu - {user.role.replace('_', ' ').toUpperCase()}</h3>
      </div>
      <div className="menu-items">
        {menuItems.map((item) => (
          <button
            key={item}
            onClick={() => setActiveMenu(item)}
            className={`menu-item ${activeMenu === item ? 'active' : ''}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="menu-content">
        <h4>📄 {activeMenu}</h4>
        <p>Conteúdo da seção "{activeMenu}" para usuário {user.role}</p>
        {activeMenu === 'Meu Perfil' && (
          <div className="profile-info">
            <p><strong>Nome:</strong> {user.first_name} {user.last_name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> <span className={`role-badge role-${user.role}`}>{user.role}</span></p>
            <p><strong>Tenant:</strong> {user.tenant_id}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente principal da aplicação (/app)
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

// Provider de Autenticação
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há usuário logado (simulação - em produção usar Supabase Auth)
    const checkAuth = () => {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Simulação de login - em produção usar Supabase Auth
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'superadmin@crm.com',
          first_name: 'Super',
          last_name: 'Admin',
          role: 'super_admin',
          tenant_id: 'tenant-1',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          email: 'admin@crm.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          tenant_id: 'tenant-1',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          email: 'member@crm.com',
          first_name: 'Member',
          last_name: 'User',
          role: 'member',
          tenant_id: 'tenant-1',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];

      const foundUser = mockUsers.find(u => u.email === email);
      if (foundUser && password === '123456') {
        setUser(foundUser);
        localStorage.setItem('currentUser', JSON.stringify(foundUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Componente principal
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

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

export default App;
