import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';

interface PasswordRequirements {
  length: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

interface UsePasswordManagerReturn {
  // Estados
  isChangingPassword: boolean;
  newPassword: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  passwordRequirements: PasswordRequirements;
  
  // Ações
  setNewPassword: (password: string) => void;
  setConfirmPassword: (password: string) => void;
  setShowPassword: (show: boolean) => void;
  setShowConfirmPassword: (show: boolean) => void;
  
  // Validações
  isPasswordValid: () => boolean;
  getPasswordStrength: () => { strength: string; color: string; width: string };
  
  // API
  updateAdminPassword: (companyId: string) => Promise<{ success: boolean; message: string }>;
  
  // Utilitários
  resetForm: () => void;
}

export const usePasswordManager = (): UsePasswordManagerReturn => {
  const { user } = useAuth();
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
    length: false,
    hasLetter: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  // Validar senha em tempo real
  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    setPasswordRequirements(requirements);
  };

  // Setter personalizado para nova senha
  const handleSetNewPassword = (password: string) => {
    setNewPassword(password);
    validatePassword(password);
  };

  // Verificar se senha é válida
  const isPasswordValid = (): boolean => {
    return Object.values(passwordRequirements).every(req => req) && 
           newPassword === confirmPassword && 
           newPassword.length > 0;
  };

  // Calcular força da senha
  const getPasswordStrength = () => {
    const validCount = Object.values(passwordRequirements).filter(req => req).length;
    if (validCount <= 1) return { strength: 'Muito fraca', color: 'bg-red-500', width: '25%' };
    if (validCount === 2) return { strength: 'Fraca', color: 'bg-orange-500', width: '50%' };
    if (validCount === 3) return { strength: 'Boa', color: 'bg-yellow-500', width: '75%' };
    return { strength: 'Forte', color: 'bg-green-500', width: '100%' };
  };

  // ✅ MIGRAÇÃO CONCLUÍDA: Sistema migrado para autenticação básica Supabase
  const updateAdminPassword = async (companyId: string): Promise<{ success: boolean; message: string }> => {
    if (!isPasswordValid()) {
      return {
        success: false,
        message: 'Senha inválida. Verifique os requisitos e confirmação.'
      };
    }

    setIsChangingPassword(true);

    try {
      console.log('🔐 [PASSWORD-MANAGER] Iniciando alteração de senha...');
      console.log('🔐 [PASSWORD-MANAGER] Company ID:', companyId);
      console.log('🔐 [PASSWORD-MANAGER] User:', user?.email);

      // Hash da senha (Enterprise Security)
      const { hashPasswordEnterprise } = await import('../lib/utils');
      const hashedPassword = await hashPasswordEnterprise(newPassword);

      // ✅ CORREÇÃO: Migração para autenticação básica Supabase
      const { data, error } = await supabase
        .from('companies')
        .update({ admin_password: hashedPassword })
        .eq('id', companyId)
        .eq('tenant_id', (user as any)?.user_metadata?.tenant_id)
        .select()
        .single();

      console.log('🔐 [PASSWORD-MANAGER] Supabase response:', { data, error });

      if (!error && data) {
        console.log('✅ [PASSWORD-MANAGER] Senha alterada com sucesso');
        
        resetForm();
        return {
          success: true,
          message: 'Senha atualizada com sucesso! O administrador pode fazer login com a nova senha.'
        };
      } else {
        console.error('❌ [PASSWORD-MANAGER] Erro na resposta:', error);
        
        return {
          success: false,
          message: error?.message || 'Erro desconhecido no servidor'
        };
      }

    } catch (error: any) {
      console.error('❌ [PASSWORD-MANAGER] Erro na requisição:', error);
      
      return {
        success: false,
        message: `Erro de rede: ${error.message || 'Falha na comunicação com o servidor'}`
      };
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Resetar formulário
  const resetForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordRequirements({
      length: false,
      hasLetter: false,
      hasNumber: false,
      hasSpecialChar: false
    });
  };

  return {
    // Estados
    isChangingPassword,
    newPassword,
    confirmPassword,
    showPassword,
    showConfirmPassword,
    passwordRequirements,
    
    // Ações
    setNewPassword: handleSetNewPassword,
    setConfirmPassword,
    setShowPassword,
    setShowConfirmPassword,
    
    // Validações
    isPasswordValid,
    getPasswordStrength,
    
    // API
    updateAdminPassword,
    
    // Utilitários
    resetForm
  };
}; 