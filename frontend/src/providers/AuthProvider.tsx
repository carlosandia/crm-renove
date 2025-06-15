
import React, { useState, useEffect } from 'react';
import AuthContext from '../contexts/AuthContext';
import { User } from '../types/User';

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

export default AuthProvider;
