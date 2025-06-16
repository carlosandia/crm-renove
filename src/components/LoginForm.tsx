'use client'

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Hook de autenticação com tratamento de erro
  let authHook;
  try {
    authHook = useAuth();
  } catch (error) {
    console.error('Erro ao acessar contexto de autenticação:', error);
    return (
      <div className="error-container">
        <h3>Erro de Configuração</h3>
        <p>Problema na configuração de autenticação. Recarregue a página.</p>
        <button onClick={() => window.location.reload()}>Recarregar</button>
      </div>
    );
  }

  const { login } = authHook;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Tentando fazer login com:', email);
      const success = await login(email, password);
      
      if (success) {
        console.log('Login bem-sucedido, redirecionando...');
        router.push('/app');
      } else {
        setError('Credenciais inválidas. Verifique email e senha.');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (role: 'super' | 'admin' | 'member') => {
    switch (role) {
      case 'super':
        setEmail('superadmin@crm.com');
        setPassword('SuperAdmin123!');
        break;
      case 'admin':
        setEmail('admin@crm.com');
        setPassword('123456');
        break;
      case 'member':
        setEmail('member@crm.com');
        setPassword('123456');
        break;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">🔐 Login CRM</h2>
          <p className="text-gray-600">Acesse o sistema com suas credenciais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Sua senha"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Credenciais de Demonstração:</h4>
          
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials('super')}
              className="w-full text-left p-2 text-xs bg-purple-100 hover:bg-purple-200 rounded"
            >
              <strong>Super Admin:</strong> superadmin@crm.com / SuperAdmin123!
            </button>
            
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin')}
              className="w-full text-left p-2 text-xs bg-blue-100 hover:bg-blue-200 rounded"
            >
              <strong>Admin:</strong> admin@crm.com / 123456
            </button>
            
            <button
              type="button"
              onClick={() => fillDemoCredentials('member')}
              className="w-full text-left p-2 text-xs bg-green-100 hover:bg-green-200 rounded"
            >
              <strong>Member:</strong> member@crm.com / 123456
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            💡 Clique nas credenciais acima para preenchê-las automaticamente
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
