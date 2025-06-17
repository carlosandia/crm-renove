
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Hook de autenticação com tratamento de erro
  let authHook;
  try {
    authHook = useAuth();
  } catch (error) {
    console.error('Erro ao acessar contexto de autenticação:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="card-modern p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Erro de Configuração</h3>
            <p className="text-muted-foreground mb-4">Problema na configuração de autenticação. Recarregue a página.</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Recarregar
            </button>
          </div>
        </div>
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
        navigate('/');
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

  const demoCredentials = [
    {
      role: 'super',
      title: 'Super Admin',
      email: 'superadmin@crm.com',
      password: 'SuperAdmin123!',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'hover:bg-purple-50'
    },
    {
      role: 'admin',
      title: 'Admin',
      email: 'admin@crm.com',
      password: '123456',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'hover:bg-blue-50'
    },
    {
      role: 'member',
      title: 'Vendedor',
      email: 'member@crm.com',
      password: '123456',
      color: 'from-green-500 to-green-600',
      bgColor: 'hover:bg-green-50'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md">
        <div className="card-modern p-8 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Bem-vindo de volta</h2>
            <p className="text-muted-foreground">Acesse o sistema com suas credenciais</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="input-modern pl-10"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Sua senha"
                  className="input-modern pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-semibold text-foreground mb-4 text-center">
              Credenciais de Demonstração
            </h4>
            
            <div className="space-y-2">
              {demoCredentials.map((cred) => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => fillDemoCredentials(cred.role as 'super' | 'admin' | 'member')}
                  className={`w-full text-left p-3 rounded-lg border border-border transition-all duration-200 ${cred.bgColor}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 bg-gradient-to-br ${cred.color} rounded-lg flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">
                        {cred.title.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-sm">{cred.title}</div>
                      <div className="text-xs text-muted-foreground">{cred.email}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              💡 Clique nas credenciais acima para preenchê-las automaticamente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
