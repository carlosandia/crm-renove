/**
 * ============================================
 * 🎯 MODAL DE APLICAÇÃO DE MOTIVOS
 * ============================================
 * 
 * Modal para aplicar motivos de ganho/perdido quando lead é movido
 * AIDEV-NOTE: Componente crítico que intercepta movimentação de leads
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useOutcomeReasons, useApplyOutcome } from '../hooks';
import { OutcomeModalProps } from '../types';

const OutcomeReasonModal: React.FC<OutcomeModalProps> = ({
  isOpen,
  onClose,
  leadId,
  outcomeType,
  pipelineId,
  onSuccess
}) => {
  // ============================================
  // HOOKS E ESTADO
  // ============================================
  
  const [selectedReasonId, setSelectedReasonId] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [useCustomReason, setUseCustomReason] = useState(false);

  // ✅ Buscar motivos configurados para este pipeline
  const { reasons, isLoading: isLoadingReasons } = useOutcomeReasons({
    pipelineId,
    reasonType: outcomeType
  });

  // ✅ Hook para aplicar motivo
  const { applyOutcome, isApplying } = useApplyOutcome({
    onSuccess: () => {
      onSuccess();
      onClose();
    }
  });

  // ============================================
  // EFFECTS
  // ============================================

  // Reset form quando modal abre
  useEffect(() => {
    if (isOpen) {
      setSelectedReasonId('');
      setCustomReason('');
      setNotes('');
      setUseCustomReason(false);
    }
  }, [isOpen]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let reasonText = '';
    let reasonId: string | undefined;

    if (useCustomReason) {
      if (!customReason.trim()) {
        return; // Validação visual já deve estar mostrando erro
      }
      reasonText = customReason.trim();
    } else {
      if (!selectedReasonId) {
        return; // Deve selecionar um motivo
      }
      const selectedReason = reasons.find(r => r.id === selectedReasonId);
      if (!selectedReason) return;
      
      reasonText = selectedReason.reason_text;
      reasonId = selectedReasonId;
    }

    applyOutcome({
      lead_id: leadId,
      outcome_type: outcomeType,
      reason_id: reasonId,
      reason_text: reasonText,
      notes: notes.trim() || undefined
    });
  };

  const handleClose = () => {
    if (!isApplying) {
      onClose();
    }
  };

  // ============================================
  // VALIDATION
  // ============================================

  const isFormValid = useCustomReason 
    ? customReason.trim().length > 0
    : selectedReasonId.length > 0;

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderIcon = () => {
    if (outcomeType === 'won') {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    } else {
      return <XCircle className="w-6 h-6 text-red-600" />;
    }
  };

  const renderTitle = () => {
    return outcomeType === 'won' 
      ? 'Motivo do Ganho' 
      : 'Motivo da Perdido';
  };

  const renderDescription = () => {
    return outcomeType === 'won'
      ? 'Por que este lead foi ganho? Essa informação ajuda a entender o que funciona melhor.'
      : 'Por que este lead foi perdido? Essa informação ajuda a identificar pontos de melhoria.';
  };

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {renderIcon()}
            <h2 className="text-lg font-semibold text-gray-900">
              {renderTitle()}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isApplying}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {renderDescription()}
          </p>

          {/* LOADING STATE */}
          {isLoadingReasons && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Carregando motivos...</span>
            </div>
          )}

          {/* DEBUG INFO - TEMPORÁRIO */}
          {!isLoadingReasons && (
            <div className="bg-gray-100 p-3 rounded text-xs">
              <strong>Debug Info:</strong><br/>
              Pipeline ID: {pipelineId}<br/>
              Outcome Type: {outcomeType}<br/>
              Motivos carregados: {reasons?.length || 0}<br/>
              Loading: {isLoadingReasons ? 'Sim' : 'Não'}<br/>
              {reasons?.length === 0 && !isLoadingReasons && (
                <span className="text-red-600">❌ Nenhum motivo encontrado!</span>
              )}
            </div>
          )}

          {/* FORM CONTENT */}
          {!isLoadingReasons && (
            <>
              {/* TOGGLE ENTRE MOTIVOS PRÉ-DEFINIDOS E CUSTOMIZADO */}
              {reasons.length > 0 && (
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!useCustomReason}
                      onChange={() => setUseCustomReason(false)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Usar motivo pré-definido
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={useCustomReason}
                      onChange={() => setUseCustomReason(true)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Motivo personalizado
                    </span>
                  </label>
                </div>
              )}

              {/* MOTIVOS PRÉ-DEFINIDOS */}
              {!useCustomReason && reasons.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Selecione o motivo *
                  </label>
                  <select
                    value={selectedReasonId}
                    onChange={(e) => setSelectedReasonId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione um motivo...</option>
                    {reasons.map((reason) => (
                      <option key={reason.id} value={reason.id}>
                        {reason.reason_text}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* MOTIVO CUSTOMIZADO */}
              {(useCustomReason || reasons.length === 0) && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {reasons.length === 0 ? 'Descreva o motivo *' : 'Motivo personalizado *'}
                  </label>
                  <Input
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder={outcomeType === 'won' ? 'Ex: Preço competitivo' : 'Ex: Orçamento insuficiente'}
                    maxLength={200}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    {customReason.length}/200 caracteres
                  </p>
                </div>
              )}

              {/* OBSERVAÇÕES ADICIONAIS */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Observações adicionais (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione detalhes ou contexto adicional..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500">
                  {notes.length}/500 caracteres
                </p>
              </div>

              {/* AVISO SE NÃO HÁ MOTIVOS CONFIGURADOS */}
              {!useCustomReason && reasons.length === 0 && (
                <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Nenhum motivo configurado</p>
                    <p>O administrador pode configurar motivos padrão nas configurações do pipeline.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </form>

        {/* FOOTER */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isApplying}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormValid || isApplying || isLoadingReasons}
            className={`min-w-[100px] ${
              outcomeType === 'won' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isApplying ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Aplicando...</span>
              </div>
            ) : (
              'Aplicar Motivo'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OutcomeReasonModal;