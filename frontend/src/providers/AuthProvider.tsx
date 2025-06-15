
import React, { useState, useEffect } from 'react';
import AuthContext from '../contexts/AuthContext';
import { User } from '../types/User';

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    // Simulação de usuários para demonstração
    const demoUsers = [
      { id: '1', email: 'superadmin@crm.com', password: '123456', first_name: 'Super', last_name: 'Admin', role: 'super_admin' as const, tenant_id: '550e8400-e29b-41d4-a716-446655440000', is_active: true, created_at: new Date().toISOString() },
      { id: '2', email: 'admin@crm.com', password: '123456', first_name: 'Admin', last_name: 'User', role: 'admin' as const, tenant_id: '550e8400-e29b-41d4-a716-446655440000', is_active: true, created_at: new Date().toISOString() },
      { id: '3', email: 'member@crm.com', password: '123456', first_name: 'Member', last_name: 'User', role: 'member' as const, tenant_id: '550e8400-e29b-41d4-a716-446655440000', is_active: true, created_at: new Date().toISOString() }
    ];

    try {
      const foundUser = demoUsers.find(u => u.email === email && u.password === password);
      
      if (foundUser) {
        const { password: _, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
        setLoading(false);
        return true;
      }
      
      setLoading(false);
      return false;
    } catch (error) {
      console.error('Erro no login:', error);
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
