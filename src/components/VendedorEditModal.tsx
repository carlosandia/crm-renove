import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Shield, Check, Loader2, AlertTriangle, CheckCircle, EyeOff, Eye, Edit
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';

// Hooks
import { useMembersAPI } from '../hooks/useMembersAPI';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { BaseModalProps } from '../types/CommonProps';
import { showSuccessToast, showErrorToast } from '../lib/toast';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface Vendedor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  tenant_id: string;
}

interface VendedorEditModalProps extends BaseModalProps {
  vendedor: Vendedor | null;
  onSubmit?: (vendedorData: any) => void;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const VendedorEditModal: React.FC<VendedorEditModalProps> = memo(({
  isOpen,
  onClose,
  vendedor,
  onSubmit
}) => {
  const { user } = useAuth();
  const { updateMember, checkEmailAvailability, isLoading } = useMembersAPI();
  
  // ============================================
  // ESTADOS
  // ============================================
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    is_active: true
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Estados para validação do email
  const [emailValidation, setEmailValidation] = useState({
    isChecking: false,
    exists: false,
    message: ''
  });

  // Estados para validação da senha
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    message: '',
    requirements: {
      length: false,
      hasLetter: false,
      hasNumber: false
    }
  });

  // Estados para validação da confirmação de senha
  const [confirmPasswordValidation, setConfirmPasswordValidation] = useState({
    isValid: false,
    message: '',
    passwordsMatch: false
  });

  // ============================================
  // EFEITOS
  // ============================================

  useEffect(() => {
    if (vendedor && isOpen) {
      setFormData({
        first_name: vendedor.first_name || '',
        last_name: vendedor.last_name || '',
        email: vendedor.email || '',
        password: '',
        confirmPassword: '',
        is_active: vendedor.is_active
      });
    }
  }, [vendedor, isOpen]);

  // ============================================
  // VALIDAÇÕES
  // ============================================

