import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Shield, Check, Loader2, AlertTriangle, CheckCircle, XCircle, EyeOff, Eye
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
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

// ============================================
// INTERFACES E TIPOS
// ============================================

interface VendedorCreateModalProps extends BaseModalProps {
  onSubmit?: (vendedorData: any) => void;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const VendedorCreateModal: React.FC<VendedorCreateModalProps> = memo(({
  isOpen,
  onClose,
  onSubmit
}) => {
  const { user } = useAuth();
  const { createMember, checkEmailAvailability, isLoading } = useMembersAPI();
  
  // ============================================
  // ESTADOS
  // ============================================
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // ✅ OTIMIZAÇÃO: Hook useDebounce para email
  const [debouncedEmail] = useDebounce(formData.email, 800);

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

  // ============================================
  // VALIDAÇÕES
  // ============================================

  const validatePassword = useCallback((password: string) => {
    const requirements = {
      length: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password)
    };

    const isValid = requirements.length && requirements.hasLetter && requirements.hasNumber;
    
    let message = '';
    if (!isValid) {
      const missing = [];
      if (!requirements.length) missing.push('pelo menos 8 caracteres');
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

  const validateEmail = useCallback(async (email: string) => {
    // ✅ OTIMIZAÇÃO: Validação inteligente - apenas emails com formato válido
    if (!email || !email.includes('@') || email.trim().length < 5) {
      setEmailValidation({
        isChecking: false,
        exists: false,
        message: ''
      });
      return;
    }

    // ✅ LOG OTIMIZADO: Apenas uma chamada por email válido
    console.log('🔍 [EMAIL-VALIDATION] Validando email:', email);

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

      console.log('✅ [EMAIL-VALIDATION] Validação concluída:', {
        email,
        available: response.available
      });
    } catch (error) {
      console.error('❌ [EMAIL-VALIDATION] Erro ao verificar email:', error);
      setEmailValidation({
        isChecking: false,
        exists: false,
        message: 'Erro ao verificar email'
      });
    }
  }, [checkEmailAvailability]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleInputChange = useCallback((field: string, value: string) => {
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

    // ✅ OTIMIZAÇÃO: Remoção da validação duplicada de email
    // Email será validado via useEffect com debouncedEmail

    // Validações específicas por campo (apenas senha)
    if (field === 'password') {
      validatePassword(value);
    }
  }, [validationErrors, validatePassword]);

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

    if (!formData.password.trim()) {
      errors.password = 'Senha é obrigatória';
    } else if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message;
    }

    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Senhas não conferem';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, emailValidation.exists, passwordValidation]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    if (emailValidation.isChecking) {
      return;
    }

    setIsSubmitting(true);

    try {
      const vendedorData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        tenant_id: user?.tenant_id
      };

      const result = await createMember(vendedorData);

      if (result.success) {
        onSubmit?.(result.member);
        handleClose();
      } else {
        setValidationErrors({
          submit: result.error || 'Erro ao criar vendedor'
        });
      }
    } catch (error) {
      console.error('Erro ao criar vendedor:', error);
      setValidationErrors({
        submit: 'Erro interno ao criar vendedor'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, emailValidation.isChecking, formData, user, createMember, onSubmit]);

  const handleClose = useCallback(() => {
    // Reset form
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirmPassword: ''
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
    
    setIsSubmitting(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  }, [onClose]);

  // ============================================
  // EFEITOS OTIMIZADOS
  // ============================================

  // ✅ OTIMIZAÇÃO: useEffect que usa debouncedEmail (800ms)
  useEffect(() => {
    // Valida apenas quando debouncedEmail tem valor e contém @
    if (debouncedEmail && debouncedEmail.includes('@')) {
      validateEmail(debouncedEmail);
    } else if (!debouncedEmail) {
      // Limpa validação quando campo está vazio
      setEmailValidation({
        isChecking: false,
        exists: false,
        message: ''
      });
    }
  }, [debouncedEmail, validateEmail]);

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  const canSubmit = formData.first_name.trim() && 
                   formData.last_name.trim() && 
                   formData.email.trim() && 
                   formData.password.trim() &&
                   formData.confirmPassword.trim() &&
                   formData.password === formData.confirmPassword &&
                   !emailValidation.exists &&
                   passwordValidation.isValid &&
                   !emailValidation.isChecking &&
                   !isSubmitting &&
                   !isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <User className="w-5 h-5 text-blue-600" />
            Novo Vendedor
          </DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo vendedor na equipe
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

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha *
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres com letra e número"
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
                    Pelo menos 8 caracteres
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
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar Senha *
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Digite a senha novamente"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`pl-10 pr-10 ${validationErrors.confirmPassword ? 'border-red-500' : formData.password && formData.confirmPassword && formData.password === formData.confirmPassword ? 'border-green-500' : ''}`}
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
              
              {validationErrors.confirmPassword && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.confirmPassword}
                </p>
              )}

              {/* Indicador de senhas conferem */}
              {formData.password && formData.confirmPassword && (
                <div className="flex items-center gap-1">
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Senhas conferem</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-600">Senhas não conferem</span>
                    </>
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
                    Criando...
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    Criar Vendedor
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

VendedorCreateModal.displayName = 'VendedorCreateModal';

export default VendedorCreateModal;