// ✅ MIGRADO: Usando autenticação básica Supabase conforme CLAUDE.md
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

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
  const { user } = useAuth();
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

    // ✅ MIGRADO: Verificar autenticação básica Supabase
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !currentUser) {
      console.warn('⚠️ [usePipelineNameValidation] Usuário não autenticado');
      return {
        is_valid: false,
        error: 'Autenticação necessária para validar nome'
      };
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

      // ✅ BÁSICO: Obter token do usuário autenticado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Token de autenticação não disponível');
      }

      // Fazer requisição usando URL relativa (proxy Vite)
      const response = await fetch(`/api/pipelines/validate-name?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

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
  }, [user, pipelineId]);

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

    // ✅ CORREÇÃO: Não validar nomes muito curtos (menos de 2 caracteres)
    if (nameToValidate.trim().length < 2) {
      setValidationState({
        isValidating: false,
        validation: null,
        hasChecked: false
      });
      return;
    }

    // Iniciar estado de validação apenas para nomes com 2+ caracteres
    setValidationState(prev => ({
      ...prev,
      isValidating: true
    }));

    // ✅ CORREÇÃO: Debounce aumentado para 1500ms (reduzir chamadas excessivas)
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
    }, 1500); // ✅ CORREÇÃO: 1500ms de debounce (era 800ms)

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
   * Inicializar nome sem validar (para modo edição)
   */
  const initializeName = useCallback((newName: string) => {
    setName(newName);
    // Não validar automaticamente - só definir o nome
  }, []);

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
   * ✅ NOVO: Cleanup do debounce (para quando modal fechar)
   */
  const cleanup = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }
  }, [debounceTimer]);

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
    cleanup();
  }, [cleanup]);

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
   * Validar nome inicial se fornecido - ✅ CORREÇÃO ERRO 3: Evitar loop infinito
   */
  useEffect(() => {
    if (initialName && initialName.trim() && !validationState.hasChecked && name === initialName) {
      console.log('🔍 [usePipelineNameValidation] Validação inicial para:', initialName);
      validateWithDebounce(initialName);
    }
  }, [initialName]); // ✅ Apenas initialName como dependência

  // Estados derivados para facilitar uso
  const isValid = validationState.validation?.is_valid === true;
  const hasError = validationState.validation?.error !== undefined;
  const isNameEmpty = !name.trim();
  
  // ✅ CORREÇÃO: Para modo edição, não mostrar validação se nome não mudou do inicial
  const isEditMode = !!pipelineId;
  const nameUnchanged = isEditMode && name === initialName;
  const showValidation = validationState.hasChecked && !validationState.isValidating && !nameUnchanged;
  
  // ✅ CORREÇÃO: Para edição, sempre permitir submit se não está validando
  const canSubmit = (!isNameEmpty && !validationState.isValidating) && 
    (isEditMode ? true : isValid);

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
    
    // ✅ NOVO: Estados de contexto para debugging
    isEditMode,
    nameUnchanged,
    initialName,
    
    // Ações
    updateName,
    initializeName,
    validateImmediately,
    applySuggestion,
    reset,
    cleanup, // ✅ NOVO: Função de cleanup
    
    // Dados da validação
    error: validationState.validation?.error,
    suggestion: validationState.validation?.suggestion,
    similarNames: validationState.validation?.similar_names || []
  };
}; 