  const validatePassword = useCallback((password: string) => {
    if (!password) {
      setPasswordValidation({
        isValid: true,
        message: '',
        requirements: {
          length: false,
          hasLetter: false,
          hasNumber: false
        }
      });
      return true;
    }

    const requirements = {
      length: password.length >= 6,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password)
    };

    const isValid = requirements.length && requirements.hasLetter && requirements.hasNumber;
    
    let message = '';
    if (!isValid) {
      const missing = [];
      if (!requirements.length) missing.push('pelo menos 6 caracteres');
      if (!requirements.hasLetter) missing.push('pelo menos 1 letra');
      if (!requirements.hasNumber) missing.push('pelo menos 1 número');
      message = `Senha deve ter ${missing.join(', ')}`;
    }

    setPasswordValidation({
      isValid,
      message,
      requirements
    });

    return isValid;
  }, []);

  const validateConfirmPassword = useCallback((password: string, confirmPassword: string) => {
    if (!password && !confirmPassword) {
      setConfirmPasswordValidation({
        isValid: true,
        message: '',
        passwordsMatch: true
      });
      return true;
    }

    if (!confirmPassword) {
      setConfirmPasswordValidation({
        isValid: false,
        message: 'Por favor, confirme a senha',
        passwordsMatch: false
      });
      return false;
    }

    const passwordsMatch = password === confirmPassword;
    
    setConfirmPasswordValidation({
      isValid: passwordsMatch,
      message: passwordsMatch ? 'Senhas conferem' : 'Senhas não conferem',
      passwordsMatch
    });

    return passwordsMatch;
  }, []);

  const validateEmail = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailValidation({
        isChecking: false,
        exists: false,
        message: ''
      });
      return;
    }

    // Se o email é o mesmo do vendedor atual, não precisa validar
    if (vendedor && email === vendedor.email) {
      setEmailValidation({
        isChecking: false,
        exists: false,
        message: 'Email atual'
      });
      return;
    }

    setEmailValidation(prev => ({
      ...prev,
      isChecking: true
    }));

    try {
      const response = await checkEmailAvailability(email);
      
      setEmailValidation({
        isChecking: false,
        exists: !response.available,
        message: !response.available ? 'Este email já está em uso' : 'Email disponível'
      });
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      setEmailValidation({
        isChecking: false,
        exists: false,
        message: 'Erro ao verificar email'
      });
    }
  }, [checkEmailAvailability, vendedor]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpar erro específico quando o usuário começar a digitar
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Validações específicas por campo
    if (field === 'email' && typeof value === 'string') {
      const timeoutId = setTimeout(() => validateEmail(value), 500);
      return () => clearTimeout(timeoutId);
    }

    if (field === 'password' && typeof value === 'string') {
      validatePassword(value);
      // ✅ NOVO: Revalidar confirmação quando senha principal muda
      if (formData.confirmPassword) {
        validateConfirmPassword(value, formData.confirmPassword);
      }
    }

    if (field === 'confirmPassword' && typeof value === 'string') {
      validateConfirmPassword(formData.password, value);
    }
  }, [validationErrors, validateEmail, validatePassword, validateConfirmPassword, formData.password, formData.confirmPassword]);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    // Validar campos obrigatórios
    if (!formData.first_name.trim()) {
      errors.first_name = 'Nome é obrigatório';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Sobrenome é obrigatório';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!formData.email.includes('@')) {
      errors.email = 'Email deve ter formato válido';
    } else if (emailValidation.exists) {
      errors.email = 'Email já está em uso';
    }

    // Validar senha apenas se foi preenchida
    if (formData.password.trim() && !passwordValidation.isValid) {
      errors.password = passwordValidation.message;
    }

    // ✅ NOVO: Validar confirmação de senha se senha foi preenchida
    if (formData.password.trim() && formData.confirmPassword.trim() && !confirmPasswordValidation.passwordsMatch) {
      errors.confirmPassword = confirmPasswordValidation.message;
    }

    // ✅ NOVO: Se senha foi preenchida, confirmação é obrigatória
    if (formData.password.trim() && !formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Confirmação de senha é obrigatória';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, emailValidation.exists, passwordValidation, confirmPasswordValidation]);

  const handleSubmit = useCallback(async () => {
    if (!vendedor || !validateForm()) {
      return;
    }

    if (emailValidation.isChecking) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        is_active: formData.is_active
      };

      // Apenas incluir senha se foi preenchida
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      const result = await updateMember(vendedor.id, updateData);

      if (result.success) {
        // ✅ CORREÇÃO: Modal não deve disparar toast - deixar para o componente pai controlar
        onSubmit?.(result.member);
        handleClose();
      } else {
        setValidationErrors({
          submit: result.error || 'Erro ao atualizar vendedor'
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar vendedor:', error);
      setValidationErrors({
        submit: 'Erro interno ao atualizar vendedor'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [vendedor, validateForm, emailValidation.isChecking, formData, updateMember, onSubmit]);

  const handleClose = useCallback(() => {
    // Reset form
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirmPassword: '',
      is_active: true
    });
    
    setValidationErrors({});
    setEmailValidation({
      isChecking: false,
      exists: false,
      message: ''
    });
    setPasswordValidation({
      isValid: false,
      message: '',
      requirements: {
        length: false,
        hasLetter: false,
        hasNumber: false
      }
    });
    setConfirmPasswordValidation({
      isValid: false,
      message: '',
      passwordsMatch: false
    });
    
    setIsSubmitting(false);
    setShowPasswordField(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  }, [onClose]);

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  const canSubmit = formData.first_name.trim() && 
                   formData.last_name.trim() && 
                   formData.email.trim() &&
                   !emailValidation.exists &&
                   (!formData.password.trim() || passwordValidation.isValid) &&
                   (!formData.password.trim() || confirmPasswordValidation.passwordsMatch) &&
                   !emailValidation.isChecking &&
                   !isSubmitting &&
                   !isLoading;

  if (!vendedor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Edit className="w-5 h-5 text-blue-600" />
            Editar Vendedor
          </DialogTitle>
          <DialogDescription>
            Atualize os dados de {vendedor.first_name} {vendedor.last_name}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 pt-4"
          >
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-medium">
                Nome *
              </Label>
              <Input
                id="first_name"
                placeholder="Ex: João"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                className={validationErrors.first_name ? 'border-red-500' : ''}
              />
              {validationErrors.first_name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.first_name}
                </p>
              )}
            </div>

            {/* Sobrenome */}
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm font-medium">
                Sobrenome *
              </Label>
              <Input
                id="last_name"
                placeholder="Ex: Silva"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                className={validationErrors.last_name ? 'border-red-500' : ''}
              />
              {validationErrors.last_name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.last_name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Ex: joao.silva@empresa.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`pl-10 ${validationErrors.email ? 'border-red-500' : emailValidation.exists ? 'border-red-500' : emailValidation.message && !emailValidation.exists ? 'border-green-500' : ''}`}
                />
                
                {emailValidation.isChecking && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600 animate-spin" />
                )}
                
                {!emailValidation.isChecking && emailValidation.message && !emailValidation.exists && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                )}
                
                {!emailValidation.isChecking && emailValidation.exists && (
                  <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-600" />
                )}
              </div>
              
              {emailValidation.message && (
                <p className={`text-sm flex items-center gap-1 ${emailValidation.exists ? 'text-red-600' : 'text-green-600'}`}>
                  {emailValidation.exists ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                  {emailValidation.message}
                </p>
              )}
              
              {validationErrors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Status Ativo/Inativo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Status
              </Label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    checked={formData.is_active === true}
                    onChange={() => handleInputChange('is_active', true)}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm text-green-600">Ativo</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    checked={formData.is_active === false}
                    onChange={() => handleInputChange('is_active', false)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-red-600">Inativo</span>
                </label>
              </div>
            </div>

            {/* Alterar Senha */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Alterar Senha
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordField(!showPasswordField)}
                  className="h-6 px-2 text-xs"
                >
                  {showPasswordField ? 'Cancelar' : 'Alterar'}
                </Button>
              </div>
              
              {showPasswordField && (
                <div className="space-y-2">
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Nova senha (deixe vazio para manter atual)"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`pl-10 pr-10 ${validationErrors.password ? 'border-red-500' : passwordValidation.isValid ? 'border-green-500' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                  </div>
                  
                  {/* Requisitos da senha */}
                  {formData.password && (
                    <div className="space-y-1">
                      <div className={`text-xs flex items-center gap-1 ${passwordValidation.requirements.length ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordValidation.requirements.length ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 border border-gray-300 rounded-full" />}
                        Pelo menos 6 caracteres
                      </div>
                      <div className={`text-xs flex items-center gap-1 ${passwordValidation.requirements.hasLetter ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordValidation.requirements.hasLetter ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 border border-gray-300 rounded-full" />}
                        Pelo menos 1 letra
                      </div>
                      <div className={`text-xs flex items-center gap-1 ${passwordValidation.requirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordValidation.requirements.hasNumber ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 border border-gray-300 rounded-full" />}
                        Pelo menos 1 número
                      </div>
                    </div>
                  )}
                  
                  {validationErrors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {validationErrors.password}
                    </p>
                  )}

                  {/* ✅ CORRIGIDO: Campo de confirmação aparece junto com campo senha */}
                  {showPasswordField && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">
                        Confirmar Nova Senha *
                      </Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirme a nova senha"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          className={`pl-10 pr-10 ${validationErrors.confirmPassword ? 'border-red-500' : confirmPasswordValidation.passwordsMatch ? 'border-green-500' : ''}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                      </div>
                      
                      {/* Feedback de correspondência de senhas */}
                      {formData.confirmPassword && (
                        <p className={`text-sm flex items-center gap-1 ${confirmPasswordValidation.passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                          {confirmPasswordValidation.passwordsMatch ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {confirmPasswordValidation.message}
                        </p>
                      )}
                      
                      {validationErrors.confirmPassword && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {validationErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Erro geral de submit */}
            {validationErrors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {validationErrors.submit}
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isSubmitting || isLoading}
              >
                Cancelar
              </Button>
              
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!canSubmit}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
});

VendedorEditModal.displayName = 'VendedorEditModal';

export default VendedorEditModal;