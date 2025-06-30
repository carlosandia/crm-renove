import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface Vendedor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  tenant_id: string;
  last_login?: string;
  last_login_formatted?: string;
  is_real_login?: boolean;
}

export interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface EmailValidation {
  isChecking: boolean;
  exists: boolean;
  message: string;
}

export interface PasswordValidation {
  isValid: boolean;
  message: string;
  requirements: {
    length: boolean;
    hasLetter: boolean;
    hasNumber: boolean;
  };
}

export interface VendorValidatorProps {
  formData: FormData;
  editingVendedor?: Vendedor | null;
  onFormDataChange: (data: FormData) => void;
}

// ============================================
// HOOK PERSONALIZADO
// ============================================

export const useVendorValidator = ({ 
  formData, 
  editingVendedor, 
  onFormDataChange 
}: VendorValidatorProps) => {
  const { user } = useAuth();
  
  // Estados de validação
  const [emailValidation, setEmailValidation] = useState<EmailValidation>({
    isChecking: false,
    exists: false,
    message: ''
  });

  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    isValid: false,
    message: '',
    requirements: {
      length: false,
      hasLetter: false,
      hasNumber: false
    }
  });

  const [showPassword, setShowPassword] = useState(false);

  // ============================================
  // VALIDAÇÃO DE EMAIL (DEBOUNCED)
  // ============================================

  const validateEmail = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return async (email: string) => {
        if (!email || !email.includes('@') || editingVendedor) {
          setEmailValidation({ isChecking: false, exists: false, message: '' });
          return;
        }

        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          setEmailValidation({ isChecking: true, exists: false, message: 'Verificando...' });

          try {
            const { data: existingUser, error } = await supabase
              .from('users')
              .select('id, email')
              .eq('email', email.trim())
              .single();

            if (error && error.code !== 'PGRST116') {
              logger.error('Erro ao verificar email:', error);
              setEmailValidation({ isChecking: false, exists: false, message: '' });
              return;
            }

            if (existingUser) {
              setEmailValidation({ 
                isChecking: false, 
                exists: true, 
                message: 'Esse e-mail já existe, favor inserir outro.' 
              });
            } else {
              setEmailValidation({ 
                isChecking: false, 
                exists: false, 
                message: 'E-mail disponível.' 
              });
            }
          } catch (error) {
            logger.error('Erro na validação do email:', error);
            setEmailValidation({ isChecking: false, exists: false, message: '' });
          }
        }, 800);
      };
    })(),
    [editingVendedor]
  );

  // ============================================
  // VALIDAÇÃO DE SENHA
  // ============================================

  const validatePassword = useCallback((password: string) => {
    if (!password || editingVendedor) {
      setPasswordValidation({
        isValid: false,
        message: '',
        requirements: { length: false, hasLetter: false, hasNumber: false }
      });
      return;
    }

    const hasMinLength = password.length >= 6;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    const isValid = hasMinLength && hasLetter && hasNumber;
    
    let message = '';
    if (!isValid) {
      const missing = [];
      if (!hasMinLength) missing.push('mínimo 6 caracteres');
      if (!hasLetter) missing.push('pelo menos 1 letra');
      if (!hasNumber) missing.push('pelo menos 1 número');
      message = `Senha deve ter: ${missing.join(', ')}`;
    } else {
      message = 'Senha válida!';
    }

    setPasswordValidation({
      isValid,
      message,
      requirements: {
        length: hasMinLength,
        hasLetter: hasLetter,
        hasNumber: hasNumber
      }
    });
  }, [editingVendedor]);

  // ============================================
  // EFEITOS PARA VALIDAÇÃO AUTOMÁTICA
  // ============================================

  useEffect(() => {
    if (formData.email) {
      validateEmail(formData.email);
    }
  }, [formData.email, validateEmail]);

  useEffect(() => {
    if (formData.password) {
      validatePassword(formData.password);
    }
  }, [formData.password, validatePassword]);

  // ============================================
  // FUNÇÕES DE MANIPULAÇÃO DO FORMULÁRIO
  // ============================================

  const handleFieldChange = useCallback((field: keyof FormData, value: string) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  }, [formData, onFormDataChange]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const resetValidation = useCallback(() => {
    setEmailValidation({ isChecking: false, exists: false, message: '' });
    setPasswordValidation({
      isValid: false,
      message: '',
      requirements: { length: false, hasLetter: false, hasNumber: false }
    });
  }, []);

  // ============================================
  // VERIFICAÇÃO DE VALIDAÇÃO DO FORMULÁRIO
  // ============================================

  const isFormValid = useCallback(() => {
    const hasRequiredFields = formData.first_name && formData.last_name && formData.email;
    
    if (editingVendedor) {
      return hasRequiredFields;
    }
    
    const emailOk = !emailValidation.exists;
    const passwordOk = !formData.password || passwordValidation.isValid;
    
    return hasRequiredFields && emailOk && passwordOk;
  }, [formData, editingVendedor, emailValidation.exists, passwordValidation.isValid]);

  // ============================================
  // COMPONENTES DE VALIDAÇÃO
  // ============================================

  const EmailField = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        E-mail *
      </label>
      <div className="relative">
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          required
          placeholder="email@empresa.com"
          disabled={!!editingVendedor}
          className={`w-full px-4 py-3 border rounded-lg pr-10 transition-all ${
            editingVendedor
              ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
              : emailValidation.exists
              ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-transparent'
              : emailValidation.message && !emailValidation.exists && !emailValidation.isChecking
              ? 'border-green-300 focus:ring-2 focus:ring-green-500 focus:border-transparent'
              : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }`}
        />
        
        {/* Ícone de status */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {emailValidation.isChecking ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          ) : emailValidation.exists ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : emailValidation.message && !emailValidation.exists ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : null}
        </div>
      </div>
      
      {/* Mensagem de validação */}
      {emailValidation.message && !editingVendedor && (
        <div className={`mt-1 text-sm flex items-center gap-1 ${
          emailValidation.exists ? 'text-red-600' : 'text-green-600'
        }`}>
          {emailValidation.exists ? (
            <AlertCircle className="h-3 w-3" />
          ) : (
            <CheckCircle className="h-3 w-3" />
          )}
          {emailValidation.message}
        </div>
      )}
      
      {editingVendedor && (
        <p className="mt-1 text-sm text-gray-500">
          O e-mail não pode ser alterado após a criação
        </p>
      )}
    </div>
  );

  const PasswordField = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {editingVendedor ? 'Nova Senha (opcional)' : 'Senha (opcional)'}
      </label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={(e) => handleFieldChange('password', e.target.value)}
          placeholder={editingVendedor ? 'Deixe em branco para manter atual' : 'Deixe em branco para usar padrão (123456)'}
          className={`w-full px-4 py-3 border rounded-lg pr-10 transition-all ${
            formData.password && !passwordValidation.isValid
              ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-transparent'
              : formData.password && passwordValidation.isValid
              ? 'border-green-300 focus:ring-2 focus:ring-green-500 focus:border-transparent'
              : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }`}
        />
        
        {/* Botão toggle password */}
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      
      {/* Requisitos da senha */}
      {formData.password && (
        <div className="mt-2 space-y-1">
          <div className={`text-xs flex items-center gap-1 ${
            passwordValidation.requirements.length ? 'text-green-600' : 'text-red-600'
          }`}>
            {passwordValidation.requirements.length ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Mínimo 6 caracteres
          </div>
          <div className={`text-xs flex items-center gap-1 ${
            passwordValidation.requirements.hasLetter ? 'text-green-600' : 'text-red-600'
          }`}>
            {passwordValidation.requirements.hasLetter ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Pelo menos 1 letra
          </div>
          <div className={`text-xs flex items-center gap-1 ${
            passwordValidation.requirements.hasNumber ? 'text-green-600' : 'text-red-600'
          }`}>
            {passwordValidation.requirements.hasNumber ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Pelo menos 1 número
          </div>
        </div>
      )}
      
      {/* Mensagem geral */}
      {passwordValidation.message && (
        <div className={`mt-2 text-sm flex items-center gap-1 ${
          passwordValidation.isValid ? 'text-green-600' : 'text-red-600'
        }`}>
          {passwordValidation.isValid ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {passwordValidation.message}
        </div>
      )}
    </div>
  );

  const FirstNameField = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Nome *
      </label>
      <input
        type="text"
        value={formData.first_name}
        onChange={(e) => handleFieldChange('first_name', e.target.value)}
        required
        placeholder="Nome do vendedor"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
    </div>
  );

  const LastNameField = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Sobrenome *
      </label>
      <input
        type="text"
        value={formData.last_name}
        onChange={(e) => handleFieldChange('last_name', e.target.value)}
        required
        placeholder="Sobrenome do vendedor"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
    </div>
  );

  return {
    emailValidation,
    passwordValidation,
    showPassword,
    isFormValid,
    handleFieldChange,
    togglePasswordVisibility,
    resetValidation,
    validateEmail,
    validatePassword,
    EmailField,
    PasswordField,
    FirstNameField,
    LastNameField
  };
};

// ============================================
// COMPONENTE WRAPPER
// ============================================

export const VendorValidator: React.FC<VendorValidatorProps> = (props) => {
  const {
    EmailField,
    PasswordField,
    FirstNameField,
    LastNameField
  } = useVendorValidator(props);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FirstNameField />
      <LastNameField />
      <EmailField />
      <PasswordField />
    </div>
  );
};

export default VendorValidator; 