import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useWatch } from 'react-hook-form';
import { useDebouncedCallback } from 'use-debounce';
import { Building, Target, User, CheckCircle, AlertCircle, Mail, Phone, Globe, MapPin } from 'lucide-react';
import { CompanyModalProps, CompanyModalTab, IndustrySegment } from '../../types/Company';
import { useCompanyForm } from '../../hooks/useCompanyForm';
import CityAutocomplete from '../CityAutocomplete';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';
import { 
  CompanyFormSchema, 
  AdminFormSchema, 
  validateCompanyFormStep,
  type CompanyFormData,
  type AdminFormData
} from '../../shared/schemas/CompanyFormSchema';

// AIDEV-NOTE: Modal aprimorado seguindo padrões UI do StepLeadModal.tsx com Radix UI e Framer Motion

// Lista de nichos/segmentos baseada em CRMs enterprise
const INDUSTRY_SEGMENTS: IndustrySegment[] = [
  // Tecnologia
  { value: 'software', label: 'Software e TI', description: 'Desenvolvimento de software, consultoria em TI', category: 'Tecnologia' },
  { value: 'ecommerce', label: 'E-commerce', description: 'Lojas virtuais, marketplaces', category: 'Tecnologia' },
  { value: 'saas', label: 'SaaS', description: 'Software como serviço', category: 'Tecnologia' },
  { value: 'fintech', label: 'Fintech', description: 'Tecnologia financeira', category: 'Tecnologia' },
  
  // Marketing e Vendas
  { value: 'marketing_digital', label: 'Marketing Digital', description: 'Agências de marketing, publicidade online', category: 'Marketing' },
  { value: 'agencia_publicidade', label: 'Agência de Publicidade', description: 'Criação publicitária, campanhas', category: 'Marketing' },
  { value: 'social_media', label: 'Social Media', description: 'Gestão de redes sociais', category: 'Marketing' },
  { value: 'influencer_marketing', label: 'Influencer Marketing', description: 'Marketing de influência', category: 'Marketing' },
  
  // Consultoria
  { value: 'consultoria_empresarial', label: 'Consultoria Empresarial', description: 'Consultoria estratégica, gestão', category: 'Consultoria' },
  { value: 'consultoria_financeira', label: 'Consultoria Financeira', description: 'Planejamento financeiro, investimentos', category: 'Consultoria' },
  { value: 'consultoria_rh', label: 'Consultoria em RH', description: 'Recursos humanos, recrutamento', category: 'Consultoria' },
  { value: 'coaching', label: 'Coaching', description: 'Coaching pessoal e empresarial', category: 'Consultoria' },
  
  // Educação
  { value: 'educacao_online', label: 'Educação Online', description: 'Cursos online, plataformas de ensino', category: 'Educação' },
  { value: 'treinamento_corporativo', label: 'Treinamento Corporativo', description: 'Capacitação empresarial', category: 'Educação' },
  { value: 'escola_idiomas', label: 'Escola de Idiomas', description: 'Ensino de idiomas', category: 'Educação' },
  
  // Saúde e Bem-estar
  { value: 'clinica_medica', label: 'Clínica Médica', description: 'Serviços médicos, clínicas', category: 'Saúde' },
  { value: 'estetica', label: 'Estética e Beleza', description: 'Clínicas de estética, salões', category: 'Saúde' },
  { value: 'fitness', label: 'Fitness', description: 'Academias, personal trainer', category: 'Saúde' },
  { value: 'nutricao', label: 'Nutrição', description: 'Consultoria nutricional', category: 'Saúde' },
  
  // Imobiliário
  { value: 'imobiliaria', label: 'Imobiliária', description: 'Venda e locação de imóveis', category: 'Imobiliário' },
  { value: 'construcao', label: 'Construção Civil', description: 'Construtoras, engenharia', category: 'Imobiliário' },
  { value: 'arquitetura', label: 'Arquitetura', description: 'Projetos arquitetônicos', category: 'Imobiliário' },
  
  // Serviços
  { value: 'juridico', label: 'Jurídico', description: 'Escritórios de advocacia', category: 'Serviços' },
  { value: 'contabilidade', label: 'Contabilidade', description: 'Serviços contábeis', category: 'Serviços' },
  { value: 'turismo', label: 'Turismo', description: 'Agências de viagem, turismo', category: 'Serviços' },
  { value: 'eventos', label: 'Eventos', description: 'Organização de eventos', category: 'Serviços' },
  
  // Outros
  { value: 'outros', label: 'Outros', description: 'Outros segmentos não listados', category: 'Outros' }
];

const CompanyFormModal: React.FC<CompanyModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  company, 
  mode 
}) => {
  const [activeTab, setActiveTab] = useState('company');
  
  // ✅ PADRÃO SEGUINDO StepLeadModal: Animações motion.div
  const tabVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };
  
  const stepIndicatorVariants = {
    initial: { scale: 0.8 },
    animate: { scale: 1 },
    hover: { scale: 1.05 }
  };

  // ✅ PERFORMANCE FIX: React Hook Form com configurações otimizadas para melhor performance
  const form = useForm({
    mode: 'onBlur', // ✅ CORREÇÃO: Valida apenas no blur - elimina bordas verdes prematuras
    reValidateMode: 'onBlur', // ✅ Re-valida apenas no blur, não em cada keystroke
    criteriaMode: 'firstError', // ✅ Para na primeira validação que falha
    shouldFocusError: false, // ✅ Desabilita auto-focus para evitar interferência de UX
    defaultValues: {
      // Company data
      name: '',
      segmento: '',
      city: '',
      state: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      expected_leads_monthly: 0,
      expected_sales_monthly: 0,
      expected_followers_monthly: 0,
      // Admin data
      admin_name: '',
      admin_email: '',
      admin_password: '',
      admin_confirmPassword: ''
    }
  });

  const { control, handleSubmit: handleRHFSubmit, setValue, getValues, reset } = form;

  // ✅ PERFORMANCE OPTIMIZATION: useWatch com exact: true para eliminar loops
  const watchedEmail = useWatch({
    control,
    name: 'admin_email',
    exact: true // Crítico para performance - evita re-renders desnecessários
  });

  const watchedCompanyFields = useWatch({
    control,
    name: ['name', 'segmento', 'city', 'state'],
    exact: true // Crítico para performance
  });

  // ✅ OTIMIZAÇÃO: useWatch específico para campos de admin
  const watchedAdminFields = useWatch({
    control,
    name: ['admin_name', 'admin_password', 'admin_confirmPassword'],
    exact: true // Evita re-renders desnecessários
  });

  // Legacy formData para compatibilidade (será removido gradualmente - usar watches específicos)
  const formData = getValues();

  const [emailValidation, setEmailValidation] = useState({
    isChecking: false,
    exists: false,
    message: ''
  });

  const { isSubmitting, submitCompanyForm, checkEmailAvailability } = useCompanyForm();

  // ✅ CORREÇÃO PHASE 1: UTILITY FUNCTIONS usando React Hook Form
  // ✅ CORREÇÃO: Permitir dirty para campos da empresa funcionarem corretamente
  const updateFormField = useCallback((field: string, value: any) => {
    // ✅ CORREÇÃO: shouldDirty: true para campos da empresa, false apenas para admin
    const isAdminField = field.startsWith('admin_');
    setValue(field as any, value, { 
      shouldDirty: !isAdminField, // admin fields false, company fields true
      shouldValidate: false 
    });
  }, [setValue]);

  // ✅ CONSOLIDAÇÃO: updateFieldWithDebounce removido - agora usamos validação unificada

  const handleCityChange = useCallback((cityState: string) => {
    const [city, state] = cityState.split('/');
    setValue('city', city || '', { shouldDirty: true });
    setValue('state', state || '', { shouldDirty: true });
  }, [setValue]);

  const resetForm = useCallback(() => {
    reset({
      name: '',
      segmento: '',
      city: '',
      state: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      expected_leads_monthly: 0,
      expected_sales_monthly: 0,
      expected_followers_monthly: 0,
      admin_name: '',
      admin_email: '',
      admin_password: '',
      admin_confirmPassword: ''
    });
    // ✅ CONSOLIDAÇÃO: Resetar todos os estados de validação
    setTouchedFields({});
    setValidationErrors({});
    setIsTyping({});
  }, [reset]);

  const resetValidations = useCallback(() => {
    setEmailValidation({ isChecking: false, exists: false, message: '' });
    setValidationErrors({});
    setTouchedFields({});
    setIsTyping({});
  }, []);

  // ✅ CORREÇÃO PHASE 1: Carregar dados da empresa usando React Hook Form
  useEffect(() => {
    if (isOpen && company && mode === 'edit') {
      reset({
        name: company.name || '',
        segmento: company.segmento || '',
        city: company.city || '',
        state: company.state || '',
        website: company.website || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        expected_leads_monthly: company.expected_leads_monthly || 0,
        expected_sales_monthly: company.expected_sales_monthly || 0,
        expected_followers_monthly: company.expected_followers_monthly || 0,
        admin_name: '',
        admin_email: '',
        admin_password: '',
        admin_confirmPassword: ''
      });
    } else if (isOpen && mode === 'create') {
      resetForm();
      resetValidations();
    }
  }, [isOpen, company, mode, reset]);

  // ✅ CONSOLIDAÇÃO: Sistema unificado Zod + touchedFields 
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  
  // ✅ PERFORMANCE: Flag simplificada para evitar validação durante digitação rápida
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  
  // ✅ CONSOLIDAÇÃO: Funções de controle unificadas para touchedFields
  const markFieldAsTouched = useCallback((fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  }, []);
  
  const shouldShowError = useCallback((fieldName: string) => {
    return touchedFields[fieldName] && !isTyping[fieldName];
  }, [touchedFields, isTyping]);
  
  // ✅ CONSOLIDAÇÃO: Sistema unificado de validação Zod + touchedFields otimizado
  const validateField = useCallback(async (fieldName: string, value: any, isAdminField = false) => {
    // Não validar se ainda está digitando
    if (isTyping[fieldName]) return;
    
    try {
      if (isAdminField) {
        // Validação admin usando AdminFormSchema
        const adminData = { 
          name: fieldName === 'admin_name' ? value : formData.admin_name,
          email: fieldName === 'admin_email' ? value : formData.admin_email,
          password: fieldName === 'admin_password' ? value : formData.admin_password,
          confirmPassword: fieldName === 'admin_confirmPassword' ? value : formData.admin_confirmPassword
        };
        const result = AdminFormSchema.safeParse(adminData);
        
        if (!result.success) {
          const fieldError = result.error.errors.find(e => {
            const path = e.path[0] as string;
            return (path === 'name' && fieldName === 'admin_name') || 
                   (path === 'email' && fieldName === 'admin_email') ||
                   (path === 'password' && fieldName === 'admin_password') ||
                   (path === 'confirmPassword' && fieldName === 'admin_confirmPassword');
          });
          
          if (fieldError) {
            setValidationErrors(prev => ({ ...prev, [fieldName]: fieldError.message }));
          }
        } else {
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
          });
        }
        
        // Validação especial de email availability
        if (fieldName === 'admin_email' && value && mode === 'create') {
          setEmailValidation({ isChecking: true, exists: false, message: 'Verificando disponibilidade...' });
          
          try {
            const availabilityResult = await checkEmailAvailability(value);
            setEmailValidation({
              isChecking: false,
              exists: !availabilityResult.available,
              message: availabilityResult.message
            });
          } catch (error) {
            setEmailValidation({ isChecking: false, exists: false, message: 'Erro na verificação' });
          }
        }
      } else {
        // Validação company usando CompanyFormSchema
        const companyData = { ...formData, [fieldName]: value };
        const result = CompanyFormSchema.safeParse(companyData);
        
        if (!result.success) {
          const fieldError = result.error.errors.find(e => e.path[0] === fieldName);
          if (fieldError) {
            setValidationErrors(prev => ({ ...prev, [fieldName]: fieldError.message }));
          }
        } else {
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ [Validation] Erro na validação do campo:', fieldName, error);
    }
  }, [formData, isTyping, mode, checkEmailAvailability]);

  // ✅ CONSOLIDAÇÃO: Validação otimizada com debounce por campo
  const debouncedValidateField = useDebouncedCallback(
    (fieldName: string, value: any, isAdminField = false) => {
      if (touchedFields[fieldName]) {
        validateField(fieldName, value, isAdminField);
      }
    },
    800, // Debounce mais longo para evitar validações excessivas
    { leading: false, trailing: true, maxWait: 1200 }
  );

  // SUBMIT HANDLER
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validações básicas
      if (!formData.name || !formData.segmento || !formData.city || !formData.state) {
        throw new Error('Preencha todos os campos obrigatórios da empresa');
      }

      if (mode === 'create' && (!watchedAdminFields[0] || !watchedEmail || !watchedAdminFields[1] || !watchedAdminFields[2])) {
        throw new Error('Preencha todos os campos obrigatórios do administrador');
      }

      if (mode === 'create' && watchedAdminFields[1] !== watchedAdminFields[2]) {
        throw new Error('As senhas não conferem');
      }

      if (mode === 'create' && watchedAdminFields[1] && watchedAdminFields[1].length < 8) {
        throw new Error('A senha deve ter pelo menos 8 caracteres');
      }

      if (mode === 'create' && emailValidation.exists) {
        throw new Error('Email já está em uso por outro administrador');
      }

      // Preparar dados da empresa
      const companyData = {
        name: formData.name,
        segmento: formData.segmento,
        city: formData.city,
        state: formData.state,
        website: formData.website,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        expected_leads_monthly: formData.expected_leads_monthly,
        expected_sales_monthly: formData.expected_sales_monthly,
        expected_followers_monthly: formData.expected_followers_monthly
      };

      // Preparar dados do admin (apenas para criação)
      const adminData = mode === 'create' ? {
        name: formData.admin_name,
        email: formData.admin_email,
        password: formData.admin_password // Usar senha obrigatória do formulário
      } : undefined;

      // Submeter formulário
      const result = await submitCompanyForm(companyData, adminData);
      
      if (result.success) {
        // ✅ PERFORMANCE FIX: Eventos sem logs desnecessários durante operação
        
        // Disparar evento customizado imediatamente
        window.dispatchEvent(new CustomEvent('force-refresh-companies', {
          detail: { 
            source: 'CompanyFormModal',
            companyName: companyData.name,
            timestamp: new Date().toISOString()
          }
        }));
        
        // Chamada de sucesso com delay para garantir processamento
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 100);
        
        // Força múltiplos refreshes com intervalos diferentes
        [200, 500, 1000, 2000].forEach((delay, index) => {
          setTimeout(() => {
            console.log(`🔄 [CompanyFormModal] Disparando refresh adicional ${index + 1}...`);
            window.dispatchEvent(new CustomEvent('force-refresh-companies', {
              detail: { 
                source: 'CompanyFormModal',
                retry: index + 1,
                companyName: companyData.name,
                timestamp: new Date().toISOString()
              }
            }));
          }, delay);
        });
      } else {
        throw new Error(result.message || 'Erro ao processar formulário');
      }

    } catch (error: any) {
      console.error('Erro na submissão:', error);
      // O hook já mostra o toast de erro
    }
  };

  const handleClose = useCallback(() => {
    setActiveTab('company');
    resetForm();
    resetValidations();
    onClose();
  }, [resetForm, resetValidations, onClose]);

  // ✅ CORREÇÃO PHASE 1: Otimização com useWatch - elimina calls repetitivos
  const canProceedToNextTab = useCallback(() => {
    try {
      if (activeTab === 'company') {
        // ✅ PERFORMANCE: Usar watchedCompanyFields ao invés de getValues repetitivos
        const [name, segmento, city, state] = watchedCompanyFields;
        const hasRequiredFields = name?.trim() && 
                                segmento?.trim() && 
                                city?.trim() && 
                                state?.trim();
        
        // ✅ PERFORMANCE FIX: Validação otimizada sem logs durante digitação
        return hasRequiredFields;
      }
      if (activeTab === 'expectations') {
        return true; // Expectativas são opcionais
      }
      if (activeTab === 'admin' && mode === 'create') {
        // ✅ PERFORMANCE: Usar watchedEmail ao invés de formData.admin_email
        const currentFormData = getValues();
        const hasAdminBasics = currentFormData.admin_name?.trim() && 
                             watchedEmail?.trim() && 
                             !emailValidation.exists;
        
        return hasAdminBasics;
      }
      return true;
    } catch (error) {
      console.warn('⚠️ [Validation] Erro ao verificar progresso da aba:', error);
      return false;
    }
  }, [activeTab, watchedCompanyFields, watchedEmail, emailValidation.exists, mode, getValues]);

  const handleNextTab = () => {
    if (activeTab === 'company' && canProceedToNextTab()) {
      setActiveTab('expectations');
    } else if (activeTab === 'expectations') {
      setActiveTab('admin');
    }
  };

  // Agrupar segmentos por categoria
  // ✅ PHASE 3: Otimização useMemo para computação cara de segmentos
  const segmentsByCategory = useMemo(() => 
    INDUSTRY_SEGMENTS.reduce((acc, segment) => {
      if (!acc[segment.category]) {
        acc[segment.category] = [];
      }
      acc[segment.category].push(segment);
      return acc;
    }, {} as Record<string, IndustrySegment[]>)
  , []);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-hidden"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            {mode === 'create' ? 'Nova Empresa' : 'Editar Empresa'}
          </DialogTitle>
        </DialogHeader>

        {/* ✅ STEP INDICATOR seguindo padrões StepLeadModal - CORREÇÃO PRIORIDADE 2: Alinhamento */}
        <div className="flex items-center justify-center mb-8 px-4">
          {[
            { id: 'company', label: 'Empresa', icon: Building, step: 1 },
            { id: 'expectations', label: 'Expectativas', icon: Target, step: 2 },
            { id: 'admin', label: 'Admin', icon: User, step: 3 }
          ].map((step, index) => {
            const Icon = step.icon;
            const isActive = activeTab === step.id;
            const isCompleted = ['company', 'expectations'].includes(step.id) && activeTab === 'admin';
            const isDisabled = step.id === 'admin' && mode === 'edit';
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <motion.div
                    variants={stepIndicatorVariants}
                    initial="initial"
                    animate={isActive ? "animate" : "initial"}
                    whileHover={!isDisabled ? "hover" : undefined}
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center relative cursor-pointer transition-all duration-300
                      ${isActive ? 'bg-blue-600 text-white shadow-lg' : ''}
                      ${isCompleted ? 'bg-green-600 text-white' : ''}
                      ${!isActive && !isCompleted && !isDisabled ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : ''}
                      ${isDisabled ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !isDisabled && setActiveTab(step.id)}
                  >
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-blue-300"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.3, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                    {isCompleted && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <CheckCircle className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </motion.div>
                  
                  {/* ✅ CORREÇÃO PRIORIDADE 2: Label centralizada abaixo do círculo */}
                  <span className={`text-xs font-medium mt-2 ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                
                {/* ✅ CORREÇÃO PRIORIDADE 2: Linha conectora com espaçamento correto */}
                {index < 2 && (
                  <div className={`
                    w-16 h-0.5 mx-6 self-start mt-6 transition-all duration-300
                    ${isCompleted || (index === 0 && activeTab !== 'company') ? 'bg-green-600' : 'bg-gray-200'}
                  `} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="hidden">
            <TabsTrigger value="company">Empresa</TabsTrigger>
            <TabsTrigger value="expectations">Expectativas</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-1">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ✅ COMPANY TAB com animações Framer Motion */}
              <TabsContent value="company" className="space-y-6">
                <motion.div
                  variants={tabVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  {/* ✅ CORREÇÃO PRIORIDADE 3: Alert com styling como título, não como input */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Building className="w-5 h-5" />
                      <h3 className="font-medium text-lg">
                        Configure os dados principais da empresa
                      </h3>
                    </div>
                    <p className="text-blue-600 text-sm mt-1 ml-7">
                      Será cadastrada no sistema com as informações abaixo.
                    </p>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Empresa *</Label>
                    <div className="relative">
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          // ✅ CONSOLIDAÇÃO: Update imediato + validação debounced unificada
                          updateFormField('name', value);
                          setIsTyping(prev => ({ ...prev, name: true }));
                          
                          // Debounce para validação
                          setTimeout(() => setIsTyping(prev => ({ ...prev, name: false })), 300);
                          debouncedValidateField('name', value, false);
                        }}
                        onBlur={() => markFieldAsTouched('name')}
                        placeholder="Ex: Empresa LTDA"
                        required
                        className={`
                          peer transition-all duration-200
                          focus:border-blue-500 hover:border-gray-400
                          ${validationErrors.name && shouldShowError('name') 
                            ? 'border-red-500 focus:border-red-500 user-invalid:border-red-500' 
                            : ''
                          }
                        `}
                      />
                      <Building className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 peer-focus:text-blue-500" />
                    </div>
                    {validationErrors.name && shouldShowError('name') && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.name}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="segmento">Segmento *</Label>
                    <Select 
                      value={formData.segmento} 
                      onValueChange={(value) => {
                        updateFormField('segmento', value);
                        markFieldAsTouched('segmento');
                      }}
                    >
                      <SelectTrigger className={validationErrors.segmento && shouldShowError('segmento') ? 'border-red-500 focus:border-red-500' : ''}>
                        <SelectValue placeholder="Selecione o segmento" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(segmentsByCategory).map(([category, segments]) => (
                          <div key={category}>
                            <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                              {category}
                            </div>
                            {segments.map((segment) => (
                              <SelectItem key={segment.value} value={segment.value}>
                                <div className="flex flex-col">
                                  <span>{segment.label}</span>
                                  <span className="text-xs text-muted-foreground">{segment.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.segmento && shouldShowError('segmento') && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.segmento}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade/Estado *</Label>
                    <CityAutocomplete
                      value={formData.city && formData.state ? `${formData.city}/${formData.state}` : ''}
                      onChange={handleCityChange}
                      placeholder="Digite a cidade..."
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateFormField('website', value);
                          setIsTyping(prev => ({ ...prev, website: true }));
                          setTimeout(() => setIsTyping(prev => ({ ...prev, website: false })), 300);
                          debouncedValidateField('website', value, false);
                        }}
                        placeholder="https://www.empresa.com.br"
                        className="
                          peer transition-all duration-200
                          focus:border-blue-500 hover:border-gray-400
                        "
                      />
                      <Globe className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 peer-focus:text-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateFormField('phone', value);
                          setIsTyping(prev => ({ ...prev, phone: true }));
                          setTimeout(() => setIsTyping(prev => ({ ...prev, phone: false })), 300);
                          debouncedValidateField('phone', value, false);
                        }}
                        placeholder="(11) 99999-9999"
                        className="
                          peer transition-all duration-200
                          focus:border-blue-500 hover:border-gray-400
                        "
                      />
                      <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 peer-focus:text-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email da Empresa</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          const value = e.target.value;
                          // ✅ CONSOLIDAÇÃO: Update imediato + validação debounced unificada
                          updateFormField('email', value);
                          setIsTyping(prev => ({ ...prev, email: true }));
                          
                          // Debounce para validação
                          setTimeout(() => setIsTyping(prev => ({ ...prev, email: false })), 300);
                          debouncedValidateField('email', value, false);
                        }}
                        onBlur={() => markFieldAsTouched('email')}
                        placeholder="contato@empresa.com.br"
                        className={`
                          peer transition-all duration-200
                          focus:border-blue-500 hover:border-gray-400
                          ${validationErrors.email && shouldShowError('email') ? 'border-red-500' : ''}
                        `}
                      />
                      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 peer-focus:text-blue-500" />
                    </div>
                    {validationErrors.email && shouldShowError('email') && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.email}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Endereço Completo</Label>
                    <div className="relative">
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateFormField('address', value);
                          setIsTyping(prev => ({ ...prev, address: true }));
                          setTimeout(() => setIsTyping(prev => ({ ...prev, address: false })), 300);
                          debouncedValidateField('address', value, false);
                        }}
                        placeholder="Rua, número, bairro, CEP..."
                        rows={3}
                        className="
                          peer transition-all duration-200
                          focus:border-blue-500 hover:border-gray-400
                        "
                      />
                      <MapPin className="absolute right-3 top-3 w-4 h-4 text-gray-400 peer-focus:text-blue-500" />
                    </div>
                  </div>
                </div>
                </motion.div>
              </TabsContent>

              {/* ✅ EXPECTATIONS TAB com animações Framer Motion */}
              <TabsContent value="expectations" className="space-y-6">
                <motion.div
                  variants={tabVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  {/* ✅ CORREÇÃO PRIORIDADE 3: Alert com styling como título */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Target className="w-5 h-5" />
                      <h3 className="font-medium text-lg">
                        Expectativas mensais da empresa
                      </h3>
                    </div>
                    <p className="text-amber-600 text-sm mt-1 ml-7">
                      Configure as metas para acompanhamento de performance.
                    </p>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="leads">Leads Esperados/Mês</Label>
                    <div className="relative">
                      <Input
                        id="leads"
                        type="number"
                        min="0"
                        value={formData.expected_leads_monthly || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateFormField('expected_leads_monthly', value === '' ? 0 : Number(value));
                          setIsTyping(prev => ({ ...prev, expected_leads_monthly: true }));
                          setTimeout(() => setIsTyping(prev => ({ ...prev, expected_leads_monthly: false })), 300);
                          debouncedValidateField('expected_leads_monthly', value, false);
                        }}
                        placeholder="Ex: 100"
                        className="
                          peer transition-all duration-200
                          focus:border-blue-500 hover:border-gray-400
                        "
                      />
                      <Target className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 peer-focus:text-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sales">Vendas Esperadas/Mês</Label>
                    <div className="relative">
                      <Input
                        id="sales"
                        type="number"
                        min="0"
                        value={formData.expected_sales_monthly || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateFormField('expected_sales_monthly', value === '' ? 0 : Number(value));
                          setIsTyping(prev => ({ ...prev, expected_sales_monthly: true }));
                          setTimeout(() => setIsTyping(prev => ({ ...prev, expected_sales_monthly: false })), 300);
                          debouncedValidateField('expected_sales_monthly', value, false);
                        }}
                        placeholder="Ex: 20"
                        className="
                          peer transition-all duration-200
                          focus:border-blue-500 hover:border-gray-400
                        "
                      />
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 peer-focus:text-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="followers">Seguidores Esperados/Mês</Label>
                    <div className="relative">
                      <Input
                        id="followers"
                        type="number"
                        min="0"
                        value={formData.expected_followers_monthly || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateFormField('expected_followers_monthly', value === '' ? 0 : Number(value));
                          setIsTyping(prev => ({ ...prev, expected_followers_monthly: true }));
                          setTimeout(() => setIsTyping(prev => ({ ...prev, expected_followers_monthly: false })), 300);
                          debouncedValidateField('expected_followers_monthly', value, false);
                        }}
                        placeholder="Ex: 500"
                        className="
                          peer transition-all duration-200
                          focus:border-blue-500 hover:border-gray-400
                        "
                      />
                      <User className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 peer-focus:text-blue-500" />
                    </div>
                  </div>
                </div>
                </motion.div>
              </TabsContent>

              {/* ✅ ADMIN TAB com animações Framer Motion */}
              <TabsContent value="admin" className="space-y-6">
                <motion.div
                  variants={tabVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  {mode === 'create' && (
                    <>
                      {/* ✅ CORREÇÃO: Alert para criação ativa imediata */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 text-green-800">
                          <User className="w-5 h-5" />
                          <h3 className="font-medium text-lg">
                            Administrador da empresa
                          </h3>
                        </div>
                        <p className="text-green-600 text-sm mt-1 ml-7">
                          Configure o responsável. O administrador será criado e ficará ativo imediatamente.
                        </p>
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="admin_name">Nome do Administrador *</Label>
                        <Input
                          id="admin_name"
                          value={formData.admin_name}
                          onChange={(e) => {
                            const value = e.target.value;
                            // ✅ CONSOLIDAÇÃO: Update imediato + validação debounced unificada
                            updateFormField('admin_name', value);
                            setIsTyping(prev => ({ ...prev, admin_name: true }));
                            
                            // Debounce para validação
                            setTimeout(() => setIsTyping(prev => ({ ...prev, admin_name: false })), 300);
                            debouncedValidateField('admin_name', value, true);
                          }}
                          onBlur={() => {
                            markFieldAsTouched('admin_name');
                            setIsTyping(prev => ({ ...prev, admin_name: false }));
                          }}
                          placeholder="Nome completo"
                          required
                          className={validationErrors.admin_name && shouldShowError('admin_name') && !isTyping.admin_name ? 'border-red-500 focus:border-red-500' : ''}
                        />
                        {validationErrors.admin_name && shouldShowError('admin_name') && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-500 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.admin_name}
                          </motion.p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin_email">Email do Administrador *</Label>
                        <div className="relative">
                          <Input
                            id="admin_email"
                            type="email"
                            value={watchedEmail || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              // ✅ CONSOLIDAÇÃO: Update imediato + validação debounced unificada
                              updateFormField('admin_email', value);
                              setIsTyping(prev => ({ ...prev, admin_email: true }));
                              
                              // Debounce para validação (mais longo para email)
                              setTimeout(() => setIsTyping(prev => ({ ...prev, admin_email: false })), 500);
                              debouncedValidateField('admin_email', value, true);
                            }}
                            onBlur={() => {
                              markFieldAsTouched('admin_email');
                              setIsTyping(prev => ({ ...prev, admin_email: false }));
                            }}
                            placeholder="admin@empresa.com.br"
                            required
                            className={`
                              group peer transition-all duration-200 
                              ${((validationErrors.admin_email && shouldShowError('admin_email')) || emailValidation.exists) && !isTyping.admin_email
                                ? 'border-red-500 focus:border-red-500 user-invalid:border-red-500' 
                                : ''
                              }
                              ${emailValidation.message && emailValidation.exists === false && !emailValidation.isChecking && emailValidation.message?.includes('disponível')
                                ? 'border-green-500 focus:border-green-500'
                                : ''
                              }
                              ${emailValidation.isChecking ? 'border-amber-500 focus:border-amber-500' : ''}
                            `}
                          />
                          
                          {/* ✅ PHASE 2: Magic UI loading indicator */}
                          {emailValidation.isChecking && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute right-3 top-0 bottom-0 flex items-center justify-center"
                            >
                              <motion.div
                                className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                            </motion.div>
                          )}
                          
                          {/* ✅ PHASE 2: Magic UI success indicator */}
                          {emailValidation.message && emailValidation.exists === false && !emailValidation.isChecking && emailValidation.message?.includes('disponível') && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute right-3 top-0 bottom-0 flex items-center justify-center"
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </motion.div>
                          )}
                          
                          {/* ✅ PHASE 2: Magic UI error indicator */}
                          {emailValidation.exists && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute right-3 top-0 bottom-0 flex items-center justify-center"
                            >
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            </motion.div>
                          )}
                        </div>
                        
                        {/* ✅ PHASE 2: Feedback específico com Magic UI patterns */}
                        <AnimatePresence>
                          {validationErrors.admin_email && shouldShowError('admin_email') && (
                            <motion.p 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="text-sm text-red-500 flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3" />
                              {validationErrors.admin_email}
                            </motion.p>
                          )}
                          
                          {emailValidation.message && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className={`
                                text-xs flex items-center gap-1
                                ${emailValidation.exists === true || emailValidation.message?.includes('Erro') || emailValidation.message?.includes('erro') || emailValidation.message?.includes('já está em uso') || emailValidation.message?.includes('já é administrador')
                                  ? 'text-red-500'
                                  : emailValidation.isChecking
                                    ? 'text-amber-600'
                                    : emailValidation.exists === false && emailValidation.message?.includes('disponível') 
                                      ? 'text-green-600'
                                      : 'text-gray-600'
                                }
                              `}
                            >
                              {emailValidation.isChecking && (
                                <motion.div
                                  className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                              )}
                              {!emailValidation.isChecking && emailValidation.exists === false && emailValidation.message?.includes('disponível') && (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              {(emailValidation.exists === true || emailValidation.message?.includes('Erro') || emailValidation.message?.includes('erro') || emailValidation.message?.includes('já está em uso') || emailValidation.message?.includes('já é administrador')) && (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {emailValidation.message}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin_password">Senha do Administrador *</Label>
                        <Input
                          id="admin_password"
                          type="password"
                          value={formData.admin_password}
                          onChange={(e) => {
                            const value = e.target.value;
                            // ✅ CONSOLIDAÇÃO: Update imediato + validação debounced unificada
                            updateFormField('admin_password', value);
                            setIsTyping(prev => ({ ...prev, admin_password: true }));
                            
                            // Validar confirmação de senha se já foi preenchida
                            if (watchedAdminFields[2] && value !== watchedAdminFields[2]) {
                              setValidationErrors(prev => ({ ...prev, admin_confirmPassword: 'Senhas não conferem' }));
                            } else if (watchedAdminFields[2] && value === watchedAdminFields[2] && value) {
                              setValidationErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.admin_confirmPassword;
                                return newErrors;
                              });
                            }
                            
                            // Debounce para validação
                            setTimeout(() => setIsTyping(prev => ({ ...prev, admin_password: false })), 300);
                            debouncedValidateField('admin_password', value, true);
                          }}
                          onBlur={() => {
                            markFieldAsTouched('admin_password');
                            setIsTyping(prev => ({ ...prev, admin_password: false }));
                          }}
                          placeholder="Mínimo 8 caracteres"
                          required
                          className={validationErrors.admin_password && shouldShowError('admin_password') && !isTyping.admin_password ? 'border-red-500 focus:border-red-500' : ''}
                        />
                        {validationErrors.admin_password && shouldShowError('admin_password') && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-500 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.admin_password}
                          </motion.p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin_confirmPassword">Confirmar Senha *</Label>
                        <Input
                          id="admin_confirmPassword"
                          type="password"
                          value={formData.admin_confirmPassword}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateFormField('admin_confirmPassword', value);
                            setIsTyping(prev => ({ ...prev, admin_confirmPassword: true }));
                            
                            // Validação especial para confirmação de senha
                            if (watchedAdminFields[1] && value && watchedAdminFields[1] !== value) {
                              setValidationErrors(prev => ({ ...prev, admin_confirmPassword: 'Senhas não conferem' }));
                            } else if (watchedAdminFields[1] === value && value) {
                              setValidationErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.admin_confirmPassword;
                                return newErrors;
                              });
                            }
                            
                            // Debounce para validação
                            setTimeout(() => setIsTyping(prev => ({ ...prev, admin_confirmPassword: false })), 300);
                            debouncedValidateField('admin_confirmPassword', value, true);
                          }}
                          onBlur={() => {
                            markFieldAsTouched('admin_confirmPassword');
                            setIsTyping(prev => ({ ...prev, admin_confirmPassword: false }));
                          }}
                          placeholder="Repita a senha"
                          required
                          className={validationErrors.admin_confirmPassword && shouldShowError('admin_confirmPassword') && !isTyping.admin_confirmPassword ? 'border-red-500 focus:border-red-500' : ''}
                        />
                        {validationErrors.admin_confirmPassword && shouldShowError('admin_confirmPassword') && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-500 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.admin_confirmPassword}
                          </motion.p>
                        )}
                        {/* Indicador de senhas conferem */}
                        {watchedAdminFields[1] && watchedAdminFields[2] && (
                          <div className="mt-1 flex items-center space-x-1">
                            {watchedAdminFields[1] === watchedAdminFields[2] ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                <span className="text-xs text-green-600">Senhas conferem</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 text-red-500" />
                                <span className="text-xs text-red-600">Senhas não conferem</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    </>
                  )}
                  
                  {mode === 'edit' && (
                    <Alert>
                      <User className="w-4 h-4" />
                      <AlertDescription>
                        O administrador só pode ser definido durante a criação da empresa.
                      </AlertDescription>
                    </Alert>
                  )}
                </motion.div>
              </TabsContent>
            </form>
          </div>
        </Tabs>

        {/* ✅ FOOTER com animações de botões seguindo StepLeadModal */}
        <DialogFooter>
          <motion.div 
            className="flex gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            
            {activeTab !== 'admin' && canProceedToNextTab() && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button onClick={handleNextTab}>
                  Próximo
                </Button>
              </motion.div>
            )}
            
            {(activeTab === 'admin' || mode === 'edit') && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={handleSubmit} 
                  disabled={
                    isSubmitting || 
                    (mode === 'create' && emailValidation.exists) ||
                    (mode === 'create' && (!watchedAdminFields[0] || !watchedEmail || !watchedAdminFields[1] || !watchedAdminFields[2] || watchedAdminFields[1] !== watchedAdminFields[2]))
                  }
                  className="relative overflow-hidden"
                >
                  {isSubmitting && (
                    <motion.div
                      className="absolute inset-0 bg-blue-600"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                  {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar Empresa' : 'Salvar Alterações'}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ✅ PHASE 3: Componentes memoizados para otimização de performance
const MemoizedFormField = React.memo<{
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
  showError?: boolean;
  icon?: React.ReactNode;
}>(({ id, label, type = "text", value, onChange, onBlur, placeholder, required, className, error, showError, icon }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label} {required && '*'}</Label>
    <div className="relative">
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        className={`
          peer transition-all duration-200
          focus:border-blue-500 hover:border-gray-400
          ${error && showError 
            ? 'border-red-500 focus:border-red-500 user-invalid:border-red-500' 
            : ''
          }
          ${className || ''}
        `}
      />
      {icon && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 peer-focus:text-blue-500">
          {icon}
        </div>
      )}
    </div>
    {error && showError && (
      <motion.p 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-red-500 flex items-center gap-1"
      >
        <AlertCircle className="w-3 h-3" />
        {error}
      </motion.p>
    )}
  </div>
));

MemoizedFormField.displayName = 'MemoizedFormField';

const MemoizedTabContent = React.memo<{
  children: React.ReactNode;
  variants: any;
}>(({ children, variants }) => (
  <motion.div
    variants={variants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
));

MemoizedTabContent.displayName = 'MemoizedTabContent';

// ✅ PHASE 3: Componente principal otimizado com React.memo
const OptimizedCompanyFormModal = React.memo(CompanyFormModal);

OptimizedCompanyFormModal.displayName = 'OptimizedCompanyFormModal';

export default OptimizedCompanyFormModal;