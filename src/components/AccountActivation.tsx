import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Key, Building, User } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface ActivationData {
  company_name: string;
  admin_name: string;
  admin_email: string;
  expires_at: string;
  status: string;
}

interface PasswordRequirements {
  length: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

const AccountActivation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const token = searchParams.get('token');
  
  // Estados do componente
  const [isLoading, setIsLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [activationData, setActivationData] = useState<ActivationData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
    length: false,
    hasLetter: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  // Validar token ao carregar
  useEffect(() => {
    if (!token) {
      toast({
        title: "Token inválido",
        description: "Link de ativação inválido ou expirado.",
        variant: "destructive"
      });
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    validateToken();
  }, [token]);

  // Validar requisitos da senha
  useEffect(() => {
    const requirements: PasswordRequirements = {
      length: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    setPasswordRequirements(requirements);
  }, [password]);

  const validateToken = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔍 [ACTIVATION] Validando token:', token);
      
      // Fazer requisição real para o backend - usando configuração centralizada
      const { environmentConfig } = await import('../config/environment');
      const response = await fetch(`${environmentConfig.urls.api}/admin-invitations/validate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [ACTIVATION] Token válido:', result.data);
        setTokenValid(true);
        setActivationData(result.data);
        
        toast({
          title: "Token válido",
          description: `Bem-vindo, ${result.data.admin_name}! Defina sua senha para ativar a conta.`,
          variant: "default"
        });
      } else {
        console.error('❌ [ACTIVATION] Token inválido:', result.error);
        setTokenValid(false);
        toast({
          title: "Token inválido",
          description: result.error || "Link de ativação inválido ou expirado.",
          variant: "destructive"
        });
      }
      
    } catch (error: any) {
      console.error('❌ [ACTIVATION] Erro ao validar token:', error);
      setTokenValid(false);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível validar o token. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid()) {
      toast({
        title: "Senha inválida",
        description: "Por favor, atenda a todos os requisitos de senha.",
        variant: "destructive"
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive"
      });
      return;
    }
    
    setIsActivating(true);
    
    try {
      console.log('🔑 [ACTIVATION] Ativando conta...');
      
      // Fazer requisição real para o backend - usando configuração centralizada
      const { environmentConfig } = await import('../config/environment');
      const response = await fetch(`${environmentConfig.urls.api}/admin-invitations/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          password 
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [ACTIVATION] Conta ativada com sucesso:', result.data);
        
        toast({
          title: "Conta ativada!",
          description: `Sua conta foi ativada com sucesso. Fazendo login automaticamente...`,
          variant: "default"
        });
        
        // 🔧 CORREÇÃO CRÍTICA #2: LOGIN AUTOMÁTICO COM RETRY INTELIGENTE
        const performAutoLogin = async (attempt = 1, maxAttempts = 3) => {
          try {
            console.log(`🔄 [CRITICAL-FIX-2] Tentativa ${attempt}/${maxAttempts} de login automático...`);
            
            // 🔧 CORREÇÃO: Delay progressivo específico (2s → 3s → 4.5s)
            const delays = [2000, 3000, 4500]; // Delays específicos por tentativa
            const delay = delays[attempt - 1] || 4500;
            console.log(`⏱️ [CRITICAL-FIX-2] Aguardando ${delay}ms para sincronização...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
          const { environmentConfig: envConfig } = await import('../config/environment');
          const loginResponse = await fetch(`${envConfig.urls.api}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: activationData?.admin_email,
                password: password
            })
          });

          const loginResult = await loginResponse.json();
          
            if (loginResult.success && loginResult.data?.tokens) {
              console.log('✅ [CRITICAL-FIX-2] Login automático realizado com sucesso na tentativa', attempt);
              
              const tokens = loginResult.data.tokens;
              
              // 🔧 CORREÇÃO CRÍTICA #2: Armazenamento robusto de tokens JWT com try/catch
              let tokensStored = false;
              try {
                // Armazenar tokens em sessionStorage (primário)
                sessionStorage.setItem('crm_access_token', tokens.accessToken);
                sessionStorage.setItem('crm_refresh_token', tokens.refreshToken);
                sessionStorage.setItem('crm_token_expires', 
                  (Date.now() + tokens.expiresIn * 1000).toString()
                );
                
                // Armazenar tokens em localStorage (backup)
                localStorage.setItem('crm_auth_tokens', JSON.stringify({
                  accessToken: tokens.accessToken,
                  refreshToken: tokens.refreshToken,
                  expiresIn: tokens.expiresIn,
                  tokenType: tokens.tokenType || 'Bearer',
                  storedAt: Date.now()
                }));
                
                tokensStored = true;
                console.log('✅ [CRITICAL-FIX-2] Tokens JWT armazenados com dupla segurança (session + local)');
                console.log('🔑 [CRITICAL-FIX-2] Token expira em:', new Date(Date.now() + tokens.expiresIn * 1000).toLocaleString());
              } catch (storageError) {
                console.warn('⚠️ [CRITICAL-FIX-2] Erro ao armazenar tokens:', storageError);
                // Continuar mesmo com erro de storage
              }
              
              // Construir dados do usuário com fallback robusto
              const userData = loginResult.data?.user || {
                id: result.data?.user_id || `temp_${Date.now()}`,
              email: activationData?.admin_email,
              role: 'admin',
              tenant_id: result.data?.company_id,
              first_name: activationData?.admin_name?.split(' ')[0] || 'Admin',
              last_name: activationData?.admin_name?.split(' ').slice(1).join(' ') || '',
              is_active: true
            };
            
              // Salvar dados do usuário no localStorage
              localStorage.setItem('crm_user', JSON.stringify(userData));
            localStorage.setItem('isAuthenticated', 'true');
            
              // 🔧 CORREÇÃO CRÍTICA #2: Notificar AuthProvider com evento user-login
              console.log('📡 [CRITICAL-FIX-2] Disparando evento user-login para AuthProvider...');
            window.dispatchEvent(new CustomEvent('user-login', {
              detail: userData
            }));
              
              // Disparar evento de ativação concluída
              console.log('📡 [CRITICAL-FIX-2] Disparando evento admin-activated...');
              window.dispatchEvent(new CustomEvent('admin-activated', {
                detail: { 
                  companyId: result.data?.company_id, 
                  adminEmail: activationData?.admin_email,
                  tokensStored: tokensStored,
                  attempt: attempt
                }
              }));
            
            toast({
                title: "Login automático realizado!",
                description: `Bem-vindo ao CRM, ${activationData?.admin_name}!`,
              variant: "default"
            });
            
              // 🔧 CORREÇÃO CRÍTICA #2: Redirecionamento específico para painel admin
            setTimeout(() => {
                console.log('🎯 [CRITICAL-FIX-2] Redirecionamento para painel administrativo...');
                navigate('/dashboard', { 
                  replace: true,
                  state: { 
                    welcomeMessage: `Conta ativada com sucesso! Bem-vindo ao seu painel administrativo.`,
                    isNewActivation: true,
                    autoLoginAttempts: attempt
                  }
                });
              }, 1500);
              
              return true;
            
          } else {
              console.warn(`⚠️ [CRITICAL-FIX-2] Tentativa ${attempt} falhou:`, loginResult.error);
            
              // Retry se não foi a última tentativa
              if (attempt < maxAttempts) {
                console.log(`🔄 [CRITICAL-FIX-2] Preparando retry ${attempt + 1}/${maxAttempts}...`);
                return await performAutoLogin(attempt + 1, maxAttempts);
              } else {
                throw new Error(loginResult.error || 'Login automático falhou após todas as tentativas');
              }
            }
            
          } catch (error) {
            console.error(`❌ [CRITICAL-FIX-2] Erro na tentativa ${attempt}:`, error);
            
            // Retry se não foi a última tentativa
            if (attempt < maxAttempts) {
              console.log(`🔄 [CRITICAL-FIX-2] Erro capturado, tentando novamente (${attempt + 1}/${maxAttempts})...`);
              return await performAutoLogin(attempt + 1, maxAttempts);
            } else {
              // 🔧 CORREÇÃO CRÍTICA #2: Fallback graceful final
              console.log('🔄 [CRITICAL-FIX-2] Todas as tentativas falharam, ativando fallback graceful...');
              console.log('📊 [CRITICAL-FIX-2] Resumo das tentativas:');
              console.log(`  - Tentativas realizadas: ${maxAttempts}`);
              console.log(`  - Delays utilizados: 2s, 3s, 4.5s`);
              console.log(`  - Último erro:`, error);
              
              toast({
                title: "Redirecionando para login",
                description: "Conta ativada! Você será redirecionado para fazer login manualmente.",
                variant: "default"
              });
              
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: 'Conta ativada com sucesso! Faça login com suas credenciais.',
                    email: activationData?.admin_email,
                    isActivatedAccount: true,
                    autoLoginFailed: true,
                    autoLoginAttempts: maxAttempts
              }
            });
              }, 3000);
              
              return false;
            }
        }
        };

        // Executar login automático com retry
        await performAutoLogin();
      } else {
        console.error('❌ [ACTIVATION] Falha na ativação:', result.error);
        toast({
          title: "Erro na ativação",
          description: result.error || "Não foi possível ativar a conta. Tente novamente.",
          variant: "destructive"
        });
      }
      
    } catch (error: any) {
      console.error('❌ [ACTIVATION] Erro na ativação:', error);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível ativar a conta. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsActivating(false);
    }
  };

  const isPasswordValid = () => {
    return Object.values(passwordRequirements).every(req => req);
  };

  const getPasswordStrength = () => {
    const validCount = Object.values(passwordRequirements).filter(req => req).length;
    if (validCount <= 1) return { strength: 'Muito fraca', color: 'bg-red-500', width: '25%' };
    if (validCount === 2) return { strength: 'Fraca', color: 'bg-orange-500', width: '50%' };
    if (validCount === 3) return { strength: 'Boa', color: 'bg-yellow-500', width: '75%' };
    return { strength: 'Forte', color: 'bg-green-500', width: '100%' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Validando convite</h2>
          <p className="text-gray-600">Verificando token de ativação...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid || !activationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Token Inválido</h2>
          <p className="text-gray-600 mb-4">
            Este link de ativação é inválido ou expirou.
          </p>
          <p className="text-sm text-gray-500">
            Redirecionando para o login...
          </p>
        </div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white text-center">
          <Key className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Ativar Conta</h1>
          <p className="text-blue-100 mt-1">Defina sua senha para acessar o sistema</p>
        </div>

        {/* Company Info */}
        <div className="px-8 py-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-3 mb-2">
            <Building className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-800">{activationData.company_name}</span>
          </div>
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-gray-600" />
            <span className="text-gray-600">{activationData.admin_name}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleActivation} className="p-8 space-y-6">
          
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email do Administrador
            </label>
            <input
              type="email"
              value={activationData.admin_email}
              readOnly
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nova Senha *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Digite sua nova senha"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password Strength */}
            {password && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Força da senha:</span>
                  <span className={`text-xs font-medium ${
                    passwordStrength.strength === 'Forte' ? 'text-green-600' :
                    passwordStrength.strength === 'Boa' ? 'text-yellow-600' :
                    passwordStrength.strength === 'Fraca' ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {passwordStrength.strength}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: passwordStrength.width }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Senha *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirme sua nova senha"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {confirmPassword && (
              <div className="mt-2 flex items-center space-x-2">
                {password === confirmPassword ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">Senhas conferem</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">Senhas não conferem</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Requisitos da senha:</h4>
            <div className="space-y-2">
              {[
                { key: 'length', text: 'Pelo menos 8 caracteres' },
                { key: 'hasLetter', text: 'Pelo menos 1 letra' },
                { key: 'hasNumber', text: 'Pelo menos 1 número' },
                { key: 'hasSpecialChar', text: 'Pelo menos 1 caractere especial (!@#$%^&*)' }
              ].map(req => (
                <div key={req.key} className="flex items-center space-x-2">
                  {passwordRequirements[req.key as keyof PasswordRequirements] ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={`text-sm ${
                    passwordRequirements[req.key as keyof PasswordRequirements] 
                      ? 'text-green-600' 
                      : 'text-gray-600'
                  }`}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isPasswordValid() || password !== confirmPassword || isActivating}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
              isPasswordValid() && password === confirmPassword && !isActivating
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isActivating ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Ativando conta...</span>
              </div>
            ) : (
              'Ativar Conta'
            )}
          </button>

          {/* Expiration Warning */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Este link expira em: {new Date(activationData.expires_at).toLocaleString('pt-BR')}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountActivation; 