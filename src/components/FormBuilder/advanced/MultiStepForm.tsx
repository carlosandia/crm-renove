import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { BlurFade } from '@/components/ui/blur-fade';

interface Step {
  id: string;
  title: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    validation?: string;
  }>;
  isOptional?: boolean;
}

interface MultiStepFormProps {
  formId: string;
  steps: Step[];
  onComplete: (data: any) => void;
  onStepChange?: (currentStep: number) => void;
  autoSave?: boolean;
  showProgress?: boolean;
  allowBackNavigation?: boolean;
}

export function MultiStepForm({
  formId,
  steps,
  onComplete,
  onStepChange,
  autoSave = true,
  showProgress = true,
  allowBackNavigation = true
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && Object.keys(formData).length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`form-${formId}-autosave`, JSON.stringify({
          currentStep,
          formData,
          timestamp: new Date().toISOString()
        }));
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [formData, currentStep, formId, autoSave]);

  // Load auto-saved data
  useEffect(() => {
    if (autoSave) {
      const saved = localStorage.getItem(`form-${formId}-autosave`);
      if (saved) {
        try {
          const { currentStep: savedStep, formData: savedData } = JSON.parse(saved);
          setCurrentStep(savedStep);
          setFormData(savedData);
        } catch (error) {
          console.error('Erro ao carregar dados salvos:', error);
        }
      }
    }
  }, [formId, autoSave]);

  // Notify parent of step changes
  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  const validateField = (field: any, value: string): string | null => {
    if (field.required && (!value || value.trim() === '')) {
      return `${field.label} é obrigatório`;
    }

    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'E-mail inválido';
      }
    }

    if (field.type === 'tel' && value) {
      const phoneRegex = /^[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(value)) {
        return 'Telefone inválido';
      }
    }

    if (field.validation && value) {
      try {
        const regex = new RegExp(field.validation);
        if (!regex.test(value)) {
          return `${field.label} não atende aos critérios`;
        }
      } catch (error) {
        console.error('Regex de validação inválida:', error);
      }
    }

    return null;
  };

  const validateCurrentStep = (): boolean => {
    const currentStepData = steps[currentStep];
    const newErrors: Record<string, string> = {};
    let isValid = true;

    currentStepData.fields.forEach(field => {
      const value = formData[field.name] || '';
      const error = validateField(field, value);
      
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setStepValidation(prev => ({ ...prev, [currentStep]: isValid }));
    
    return isValid;
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const prevStep = () => {
    if (allowBackNavigation && currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      // Validar steps anteriores se necessário
      let canProceed = true;
      for (let i = 0; i < stepIndex; i++) {
        if (stepValidation[i] === false) {
          canProceed = false;
          break;
        }
      }
      
      if (canProceed || stepIndex < currentStep) {
        setCurrentStep(stepIndex);
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      await onComplete(formData);
      
      // Clear auto-saved data on successful submission
      if (autoSave) {
        localStorage.removeItem(`form-${formId}-autosave`);
      }
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.name] || '';
    const hasError = errors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                hasError ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {hasError && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {hasError}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                hasError ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {hasError && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {hasError}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                hasError ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Selecione...</option>
              {field.options?.map((option: any) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {hasError && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {hasError}
              </p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option: any) => (
                <label key={option.value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className="focus:ring-blue-500"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {hasError && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {hasError}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress indicator */}
      {showProgress && (
        <BlurFade delay={0.1}>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Etapa {currentStep + 1} de {steps.length}</span>
                  <span>{Math.round(progressPercentage)}% completo</span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
                
                {/* Step indicators */}
                <div className="flex justify-between">
                  {steps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => goToStep(index)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        index === currentStep
                          ? 'bg-blue-500 text-white'
                          : index < currentStep
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                      disabled={index > currentStep && stepValidation[index - 1] === false}
                    >
                      {index < currentStep ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* Current step content */}
      <BlurFade delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {currentStepData.title}
              {currentStepData.isOptional && (
                <Badge variant="outline">Opcional</Badge>
              )}
            </CardTitle>
            {currentStepData.description && (
              <p className="text-muted-foreground">{currentStepData.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStepData.fields.map(field => renderField(field))}
          </CardContent>
        </Card>
      </BlurFade>

      {/* Navigation buttons */}
      <BlurFade delay={0.3}>
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={!allowBackNavigation || currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          <Button
            onClick={nextStep}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Enviando...'
            ) : currentStep === steps.length - 1 ? (
              'Finalizar'
            ) : (
              <>
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </BlurFade>

      {/* Auto-save indicator */}
      {autoSave && Object.keys(formData).length > 0 && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            ✓ Progresso salvo automaticamente
          </p>
        </div>
      )}
    </div>
  );
} 