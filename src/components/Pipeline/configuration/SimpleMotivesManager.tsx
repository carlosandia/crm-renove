/**
 * ============================================
 * 🎯 SIMPLE MOTIVES MANAGER
 * ============================================
 * 
 * Gerenciador simplificado de motivos seguindo padrão da aba Básico
 * AIDEV-NOTE: Sem React Query, sem auto-save, sem APIs dedicadas
 * AIDEV-NOTE: Apenas form state + bulk save seguindo padrão Básico
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, Target, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';

// Shared Components
import { BlurFade } from '../../ui/blur-fade';

// Types
import { 
  FormOutcomeReasonsData, 
  FormOutcomeReason,
  DEFAULT_OUTCOME_REASONS 
} from '../../../shared/types/simple-outcome-reasons';

// ✅ OTIMIZAÇÃO: Importar configurações de logging
import { COMPONENT_LOGGING_CONFIG } from '../../../config/logging';

// ============================================
// INTERFACES
// ============================================

interface SimpleMotivesManagerProps {
  outcomeReasons?: FormOutcomeReasonsData;
  onOutcomeReasonsChange: (outcomeReasons: FormOutcomeReasonsData) => void;
  isEditMode?: boolean;
}

// ============================================
// TYPES DE ERRO
// ============================================

interface ErrorState {
  hasError: boolean;
  message: string;
  type: 'validation' | 'operation' | 'data';
}

const INITIAL_ERROR_STATE: ErrorState = {
  hasError: false,
  message: '',
  type: 'validation'
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const SimpleMotivesManager: React.FC<SimpleMotivesManagerProps> = ({
  outcomeReasons,
  onOutcomeReasonsChange,
  isEditMode = false
}) => {
  // ============================================
  // ESTADO DE ERRO
  // ============================================
  const [errorState, setErrorState] = useState<ErrorState>(INITIAL_ERROR_STATE);

  // ✅ SMART LOGGER: Implementar sistema de logging inteligente com performance tracking
  const smartLoggerRef = React.useRef<any>(null);
  if (!smartLoggerRef.current) {
    smartLoggerRef.current = (() => {
      const config = COMPONENT_LOGGING_CONFIG.MOTIVES_MANAGER;
      const logStateRef = { current: {
        lastCRUDOperation: 0,
        lastPerformanceLog: 0,
        lastStateChange: 0,
        suppressedCount: 0
      }};
      
      return {
        logCRUDOperation: (data: any, operation: string) => {
          if (!config.enabled || !config.trackCRUDOperations) return;
          
          const now = Date.now();
          if (now - logStateRef.current.lastCRUDOperation < config.throttleMs) {
            logStateRef.current.suppressedCount++;
            return;
          }
          
          console.log(`🔄 [SimpleMotivesManager.${operation}]`, data);
          logStateRef.current.lastCRUDOperation = now;
          
          if (logStateRef.current.suppressedCount > 0) {
            console.log(`📊 [SimpleMotivesManager] ${logStateRef.current.suppressedCount} logs suprimidos`);
            logStateRef.current.suppressedCount = 0;
          }
        },
        
        logPerformance: (data: any, operation: string) => {
          if (!config.enabled || !config.trackPerformance) return;
          
          const now = Date.now();
          if (now - logStateRef.current.lastPerformanceLog < config.throttleMs * 2) return;
          
          console.log(`⚡ [SimpleMotivesManager.${operation}]`, data);
          logStateRef.current.lastPerformanceLog = now;
        },
        
        logStateChange: (data: any, operation: string) => {
          if (!config.enabled) return;
          
          const now = Date.now();
          if (now - logStateRef.current.lastStateChange < config.throttleMs) return;
          
          console.log(`🔄 [SimpleMotivesManager.${operation}]`, data);
          logStateRef.current.lastStateChange = now;
        },
        
        logError: (error: any, operation: string) => {
          console.error(`❌ [SimpleMotivesManager.${operation}]`, error);
        }
      };
    })();
  }
  
  const smartLogger = smartLoggerRef.current;

  // Função helper para definir erro
  const setError = (message: string, type: ErrorState['type'] = 'validation') => {
    setErrorState({ hasError: true, message, type });
    smartLogger.logError({ message, type }, `${type.toUpperCase()}-ERROR`);
  };

  // Função helper para limpar erro
  const clearError = () => {
    setErrorState(INITIAL_ERROR_STATE);
  };

  // ============================================
  // VALIDAÇÃO DE DADOS
  // ============================================

  const validateReasonText = (text: string): boolean => {
    if (!text || typeof text !== 'string') {
      // ✅ CORREÇÃO: Permitir texto undefined/null durante criação
      return true;
    }
    
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      // ✅ CORREÇÃO: Permitir motivos vazios durante criação/edição
      return true;
    }
    
    if (trimmedText.length > 200) {
      setError('Texto do motivo deve ter no máximo 200 caracteres', 'validation');
      return false;
    }
    
    return true;
  };

  const validateOperationData = (data: any): boolean => {
    try {
      if (!data || typeof data !== 'object') {
        setError('Dados de operação inválidos', 'data');
        return false;
      }
      return true;
    } catch (error) {
      setError(`Erro na validação de dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'data');
      return false;
    }
  };

  // ✅ OTIMIZADO: Log detalhado dos dados recebidos pelo componente com throttling
  smartLogger.logStateChange({
    outcomeReasons_prop: outcomeReasons,
    outcomeReasons_isUndefined: outcomeReasons === undefined,
    outcomeReasons_isNull: outcomeReasons === null,
    outcomeReasons_keys: outcomeReasons ? Object.keys(outcomeReasons) : 'N/A',
    ganho_reasons_raw: outcomeReasons?.ganho_reasons,
    ganho_reasons_length: outcomeReasons?.ganho_reasons?.length || 0,
    perdido_reasons_raw: outcomeReasons?.perdido_reasons,
    perdido_reasons_length: outcomeReasons?.perdido_reasons?.length || 0,
    isEditMode,
    timestamp: new Date().toISOString()
  }, 'dados-recebidos');

  // ============================================
  // ESTADO LOCAL COM LÓGICA ROBUSTA DE FALLBACK
  // ============================================

  // ✅ CORREÇÃO CRÍTICA: Verificação robusta antes de aplicar fallback
  const hasValidOutcomeReasons = outcomeReasons && 
    typeof outcomeReasons === 'object' && 
    !Array.isArray(outcomeReasons);

  const safeOutcomeReasons = hasValidOutcomeReasons 
    ? outcomeReasons 
    : { ganho_reasons: [], perdido_reasons: [] };

  // ✅ CORREÇÃO: Aplicar fallback apenas se arrays estão vazios ou inexistentes
  const ganhoFields = (safeOutcomeReasons.ganho_reasons && Array.isArray(safeOutcomeReasons.ganho_reasons)) 
    ? safeOutcomeReasons.ganho_reasons 
    : [];
  
  const perdidoFields = (safeOutcomeReasons.perdido_reasons && Array.isArray(safeOutcomeReasons.perdido_reasons)) 
    ? safeOutcomeReasons.perdido_reasons 
    : [];
  
  // ✅ OTIMIZADO: Log detalhado após aplicação de fallbacks com throttling
  smartLogger.logStateChange({
    hasValidOutcomeReasons,
    safeOutcomeReasons_keys: safeOutcomeReasons ? Object.keys(safeOutcomeReasons) : 'N/A',
    ganhoFields_length: ganhoFields.length,
    perdidoFields_length: perdidoFields.length,
    ganhoFields_sample: ganhoFields.slice(0, 3).map(f => f?.reason_text?.substring(0, 30) || 'N/A'),
    perdidoFields_sample: perdidoFields.slice(0, 3).map(f => f?.reason_text?.substring(0, 30) || 'N/A'),
    hasAnyData: ganhoFields.length > 0 || perdidoFields.length > 0,
    willShowEmptyState: ganhoFields.length === 0 && perdidoFields.length === 0
  }, 'dados-apos-fallback-robusto');

  // ============================================
  // HANDLERS SIMPLES (SEM API CALLS)
  // ============================================

  const addGanhoReason = () => {
    try {
      clearError(); // Limpar erros anteriores

      // Validar se é possível adicionar mais motivos
      if (ganhoFields.length >= 20) {
        setError('Limite máximo de 20 motivos de ganho atingido', 'validation');
        return;
      }

      const newReason: FormOutcomeReason = {
        reason_text: '',
        reason_type: 'ganho',
        display_order: ganhoFields.length,
        is_active: true
      };
      
      if (!validateOperationData(newReason)) {
        return;
      }

      const updatedReasons = {
        ...safeOutcomeReasons,
        ganho_reasons: [...ganhoFields, newReason]
      };
      
      smartLogger.logCRUDOperation({
        newReason,
        updatedReasons,
        ganhoFields_before: ganhoFields.length,
        ganhoFields_after: updatedReasons.ganho_reasons.length
      }, 'adicionando-motivo-ganho');
      
      onOutcomeReasonsChange(updatedReasons);
    } catch (error) {
      setError(`Erro ao adicionar motivo de ganho: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'operation');
    }
  };

  const addPerdidoReason = () => {
    try {
      clearError(); // Limpar erros anteriores

      // Validar se é possível adicionar mais motivos
      if (perdidoFields.length >= 20) {
        setError('Limite máximo de 20 motivos de perdido atingido', 'validation');
        return;
      }

      const newReason: FormOutcomeReason = {
        reason_text: '',
        reason_type: 'perdido',
        display_order: perdidoFields.length,
        is_active: true
      };
      
      if (!validateOperationData(newReason)) {
        return;
      }
      
      const updatedReasons = {
        ...safeOutcomeReasons,
        perdido_reasons: [...perdidoFields, newReason]
      };
      
      smartLogger.logCRUDOperation({
        newReason,
        updatedReasons,
        perdidoFields_before: perdidoFields.length,
        perdidoFields_after: updatedReasons.perdido_reasons.length
      }, 'adicionando-motivo-perdido');
      
      onOutcomeReasonsChange(updatedReasons);
    } catch (error) {
      setError(`Erro ao adicionar motivo de perdido: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'operation');
    }
  };

  const removeGanho = (index: number) => {
    try {
      clearError(); // Limpar erros anteriores

      // Validar índice
      if (index < 0 || index >= ganhoFields.length) {
        setError('Índice de motivo inválido', 'validation');
        return;
      }

      const updatedReasons = {
        ...safeOutcomeReasons,
        ganho_reasons: ganhoFields.filter((_, i) => i !== index)
      };
      
      smartLogger.logCRUDOperation({
        index,
        removedReason: ganhoFields[index]?.reason_text?.substring(0, 30) || 'N/A',
        remainingCount: updatedReasons.ganho_reasons.length
      }, 'removendo-motivo-ganho');
      
      onOutcomeReasonsChange(updatedReasons);
    } catch (error) {
      setError(`Erro ao remover motivo de ganho: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'operation');
    }
  };

  const removePerdido = (index: number) => {
    try {
      clearError(); // Limpar erros anteriores

      // Validar índice
      if (index < 0 || index >= perdidoFields.length) {
        setError('Índice de motivo inválido', 'validation');
        return;
      }

      const updatedReasons = {
        ...safeOutcomeReasons,
        perdido_reasons: perdidoFields.filter((_, i) => i !== index)
      };
      
      smartLogger.logCRUDOperation({
        index,
        removedReason: perdidoFields[index]?.reason_text?.substring(0, 30) || 'N/A',
        remainingCount: updatedReasons.perdido_reasons.length
      }, 'removendo-motivo-perdido');
      
      onOutcomeReasonsChange(updatedReasons);
    } catch (error) {
      setError(`Erro ao remover motivo de perdido: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'operation');
    }
  };

  const addDefaultReasons = () => {
    try {
      clearError(); // Limpar erros anteriores

      // Validar se os motivos padrão estão disponíveis
      if (!DEFAULT_OUTCOME_REASONS || !DEFAULT_OUTCOME_REASONS.ganho_reasons || !DEFAULT_OUTCOME_REASONS.perdido_reasons) {
        setError('Motivos padrão não disponíveis', 'data');
        return;
      }

      // Verificar limites
      const newGanhoCount = ganhoFields.length + DEFAULT_OUTCOME_REASONS.ganho_reasons.length;
      const newPerdidoCount = perdidoFields.length + DEFAULT_OUTCOME_REASONS.perdido_reasons.length;

      if (newGanhoCount > 20) {
        setError(`Adicionar motivos padrão excederia o limite de 20 motivos de ganho (atual: ${ganhoFields.length}, tentando adicionar: ${DEFAULT_OUTCOME_REASONS.ganho_reasons.length})`, 'validation');
        return;
      }

      if (newPerdidoCount > 20) {
        setError(`Adicionar motivos padrão excederia o limite de 20 motivos de perdido (atual: ${perdidoFields.length}, tentando adicionar: ${DEFAULT_OUTCOME_REASONS.perdido_reasons.length})`, 'validation');
        return;
      }

      const newGanhoReasons = DEFAULT_OUTCOME_REASONS.ganho_reasons.map((reason, index) => ({
        reason_text: reason.reason_text,
        reason_type: 'ganho' as const,
        display_order: ganhoFields.length + index,
        is_active: true
      }));

      const newPerdidoReasons = DEFAULT_OUTCOME_REASONS.perdido_reasons.map((reason, index) => ({
        reason_text: reason.reason_text,
        reason_type: 'perdido' as const,
        display_order: perdidoFields.length + index,
        is_active: true
      }));

      const updatedReasons = {
        ganho_reasons: [...ganhoFields, ...newGanhoReasons],
        perdido_reasons: [...perdidoFields, ...newPerdidoReasons]
      };
      
      smartLogger.logCRUDOperation({
        ganhoReasons_added: newGanhoReasons.length,
        perdidoReasons_added: newPerdidoReasons.length,
        ganhoReasons_total: updatedReasons.ganho_reasons.length,
        perdidoReasons_total: updatedReasons.perdido_reasons.length
      }, 'adicionando-motivos-padrao');
      
      onOutcomeReasonsChange(updatedReasons);
    } catch (error) {
      setError(`Erro ao adicionar motivos padrão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'operation');
    }
  };

  // ============================================
  // HANDLERS DE REORDENAÇÃO
  // ============================================

  const moveReasonUp = (type: 'ganho' | 'perdido', index: number) => {
    if (index === 0) return;
    
    const fields = type === 'ganho' ? ganhoFields : perdidoFields;
    const newFields = [...fields];
    
    // Trocar posições
    [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    
    // Atualizar display_order
    const updatedFields = newFields.map((field, i) => ({
      ...field,
      display_order: i
    }));
    
    const updatedReasons = {
      ...safeOutcomeReasons,
      [`${type}_reasons`]: updatedFields
    };
    
    onOutcomeReasonsChange(updatedReasons);
  };

  const moveReasonDown = (type: 'ganho' | 'perdido', index: number) => {
    const fields = type === 'ganho' ? ganhoFields : perdidoFields;
    const maxIndex = fields.length - 1;
    if (index === maxIndex) return;
    
    const newFields = [...fields];
    
    // Trocar posições
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    
    // Atualizar display_order
    const updatedFields = newFields.map((field, i) => ({
      ...field,
      display_order: i
    }));
    
    const updatedReasons = {
      ...safeOutcomeReasons,
      [`${type}_reasons`]: updatedFields
    };
    
    onOutcomeReasonsChange(updatedReasons);
  };

  // ============================================
  // REASON ITEM COMPONENT
  // ============================================

  const updateReasonText = (type: 'ganho' | 'perdido', index: number, newText: string) => {
    console.log(`🔄 [updateReasonText] Atualizando texto do motivo:`, {
      type: type,
      index: index,
      old_text: type === 'ganho' ? ganhoFields[index]?.reason_text : perdidoFields[index]?.reason_text,
      new_text: newText,
      new_text_length: newText?.length || 0,
      is_empty_text: !newText || newText.trim() === ''
    });
    
    const fields = type === 'ganho' ? ganhoFields : perdidoFields;
    const updatedFields = fields.map((field, i) => 
      i === index ? { ...field, reason_text: newText } : field
    );
    
    const updatedReasons = {
      ...safeOutcomeReasons,
      [`${type}_reasons`]: updatedFields
    };
    
    console.log(`📤 [updateReasonText] Enviando para parent onOutcomeReasonsChange:`, {
      updated_field: updatedFields[index],
      total_ganho_count: updatedReasons.ganho_reasons?.length || 0,
      total_perdido_count: updatedReasons.perdido_reasons?.length || 0,
      ganho_with_text: updatedReasons.ganho_reasons?.filter(r => r.reason_text && r.reason_text.trim()).length || 0,
      perdido_with_text: updatedReasons.perdido_reasons?.filter(r => r.reason_text && r.reason_text.trim()).length || 0
    });
    
    onOutcomeReasonsChange(updatedReasons);
  };

  const ReasonItem: React.FC<{
    field: FormOutcomeReason;
    index: number;
    type: 'ganho' | 'perdido';
    removeFunction: (index: number) => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
  }> = React.memo(({ field, index, type, removeFunction, canMoveUp, canMoveDown }) => {
    // ✅ CORREÇÃO: Estado local para evitar travamento na digitação
    const [localText, setLocalText] = React.useState(field.reason_text);
    const timeoutRef = React.useRef<NodeJS.Timeout>();

    // 🔍 LOGS TEMPORÁRIOS: Debugging estado local vs parent
    console.log(`🔍 [ReasonItem-${type}-${index}] Estado de sincronização:`, {
      field_reason_text: field.reason_text,
      localText: localText,
      is_synced: localText === field.reason_text,
      field_text_length: field.reason_text?.length || 0,
      local_text_length: localText?.length || 0,
      timestamp: new Date().toISOString()
    });

    // ✅ Sync local state when field changes from outside
    React.useEffect(() => {
      console.log(`🔄 [ReasonItem-${type}-${index}] Sync do parent → local:`, {
        old_localText: localText,
        new_field_text: field.reason_text,
        will_update: localText !== field.reason_text
      });
      setLocalText(field.reason_text);
    }, [field.reason_text]);

    // ✅ Debounced update to parent
    const handleTextChange = (newText: string) => {
      console.log(`📝 [ReasonItem-${type}-${index}] handleTextChange:`, {
        old_text: localText,
        new_text: newText,
        will_debounce: true
      });
      
      setLocalText(newText);
      
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout for debounced update
      timeoutRef.current = setTimeout(() => {
        console.log(`⏰ [ReasonItem-${type}-${index}] Debounce executado:`, {
          final_text: newText,
          sending_to_parent: true
        });
        updateReasonText(type, index, newText);
      }, 500); // 500ms debounce
    };

    // ✅ Cleanup timeout on unmount
    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <div className="flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-all">
        {/* Controles de Reordenação */}
        <div className="flex flex-col space-y-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => moveReasonUp(type, index)}
            disabled={!canMoveUp}
            className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600 disabled:opacity-30"
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => moveReasonDown(type, index)}
            disabled={!canMoveDown}
            className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600 disabled:opacity-30"
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>

        {/* Campo de Texto com Estado Local */}
        <div className="flex-1">
          <Input
            value={localText}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={() => {
              // 🔍 LOG TEMPORÁRIO: Debugging onBlur
              console.log(`👁️ [ReasonItem-${type}-${index}] onBlur triggered:`, {
                localText: localText,
                field_reason_text: field.reason_text,
                is_different: localText !== field.reason_text,
                has_pending_timeout: !!timeoutRef.current,
                will_force_update: localText !== field.reason_text
              });
              
              // Force update on blur if different
              if (localText !== field.reason_text) {
                if (timeoutRef.current) {
                  console.log(`🧹 [ReasonItem-${type}-${index}] Limpando timeout pendente`);
                  clearTimeout(timeoutRef.current);
                }
                console.log(`🚀 [ReasonItem-${type}-${index}] Forçando update imediato no onBlur`);
                updateReasonText(type, index, localText);
              }
            }}
            placeholder={type === 'ganho' ? 'Ex: Preço competitivo' : 'Ex: Orçamento insuficiente'}
            className="border-none focus:ring-0 p-0 text-sm transition-all duration-300 hover:border-blue-300 focus:border-blue-500"
            autoComplete="off"
            maxLength={200}
          />
        </div>

        {/* Botão Remover */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeFunction(index)}
          className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  });

  ReasonItem.displayName = 'ReasonItem';

  // ============================================
  // RENDER SECTION FUNCTION
  // ============================================

  const renderSection = (
    title: string,
    description: string,
    icon: React.ReactNode,
    type: 'ganho' | 'perdido',
    fields: any[],
    addFunction: () => void,
    removeFunction: (index: number) => void
  ) => {
    return (
      <BlurFade delay={type === 'ganho' ? 0.1 : 0.15} direction="up" blur="2px" as="section">
        <Card className="bg-gradient-to-r from-slate-50 to-white border-slate-200/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${type === 'ganho' ? 'bg-green-50' : 'bg-red-50'}`}>
                {icon}
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">{title}</CardTitle>
                <CardDescription className="text-sm text-slate-500">{description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista de Motivos */}
            <div className="space-y-2 min-h-[120px] p-3 border-2 border-dashed border-slate-200 bg-slate-50 rounded-lg">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">Nenhum motivo configurado</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Adicione novos motivos usando o botão abaixo
                  </p>
                </div>
              ) : (
                fields.map((field, index) => (
                  <ReasonItem
                    key={`${type}-${index}-${field.reason_text.substring(0, 10)}`}
                    field={field}
                    index={index}
                    type={type}
                    removeFunction={removeFunction}
                    canMoveUp={index > 0}
                    canMoveDown={index < fields.length - 1}
                  />
                ))
              )}
            </div>

            {/* Controles */}
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFunction}
                className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Motivo</span>
              </Button>

              <Badge variant="secondary" className="text-xs">
                {fields.length} motivo(s)
              </Badge>
            </div>
          </CardContent>
        </Card>
      </BlurFade>
    );
  };

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  // ============================================
  // COMPONENTE DE ERRO
  // ============================================

  const renderErrorMessage = () => {
    if (!errorState.hasError) return null;

    const ErrorIcon = errorState.type === 'validation' ? AlertTriangle : XCircle;
    const errorColor = errorState.type === 'validation' ? 'border-yellow-200 bg-yellow-50' : 
                     errorState.type === 'data' ? 'border-blue-200 bg-blue-50' : 
                     'border-red-200 bg-red-50';
    const textColor = errorState.type === 'validation' ? 'text-yellow-800' : 
                     errorState.type === 'data' ? 'text-blue-800' : 
                     'text-red-800';
    const iconColor = errorState.type === 'validation' ? 'text-yellow-600' : 
                     errorState.type === 'data' ? 'text-blue-600' : 
                     'text-red-600';

    return (
      <BlurFade delay={0.02} direction="up" blur="2px" as="section">
        <div className={`border rounded-lg p-4 mb-4 ${errorColor}`}>
          <div className="flex items-start gap-3">
            <ErrorIcon className={`w-5 h-5 ${iconColor} mt-0.5 flex-shrink-0`} />
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${textColor} mb-1`}>
                {errorState.type === 'validation' && 'Erro de Validação'}
                {errorState.type === 'data' && 'Erro nos Dados'}
                {errorState.type === 'operation' && 'Erro na Operação'}
              </h4>
              <p className={`text-sm ${textColor}`}>
                {errorState.message}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearError}
                className={`mt-2 ${textColor} hover:bg-white/50`}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </BlurFade>
    );
  };

  // ✅ SMART LOGGER: Implementar sistema de logging inteligente com throttling para renders
  const renderLoggerRef = React.useRef<any>(null);
  if (!renderLoggerRef.current) {
    renderLoggerRef.current = (() => {
      const config = COMPONENT_LOGGING_CONFIG.MOTIVES_MANAGER;
      const logStateRef = { current: {
        lastRenderLog: 0,
        suppressedRenderCount: 0
      }};
      
      return {
        logRender: (data: any) => {
          if (!config.enabled) return;
          
          const now = Date.now();
          if (now - logStateRef.current.lastRenderLog < config.throttleMs * 2) {
            logStateRef.current.suppressedRenderCount++;
            return;
          }
          
          console.log('🎨 [SimpleMotivesManager.render]', data);
          logStateRef.current.lastRenderLog = now;
          
          if (logStateRef.current.suppressedRenderCount > 0) {
            console.log(`📊 [SimpleMotivesManager] ${logStateRef.current.suppressedRenderCount} renders suprimidos`);
            logStateRef.current.suppressedRenderCount = 0;
          }
        }
      };
    })();
  }
  
  const renderLogger = renderLoggerRef.current;
  
  // ✅ OTIMIZADO: Log final antes da renderização com throttling
  renderLogger.logRender({
    ganhoFields_para_renderizar: ganhoFields,
    ganhoFields_length: ganhoFields.length,
    perdidoFields_para_renderizar: perdidoFields,
    perdidoFields_length: perdidoFields.length,
    ganhoFields_amostras: ganhoFields.slice(0, 3).map(f => f?.reason_text || 'TEXTO_VAZIO'),
    perdidoFields_amostras: perdidoFields.slice(0, 3).map(f => f?.reason_text || 'TEXTO_VAZIO'),
    showEmptyStateGanho: ganhoFields.length === 0,
    showEmptyStatePerdido: perdidoFields.length === 0,
    hasError: errorState.hasError,
    errorType: errorState.type,
    errorMessage: errorState.message.substring(0, 50),
    timestamp: new Date().toISOString()
  });

  return (
    <div className="space-y-6">
      {/* Mensagem de Erro */}
      {renderErrorMessage()}

      {/* Header */}
      <BlurFade delay={0.05} direction="up" blur="2px">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Configuração de Motivos</h3>
            <p className="text-sm text-slate-500">Configure os motivos de ganho e perdido para esta pipeline</p>
          </div>
        </div>
      </BlurFade>

      {/* Botão Motivos Padrão */}
      {(ganhoFields.length === 0 && perdidoFields.length === 0) && (
        <BlurFade delay={0.08} direction="up" blur="2px">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900">Começar com motivos padrão</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Adicione motivos padrão baseados nas melhores práticas para começar rapidamente.
                </p>
                <Button
                  type="button"
                  onClick={addDefaultReasons}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Motivos Padrão
                </Button>
              </div>
            </div>
          </div>
        </BlurFade>
      )}

      {/* Seções de Motivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Motivos de Ganho */}
        {renderSection(
          'Motivos de Ganho',
          'Configure os motivos quando um lead é conquistado',
          <CheckCircle className="w-5 h-5 text-green-600" />,
          'ganho',
          ganhoFields,
          addGanhoReason,
          removeGanho
        )}

        {/* Motivos de Perdido */}
        {renderSection(
          'Motivos de Perdido',
          'Configure os motivos quando um lead é perdido',
          <XCircle className="w-5 h-5 text-red-600" />,
          'perdido',
          perdidoFields,
          addPerdidoReason,
          removePerdido
        )}
      </div>

      {/* Info sobre salvamento */}
      <BlurFade delay={0.2} direction="up" blur="2px">
        <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-200">
          {isEditMode ? (
            <>Os motivos serão salvos automaticamente quando você salvar a pipeline</>
          ) : (
            <>Configure os motivos e finalize a criação da pipeline para salvar</>
          )}
        </div>
      </BlurFade>
    </div>
  );
};

export default SimpleMotivesManager;