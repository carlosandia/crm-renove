import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { BlurFade } from '../ui/blur-fade';
import { Plus, Trophy, X, Trash2, CheckCircle, XCircle, Target, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// AIDEV-NOTE: Componente para gerenciar motivos de ganho e perdido (pipeline_outcome_reasons JSONB)
// Essencial para analytics e melhoria contínua do processo de vendas

export interface OutcomeReason {
  id: string;
  reason_type: 'ganho' | 'perdido' | 'won' | 'lost'; // ✅ REFATORAÇÃO: ganho/perdido preferidos, won/lost para compatibilidade
  reason_text: string;
  description: string;
  is_default?: boolean;
}

export interface OutcomeReasons {
  ganho: OutcomeReason[]; // ✅ REFATORAÇÃO: Novo padrão em português
  perdido: OutcomeReason[];  // ✅ REFATORAÇÃO: Novo padrão em português
  // ✅ COMPATIBILIDADE: Manter formatos antigos durante migração
  won?: OutcomeReason[];
  lost?: OutcomeReason[];
}

interface MotivesManagerProps {
  pipelineId?: string;
  outcomeReasons: OutcomeReasons;
  onOutcomeReasonsChange: (reasons: OutcomeReasons) => void;
  isEditMode?: boolean;
  loading?: boolean;
  error?: string | null;
  onError?: (error: string) => void;
}

// ✅ REFATORAÇÃO: Motivos padrão usando nova nomenclatura
const DEFAULT_GANHO_REASONS = [
  { value: 'preco_competitivo', label: 'Preço competitivo' },
  { value: 'melhor_proposta_tecnica', label: 'Melhor proposta técnica' },
  { value: 'relacionamento_confianca', label: 'Relacionamento/confiança' },
  { value: 'urgencia_cliente', label: 'Urgência do cliente' },
  { value: 'recomendacao_indicacao', label: 'Recomendação/indicação' }
];

const DEFAULT_PERDIDO_REASONS = [
  { value: 'preco_muito_alto', label: 'Preço muito alto' },
  { value: 'concorrente_escolhido', label: 'Concorrente escolhido' },
  { value: 'nao_era_momento', label: 'Não era o momento' },
  { value: 'nao_ha_orcamento', label: 'Não há orçamento' },
  { value: 'nao_era_fit_produto', label: 'Não era fit para o produto' }
];

// ✅ COMPATIBILIDADE: Manter constantes antigas para migração gradual
const DEFAULT_WON_REASONS = DEFAULT_GANHO_REASONS;
const DEFAULT_LOST_REASONS = DEFAULT_PERDIDO_REASONS;

export const MotivesManager: React.FC<MotivesManagerProps> = ({
  pipelineId,
  outcomeReasons = { ganho: [], perdido: [], won: [], lost: [] },
  onOutcomeReasonsChange,
  isEditMode = false,
  loading = false,
  error = null,
  onError
}) => {
  // ✅ MELHORIA: Memoizar função de normalização para evitar recriações desnecessárias
  const normalizeOutcomeReasons = useMemo(() => {
    return (reasons: OutcomeReasons): OutcomeReasons => {
      return {
        ganho: reasons.ganho || reasons.won || [],
        perdido: reasons.perdido || reasons.lost || []
      };
    };
  }, []);

  // ✅ MELHORIA: Estado interno com normalização inicial memoizada
  const [localOutcomeReasons, setLocalOutcomeReasons] = useState<OutcomeReasons>(() => normalizeOutcomeReasons(outcomeReasons));
  
  // ✅ MELHORIA: Estados com validação client-side
  const [newGanhoReason, setNewGanhoReason] = useState<Partial<OutcomeReason>>({
    reason_type: 'ganho',
    reason_text: ''
  });

  const [newPerdidoReason, setNewPerdidoReason] = useState<Partial<OutcomeReason>>({
    reason_type: 'perdido',
    reason_text: ''
  });

  // ✅ MELHORIA: Estados para UX melhorado
  const [isUpdating, setIsUpdating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // ✅ CORREÇÃO: Remover cache local conflitante - usar apenas estado React simples

  // ✅ MELHORIA: Refs otimizados com cleanup automático
  const onOutcomeReasonsChangeRef = useRef(onOutcomeReasonsChange);
  const prevOutcomeReasonsRef = useRef<OutcomeReasons>(outcomeReasons);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateCountRef = useRef(0);

  // ✅ MELHORIA: Manter callback sempre atualizado
  onOutcomeReasonsChangeRef.current = onOutcomeReasonsChange;

  // ✅ MELHORIA: Debounced callback para evitar calls excessivas
  const debouncedOnChange = useCallback((reasons: OutcomeReasons) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      updateCountRef.current++;
      console.log('🚀 [MotivesManager] CHAMANDO CALLBACK PARENT - onOutcomeReasonsChange:', {
        updateNumber: updateCountRef.current,
        pipelineId: pipelineId?.substring(0, 8),
        ganhoCount: reasons.ganho.length,
        perdidoCount: reasons.perdido.length,
        callbackExists: typeof onOutcomeReasonsChangeRef.current === 'function',
        reasons: {
          ganho: reasons.ganho.map(r => ({ id: r.id.substring(0, 8), text: r.reason_text })),
          perdido: reasons.perdido.map(r => ({ id: r.id.substring(0, 8), text: r.reason_text }))
        }
      });
      
      // ✅ DEBUG CRÍTICO: Verificar se callback existe antes de chamar
      if (typeof onOutcomeReasonsChangeRef.current === 'function') {
        onOutcomeReasonsChangeRef.current(reasons);
        console.log('✅ [MotivesManager] Callback parent executado com sucesso');
      } else {
        console.error('❌ [MotivesManager] ERRO CRÍTICO: Callback parent não é uma função!', {
          callbackType: typeof onOutcomeReasonsChangeRef.current,
          callbackValue: onOutcomeReasonsChangeRef.current
        });
      }
    }, 300); // 300ms debounce
  }, [pipelineId]);

  // ✅ MELHORIA: Cleanup do debounce
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // ✅ CORREÇÃO: Sincronização com logs detalhados para debugging do problema após refresh
  useEffect(() => {
    if (isUpdating) {
      console.log('🔄 [MotivesManager] Sincronização pulada - isUpdating=true');
      return;
    }
    
    // ✅ DEBUG CRÍTICO: Log detalhado dos dados recebidos da prop
    console.log('🔍 [MotivesManager] SINCRONIZAÇÃO INICIADA - DEBUG COMPLETO:', {
      pipelineId: pipelineId?.substring(0, 8),
      outcomeReasons_raw: outcomeReasons,
      outcomeReasons_type: typeof outcomeReasons,
      outcomeReasons_keys: outcomeReasons ? Object.keys(outcomeReasons) : [],
      ganho_prop: outcomeReasons?.ganho,
      perdido_prop: outcomeReasons?.perdido,
      won_prop: outcomeReasons?.won,
      lost_prop: outcomeReasons?.lost,
      ganho_count: outcomeReasons?.ganho?.length || 0,
      perdido_count: outcomeReasons?.perdido?.length || 0,
      won_count: outcomeReasons?.won?.length || 0,
      lost_count: outcomeReasons?.lost?.length || 0,
      isUpdating,
      current_local_ganho: localOutcomeReasons.ganho.length,
      current_local_perdido: localOutcomeReasons.perdido.length
    });
    
    // ✅ MELHORIA: Normalizar dados recebidos e atualizar estado local
    const normalizedReasons = normalizeOutcomeReasons(outcomeReasons);
    
    console.log('🔄 [MotivesManager] DADOS NORMALIZADOS:', {
      pipelineId: pipelineId?.substring(0, 8),
      normalized_ganho_count: normalizedReasons.ganho.length,
      normalized_perdido_count: normalizedReasons.perdido.length,
      normalized_ganho_first: normalizedReasons.ganho[0] ? {
        id: normalizedReasons.ganho[0].id.substring(0, 20),
        text: normalizedReasons.ganho[0].reason_text
      } : null,
      normalized_perdido_first: normalizedReasons.perdido[0] ? {
        id: normalizedReasons.perdido[0].id.substring(0, 20),
        text: normalizedReasons.perdido[0].reason_text
      } : null
    });
    
    setLocalOutcomeReasons(normalizedReasons);
    prevOutcomeReasonsRef.current = { ...normalizedReasons };
    
    console.log('✅ [MotivesManager] Sincronização concluída - Estado local atualizado');
  }, [outcomeReasons, pipelineId, normalizeOutcomeReasons, isUpdating]);

  // ✅ MELHORIA: Sistema de detecção otimizado com memoização e debounce
  const reasonsHash = useMemo(() => {
    return JSON.stringify({
      ganho: localOutcomeReasons.ganho.map(r => ({ id: r.id, text: r.reason_text })),
      perdido: localOutcomeReasons.perdido.map(r => ({ id: r.id, text: r.reason_text }))
    });
  }, [localOutcomeReasons]);

  const previousHashRef = useRef<string>(reasonsHash);

  useEffect(() => {
    // ✅ MELHORIA: Verificação mais eficiente usando hash memoizado
    if (previousHashRef.current !== reasonsHash) {
      const prevGanhoLength = prevOutcomeReasonsRef.current.ganho?.length || 0;
      const prevPerdidoLength = prevOutcomeReasonsRef.current.perdido?.length || 0;
      const currentGanhoLength = localOutcomeReasons.ganho?.length || 0;
      const currentPerdidoLength = localOutcomeReasons.perdido?.length || 0;
      
      if (import.meta.env.DEV) {
        console.log('🔄 [MotivesManager] Mudança otimizada detectada:', {
          hashChanged: true,
          prevGanhoLength,
          currentGanhoLength,
          prevPerdidoLength,
          currentPerdidoLength,
          pipelineId: pipelineId?.substring(0, 8)
        });
      }
      
      debouncedOnChange(localOutcomeReasons);
      prevOutcomeReasonsRef.current = { ...localOutcomeReasons }; // Shallow clone é suficiente
      previousHashRef.current = reasonsHash;
    }
  }, [reasonsHash, localOutcomeReasons, pipelineId, debouncedOnChange]);

  // ✅ MELHORIA: Validação client-side centralizada
  const validateReasonText = useCallback((text: string, type: 'ganho' | 'perdido'): string | null => {
    if (!text.trim()) {
      return 'Texto do motivo é obrigatório';
    }
    if (text.trim().length < 3) {
      return 'Texto deve ter pelo menos 3 caracteres';
    }
    if (text.trim().length > 200) {
      return 'Texto deve ter no máximo 200 caracteres';
    }
    
    // Verificar duplicatas
    const existingReasons = localOutcomeReasons[type] || [];
    const isDuplicate = existingReasons.some(r => 
      r.reason_text.toLowerCase().trim() === text.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      return 'Este motivo já existe';
    }
    
    return null;
  }, [localOutcomeReasons]);

  // ✅ MELHORIA: Adicionar motivo com validação e error handling
  const handleAddGanhoReason = useCallback(async () => {
    const text = newGanhoReason.reason_text?.trim() || '';
    const validationError = validateReasonText(text, 'ganho');
    
    if (validationError) {
      setValidationErrors(prev => ({ ...prev, ganho: validationError }));
      toast.error(validationError);
      return;
    }

    try {
      setIsUpdating(true);
      setValidationErrors(prev => ({ ...prev, ganho: '' }));

      const reason: OutcomeReason = {
        id: `ganho_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reason_type: 'ganho',
        reason_text: text,
        description: '',
        is_default: false
      };

      // ✅ MELHORIA: Atualização otimizada do estado
      const updatedReasons = {
        ...localOutcomeReasons,
        ganho: [...(localOutcomeReasons.ganho || []), reason]
      };
      setLocalOutcomeReasons(updatedReasons);

      // Limpar formulário
      setNewGanhoReason({
        reason_type: 'ganho',
        reason_text: ''
      });

      toast.success('Motivo de ganho adicionado com sucesso!');
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao adicionar motivo';
      toast.error(errorMessage);
      onError?.(errorMessage);
      
      if (import.meta.env.DEV) {
        console.error('❌ [handleAddGanhoReason] Erro:', error);
      }
    } finally {
      setIsUpdating(false);
    }
  }, [newGanhoReason, localOutcomeReasons, validateReasonText, onError]);

  // ✅ MELHORIA: Adicionar motivo perdido com validação e error handling
  const handleAddPerdidoReason = useCallback(async () => {
    const text = newPerdidoReason.reason_text?.trim() || '';
    const validationError = validateReasonText(text, 'perdido');
    
    if (validationError) {
      setValidationErrors(prev => ({ ...prev, perdido: validationError }));
      toast.error(validationError);
      return;
    }

    try {
      setIsUpdating(true);
      setValidationErrors(prev => ({ ...prev, perdido: '' }));

      const reason: OutcomeReason = {
        id: `perdido_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reason_type: 'perdido',
        reason_text: text,
        description: '',
        is_default: false
      };

      // ✅ MELHORIA: Atualização otimizada do estado
      const updatedReasons = {
        ...localOutcomeReasons,
        perdido: [...(localOutcomeReasons.perdido || []), reason]
      };
      setLocalOutcomeReasons(updatedReasons);

      // Limpar formulário
      setNewPerdidoReason({
        reason_type: 'perdido',
        reason_text: ''
      });

      toast.success('Motivo de perdido adicionado com sucesso!');
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao adicionar motivo';
      toast.error(errorMessage);
      onError?.(errorMessage);
      
      if (import.meta.env.DEV) {
        console.error('❌ [handleAddPerdidoReason] Erro:', error);
      }
    } finally {
      setIsUpdating(false);
    }
  }, [newPerdidoReason, localOutcomeReasons, validateReasonText, onError]);

  // ✅ COMPATIBILIDADE: Manter handlers antigos apontando para novos
  const handleAddWonReason = handleAddGanhoReason;
  const handleAddLostReason = handleAddPerdidoReason;

  // ✅ NOVA FUNCIONALIDADE: Handler para tecla Enter
  const handleKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLInputElement>,
    type: 'ganho' | 'perdido',
    handleAdd: () => void,
    reasonText: string
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (reasonText.trim() && !isUpdating && !validationErrors[type]) {
        handleAdd();
      }
    }
  }, [isUpdating, validationErrors]);

  // ✅ MELHORIA: Remover motivo com confirmação e error handling
  const handleRemoveReason = useCallback(async (type: 'ganho' | 'perdido' | 'won' | 'lost', reasonId: string) => {
    const normalizedType = type === 'won' ? 'ganho' : type === 'lost' ? 'perdido' : type;
    
    try {
      setIsUpdating(true);
      
      // ✅ MELHORIA: Atualização otimizada com filtragem memoizada
      const currentReasons = localOutcomeReasons[normalizedType as keyof OutcomeReasons] || [];
      const reasonToRemove = currentReasons.find((reason: OutcomeReason) => reason.id === reasonId);
      
      if (!reasonToRemove) {
        toast.error('Motivo não encontrado');
        return;
      }

      const updatedReasons = {
        ...localOutcomeReasons,
        [normalizedType]: currentReasons.filter((reason: OutcomeReason) => reason.id !== reasonId)
      };
      
      setLocalOutcomeReasons(updatedReasons);
      toast.success(`Motivo "${reasonToRemove.reason_text}" removido com sucesso!`);
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao remover motivo';
      toast.error(errorMessage);
      onError?.(errorMessage);
      
      if (import.meta.env.DEV) {
        console.error('❌ [handleRemoveReason] Erro:', error);
      }
    } finally {
      setIsUpdating(false);
    }
  }, [localOutcomeReasons, onError]);

  // ✅ MELHORIA: Atualizar motivo com validação e debounce automático
  const handleUpdateReason = useCallback(async (type: 'ganho' | 'perdido' | 'won' | 'lost', reasonId: string, field: keyof OutcomeReason, value: string) => {
    const normalizedType = type === 'won' ? 'ganho' : type === 'lost' ? 'perdido' : type;
    
    try {
      // ✅ MELHORIA: Validação inline para texto
      if (field === 'reason_text') {
        const trimmedValue = value.trim();
        if (trimmedValue.length > 200) {
          toast.error('Texto deve ter no máximo 200 caracteres');
          return;
        }
        
        // Verificar duplicatas (excluindo o próprio item)
        const currentReasons = localOutcomeReasons[normalizedType as keyof OutcomeReasons] || [];
        const isDuplicate = currentReasons.some((r: OutcomeReason) => 
          r.id !== reasonId && r.reason_text.toLowerCase().trim() === trimmedValue.toLowerCase()
        );
        
        if (isDuplicate) {
          toast.error('Este motivo já existe');
          return;
        }
      }

      // ✅ MELHORIA: Atualização otimizada
      const updatedReasons = {
        ...localOutcomeReasons,
        [normalizedType]: (localOutcomeReasons[normalizedType as keyof OutcomeReasons] || []).map(
          (reason: OutcomeReason) => reason.id === reasonId ? { ...reason, [field]: value } : reason
        )
      };
      
      setLocalOutcomeReasons(updatedReasons);
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao atualizar motivo';
      toast.error(errorMessage);
      onError?.(errorMessage);
      
      if (import.meta.env.DEV) {
        console.error('❌ [handleUpdateReason] Erro:', error);
      }
    }
  }, [localOutcomeReasons, onError]);

  // ✅ REFATORAÇÃO: Adicionar motivos padrão - usar nova nomenclatura com compatibilidade
  const handleAddDefaultReasons = useCallback((type: 'ganho' | 'perdido' | 'won' | 'lost') => {
    // ✅ REFATORAÇÃO: Mapear valores antigos para novos
    const normalizedType = type === 'won' ? 'ganho' : type === 'lost' ? 'perdido' : type;
    const defaults = normalizedType === 'ganho' ? DEFAULT_GANHO_REASONS : DEFAULT_PERDIDO_REASONS;
    const existingTexts = (localOutcomeReasons[normalizedType as keyof OutcomeReasons] || []).map(
      (r: OutcomeReason) => r.reason_text.toLowerCase()
    );
    
    const newReasons = defaults
      .filter(def => !existingTexts.includes(def.label.toLowerCase()))
      .map(def => ({
        id: `${normalizedType}_default_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reason_type: normalizedType as 'ganho' | 'perdido',
        reason_text: def.label,
        description: `Motivo padrão: ${def.label}`,
        is_default: true
      }));

    if (newReasons.length > 0) {
      // ✅ CORREÇÃO CRÍTICA: Atualizar estado local em vez de chamar callback diretamente
      const updatedReasons = {
        ...localOutcomeReasons,
        [normalizedType]: [...(localOutcomeReasons[normalizedType as keyof OutcomeReasons] || []), ...newReasons]
      };
      setLocalOutcomeReasons(updatedReasons);
    }
  }, [localOutcomeReasons]);

  const renderReasonForm = (
    type: 'ganho' | 'perdido' | 'won' | 'lost', // ✅ REFATORAÇÃO: Compatibilidade com ambos formatos
    newReason: Partial<OutcomeReason>,
    setNewReason: React.Dispatch<React.SetStateAction<Partial<OutcomeReason>>>,
    handleAdd: () => void,
    title: string,
    icon: React.ReactNode,
    description: string,
    bgColorClass: string,
    iconColorClass: string
  ) => {
    // ✅ REFATORAÇÃO: Mapear tipo para acessar dados corretos
    const normalizedType = type === 'won' ? 'ganho' : type === 'lost' ? 'perdido' : type;
    const reasonsArray = localOutcomeReasons[normalizedType as keyof OutcomeReasons] || [];
    
    return (
    <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 ${bgColorClass} rounded-lg`}>
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="space-y-4">
        {/* Motivos existentes */}
        {reasonsArray.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700">Motivos Configurados</h4>
            {reasonsArray.map((reason) => (
              <div key={reason.id} className="flex items-center gap-3 p-4 bg-white/80 border border-slate-200 rounded-lg shadow-sm">
                <div className="flex-1">
                  <Input
                    placeholder="Texto do motivo"
                    value={reason.reason_text}
                    onChange={(e) => handleUpdateReason(normalizedType, reason.id, 'reason_text', e.target.value)}
                    className="border-slate-300 focus:ring-indigo-500"
                  />
                  {reason.is_default && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-slate-100 text-slate-600 border border-slate-200 mt-2">
                      Padrão do Sistema
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Tem certeza que deseja remover o motivo "${reason.reason_text}"?`)) {
                      handleRemoveReason(normalizedType, reason.id);
                    }
                  }}
                  disabled={isUpdating}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                  title="Remover motivo"
                >
                  {isUpdating ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Formulário para novo motivo */}
        <div className="bg-slate-50/80 rounded-lg p-4 border border-slate-200">
          <h5 className="text-sm font-medium text-slate-700 mb-4">Adicionar Novo Motivo</h5>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Texto do Motivo</label>
              <Input
                placeholder={`Ex: ${normalizedType === 'ganho' ? 'Proposta aceita' : 'Preço muito alto'}`}
                value={newReason.reason_text || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewReason(prev => ({ ...prev, reason_text: value }));
                  
                  // ✅ MELHORIA: Validação em tempo real
                  if (validationErrors[normalizedType]) {
                    const error = validateReasonText(value, normalizedType);
                    if (!error) {
                      setValidationErrors(prev => ({ ...prev, [normalizedType]: '' }));
                    }
                  }
                }}
                onKeyDown={(e) => handleKeyDown(e, normalizedType, handleAdd, newReason.reason_text || '')}
                className={`border-slate-300 focus:ring-indigo-500 ${
                  validationErrors[normalizedType] ? 'border-red-300 focus:ring-red-500' : ''
                }`}
                maxLength={200}
              />
              
              {/* ✅ MELHORIA: Contador de caracteres e erro inline */}
              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs ${
                  validationErrors[normalizedType] ? 'text-red-600' : 'text-slate-500'
                }`}>
                  {validationErrors[normalizedType] || `${newReason.reason_text?.length || 0}/200 caracteres`}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddDefaultReasons(normalizedType)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Padrão
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!newReason.reason_text?.trim() || isUpdating || !!validationErrors[normalizedType]}
            className="flex items-center gap-2"
            size="sm"
          >
            {isUpdating ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isUpdating ? 'Adicionando...' : 'Adicionar Motivo'}
          </Button>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ✅ MELHORIA: Header com indicadores de estado */}
      <BlurFade delay={0.1} direction="up">
        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isUpdating ? 'bg-yellow-50' : error ? 'bg-red-50' : 'bg-indigo-50'}`}>
              {isUpdating ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />
              ) : error ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <Target className="h-5 w-5 text-indigo-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">Motivos de Ganho e Perdido</h3>
              <p className="text-sm text-slate-500">
                {(localOutcomeReasons.ganho?.length || 0) + (localOutcomeReasons.perdido?.length || 0)} motivos configurados
                {isUpdating && ' • Atualizando...'}
                {loading && ' • Carregando...'}
              </p>
            </div>
          </div>
          
          {/* ✅ MELHORIA: Exibir erro se houver */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>
      </BlurFade>

      {/* Motivos de Ganho */}
      <BlurFade delay={0.2} direction="up">
        {renderReasonForm(
          'ganho', // ✅ REFATORAÇÃO: Usar nova nomenclatura
          newGanhoReason,
          setNewGanhoReason,
          handleAddGanhoReason,
          'Motivos de Ganho',
          <Trophy className="h-4 w-4 text-green-600" />,
          'Motivos pelos quais leads são conquistados com sucesso',
          'bg-green-50',
          'text-green-600'
        )}
      </BlurFade>

      {/* Motivos de Perdido */}
      <BlurFade delay={0.3} direction="up">
        {renderReasonForm(
          'perdido', // ✅ REFATORAÇÃO: Usar nova nomenclatura
          newPerdidoReason,
          setNewPerdidoReason,
          handleAddPerdidoReason,
          'Motivos de Perdido',
          <X className="h-4 w-4 text-red-600" />,
          'Motivos pelos quais leads são perdidos ou não convertidos',
          'bg-red-50',
          'text-red-600'
        )}
      </BlurFade>
    </div>
  );
};

export default MotivesManager;