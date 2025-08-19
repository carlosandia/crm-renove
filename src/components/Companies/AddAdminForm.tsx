import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, User, Mail, Loader2, Eye, EyeOff, CheckCircle, XCircle, Lock, AlertCircle } from 'lucide-react';
import { AdminFormData } from '../../types/Company';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';

interface AddAdminFormProps {
  onSave: (adminData: AdminFormData) => Promise<boolean>;
  onCancel: () => void;
  isLoading?: boolean;
}

const AddAdminForm: React.FC<AddAdminFormProps> = ({
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<AdminFormData>({
    name: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados para validação de email em tempo real
  const [emailValidation, setEmailValidation] = useState<{
    isChecking: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isAvailable: null,
    message: ''
  });

  // AIDEV-NOTE: Função para verificar disponibilidade do email
  const checkEmailAvailability = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailValidation({
        isChecking: false,
        isAvailable: null,
        message: ''
      });
      return;
    }

    setEmailValidation(prev => ({
      ...prev,
      isChecking: true,
      message: 'Verificando disponibilidade...'
    }));

    try {
      // Verificar na tabela users
      const { data: existingUsers, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email);

      if (error) {
        console.error('❌ [AddAdminForm] Erro ao verificar email:', error);
        setEmailValidation({
          isChecking: false,
          isAvailable: null,
          message: 'Erro ao verificar email'
        });
        return;
      }

      const isAvailable = !existingUsers || existingUsers.length === 0;
      
      setEmailValidation({
        isChecking: false,
        isAvailable,
        message: isAvailable ? 'Email disponível' : 'Email já está em uso'
      });
    } catch (error) {
      console.error('❌ [AddAdminForm] Exception ao verificar email:', error);
      setEmailValidation({
        isChecking: false,
        isAvailable: null,
        message: 'Erro ao verificar email'
      });
    }
  }, []);

  // AIDEV-NOTE: Debounce para verificação de email
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email) {
        checkEmailAvailability(formData.email);
      }
    }, 500); // 500ms de debounce

    return () => clearTimeout(timeoutId);
  }, [formData.email, checkEmailAvailability]);

  // AIDEV-NOTE: Validação de formulário
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar nome
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email deve ter um formato válido';
    } else if (emailValidation.isAvailable === false) {
      newErrors.email = 'Email já está em uso por outro usuário';
    }

    // Validar senha
    if (!formData.password?.trim()) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Senha deve conter pelo menos 1 letra e 1 número';
    }

    // Validar confirmação de senha
    if (!formData.confirmPassword?.trim()) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não conferem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler para mudança nos campos
  const handleInputChange = (field: keyof AdminFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo ao digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Limpar validação de email se o campo estiver vazio
    if (field === 'email' && !value.trim()) {
      setEmailValidation({
        isChecking: false,
        isAvailable: null,
        message: ''
      });
    }
  };

  // Handler para submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const success = await onSave(formData);
      if (success) {
        // Limpar formulário após sucesso
        setFormData({ 
          name: '', 
          email: '', 
          first_name: '', 
          last_name: '', 
          password: '', 
          confirmPassword: '' 
        });
        setErrors({});
        setEmailValidation({
          isChecking: false,
          isAvailable: null,
          message: ''
        });
      }
    } catch (error) {
      console.error('❌ [AddAdminForm] Erro ao salvar:', error);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-blue-900 flex items-center">
          <User className="w-4 h-4 mr-2" />
          Adicionar Novo Administrador
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Campo Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ex: João Silva"
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.name 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300 bg-white'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Campo Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email *
            </label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="admin@empresa.com"
                disabled={isLoading}
                className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.email 
                    ? 'border-red-300 bg-red-50' 
                    : emailValidation.isAvailable === true
                    ? 'border-green-300 bg-green-50'
                    : emailValidation.isAvailable === false
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 bg-white'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {emailValidation.isChecking ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : emailValidation.isAvailable === true ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : emailValidation.isAvailable === false ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Mail className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
            {errors.email ? (
              <p className="text-xs text-red-600 mt-1">{errors.email}</p>
            ) : emailValidation.message && (
              <p className={`text-xs mt-1 ${
                emailValidation.isAvailable === true 
                  ? 'text-green-600' 
                  : emailValidation.isAvailable === false 
                  ? 'text-red-600' 
                  : 'text-blue-600'
              }`}>
                {emailValidation.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Campo Senha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Senha *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password || ''}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.password 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300 bg-white'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          {/* Campo Confirmar Senha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmar Senha *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword || ''}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.confirmPassword 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300 bg-white'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
            )}
            {/* Indicador de senhas conferem */}
            {formData.password && formData.confirmPassword && (
              <div className="mt-1 flex items-center space-x-1">
                {formData.password === formData.confirmPassword ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">Senhas conferem</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-600">Senhas não conferem</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Informação adicional */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-800">
            <strong>✅ Informação:</strong> O administrador será criado imediatamente e ficará ativo 
            para acessar o sistema com a senha definida.
          </p>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={isLoading || !formData.name.trim() || !formData.email.trim() || !formData.password?.trim() || !formData.confirmPassword?.trim() || formData.password !== formData.confirmPassword || emailValidation.isAvailable !== true}
            className={`flex-1 h-9 text-sm font-medium flex items-center justify-center gap-2 ${
              isLoading || !formData.name.trim() || !formData.email.trim() || !formData.password?.trim() || !formData.confirmPassword?.trim() || formData.password !== formData.confirmPassword || emailValidation.isAvailable !== true
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Adicionando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Adicionar Administrador</span>
              </>
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 h-9 text-sm font-medium text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddAdminForm;