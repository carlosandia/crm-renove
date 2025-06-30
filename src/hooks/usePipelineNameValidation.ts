import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface PipelineNameValidation {
  is_valid: boolean;
  error?: string;
  suggestion?: string;
  similar_names?: string[];
}

export interface ValidationState {
  isValidating: boolean;
  validation: PipelineNameValidation | null;
  hasChecked: boolean;
}

export const usePipelineNameValidation = (initialName: string = '', pipelineId?: string) => {
  const { authenticatedFetch } = useAuth();
  const [name, setName] = useState(initialName);
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    validation: null,
    hasChecked: false
  });

  // Debounce timer
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  /**
   * Função principal de validação - chama a API backend
   */
  const validateName = useCallback(async (nameToValidate: string): Promise<PipelineNameValidation | null> => {
    if (!nameToValidate.trim()) {
      return {
        is_valid: false,
        error: 'Nome da pipeline é obrigatório'
      };
    }

    if (!authenticatedFetch) {
      console.warn('⚠️ [usePipelineNameValidation] authenticatedFetch não disponível');
      return null;
    }

    try {
      console.log('🔍 [usePipelineNameValidation] Validando nome:', {
        name: nameToValidate,
        pipelineId: pipelineId || 'novo'
      });

      const params = new URLSearchParams({
        name: nameToValidate.trim()
      });

      if (pipelineId) {
        params.append('pipeline_id', pipelineId);
      }

      const response = await authenticatedFetch(`/pipelines/validate-name?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`API retornou: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.validation) {
        console.log('✅ [usePipelineNameValidation] Validação recebida:', {
          is_valid: data.validation.is_valid,
          has_error: !!data.validation.error,
          has_suggestion: !!data.validation.suggestion,
          similar_names_count: data.validation.similar_names?.length || 0
        });

        return data.validation;
      }

      throw new Error('Resposta inválida da API');

    } catch (error) {
      console.error('❌ [usePipelineNameValidation] Erro na validação:', error);
      
      // Retornar erro genérico se a API falhar
      return {
        is_valid: false,
        error: 'Erro ao validar nome. Tente novamente.'
      };
    }
  }, [authenticatedFetch, pipelineId]);

  /**
   * Função com debounce para validação automática
   */
  const validateWithDebounce = useCallback((nameToValidate: string) => {
    // Limpar timer anterior
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Se nome está vazio, limpar validação
    if (!nameToValidate.trim()) {
      setValidationState({
        isValidating: false,
        validation: {
          is_valid: false,
          error: 'Nome da pipeline é obrigatório'
        },
        hasChecked: false
      });
      return;
    }

    // Iniciar estado de validação
    setValidationState(prev => ({
      ...prev,
      isValidating: true
    }));

    // Criar novo timer para debounce
    const timer = setTimeout(async () => {
      try {
        const validation = await validateName(nameToValidate);
        
        setValidationState({
          isValidating: false,
          validation,
          hasChecked: true
        });
      } catch (error) {
        console.error('❌ [usePipelineNameValidation] Erro no debounce:', error);
        setValidationState({
          isValidating: false,
          validation: {
            is_valid: false,
            error: 'Erro ao validar nome'
          },
          hasChecked: true
        });
      }
    }, 800); // 800ms de debounce

    setDebounceTimer(timer);
  }, [debounceTimer, validateName]);

  /**
   * Atualizar nome e validar automaticamente
   */
  const updateName = useCallback((newName: string) => {
    setName(newName);
    validateWithDebounce(newName);
  }, [validateWithDebounce]);

  /**
   * Validação manual imediata (para onBlur ou submit)
   */
  const validateImmediately = useCallback(async () => {
    if (!name.trim()) {
      setValidationState({
        isValidating: false,
        validation: {
          is_valid: false,
          error: 'Nome da pipeline é obrigatório'
        },
        hasChecked: true
      });
      return;
    }

    setValidationState(prev => ({
      ...prev,
      isValidating: true
    }));

    try {
      const validation = await validateName(name);
      setValidationState({
        isValidating: false,
        validation,
        hasChecked: true
      });
    } catch (error) {
      console.error('❌ [usePipelineNameValidation] Erro na validação imediata:', error);
      setValidationState({
        isValidating: false,
        validation: {
          is_valid: false,
          error: 'Erro ao validar nome'
        },
        hasChecked: true
      });
    }
  }, [name, validateName]);

  /**
   * Aplicar sugestão automática
   */
  const applySuggestion = useCallback(() => {
    if (validationState.validation?.suggestion) {
      setName(validationState.validation.suggestion);
      // Validar novamente com a sugestão
      validateWithDebounce(validationState.validation.suggestion);
    }
  }, [validationState.validation?.suggestion, validateWithDebounce]);

  /**
   * Reset completo
   */
  const reset = useCallback(() => {
    setName('');
    setValidationState({
      isValidating: false,
      validation: null,
      hasChecked: false
    });
    
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }
  }, [debounceTimer]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  /**
   * Validar nome inicial se fornecido
   */
  useEffect(() => {
    if (initialName && initialName.trim() && !validationState.hasChecked) {
      validateWithDebounce(initialName);
    }
  }, [initialName, validationState.hasChecked, validateWithDebounce]);

  // Estados derivados para facilitar uso
  const isValid = validationState.validation?.is_valid === true;
  const hasError = validationState.validation?.error !== undefined;
  const isNameEmpty = !name.trim();
  const showValidation = validationState.hasChecked && !validationState.isValidating;
  const canSubmit = isValid && !isNameEmpty && !validationState.isValidating;

  return {
    // Estado principal
    name,
    
    // Validação
    ...validationState,
    
    // Estados derivados
    isValid,
    hasError,
    isNameEmpty,
    showValidation,
    canSubmit,
    
    // Ações
    updateName,
    validateImmediately,
    applySuggestion,
    reset,
    
    // Dados da validação
    error: validationState.validation?.error,
    suggestion: validationState.validation?.suggestion,
    similarNames: validationState.validation?.similar_names || []
  };
}; 