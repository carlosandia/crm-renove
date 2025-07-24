// =====================================================================================
// COMPONENT: Dialog de Fechamento de Reunião
// Autor: Claude (Arquiteto Sênior)
// Descrição: Dialog para atualizar outcome da reunião com motivos padronizados
// =====================================================================================

import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, Slash, AlertTriangle, Calendar } from 'lucide-react';
import { useUpdateMeetingOutcome } from '../../hooks/useMeetings';
import { 
  MEETING_OUTCOME_LABELS, 
  NO_SHOW_REASON_LABELS,
  type MeetingOutcome,
  type NoShowReason,
  type UpdateMeetingOutcome,
  type MeetingWithRelations
} from '../../shared/schemas/meetings';

interface CloseMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingWithRelations;
}

// AIDEV-NOTE: Ícones para cada outcome
const outcomeIcons = {
  agendada: Calendar,
  realizada: CheckCircle,
  no_show: XCircle,
  reagendada: Clock,
  cancelada: Slash
};

// AIDEV-NOTE: Cores para cada outcome
const outcomeColors = {
  agendada: 'text-blue-600 bg-blue-100',
  realizada: 'text-green-600 bg-green-100',
  no_show: 'text-red-600 bg-red-100',
  reagendada: 'text-yellow-600 bg-yellow-100',
  cancelada: 'text-gray-600 bg-gray-100'
};

export const CloseMeetingDialog: React.FC<CloseMeetingDialogProps> = ({
  isOpen,
  onClose,
  meeting
}) => {
  const updateMeetingMutation = useUpdateMeetingOutcome();

  // AIDEV-NOTE: Estado do formulário
  const [selectedOutcome, setSelectedOutcome] = useState<MeetingOutcome | ''>('');
  const [noShowReason, setNoShowReason] = useState<NoShowReason | ''>('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // AIDEV-NOTE: Resetar formulário quando modal abre
  React.useEffect(() => {
    if (isOpen) {
      setSelectedOutcome('');
      setNoShowReason('');
      setNotes('');
      setErrors({});
    }
  }, [isOpen]);

  // AIDEV-NOTE: Validação do formulário
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedOutcome) {
      newErrors.outcome = 'Selecione um resultado para a reunião';
    }

    if (selectedOutcome === 'no_show' && !noShowReason) {
      newErrors.noShowReason = 'Motivo do no-show é obrigatório';
    }

    if (notes.length > 500) {
      newErrors.notes = 'Observações devem ter no máximo 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // AIDEV-NOTE: Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedOutcome) {
      return;
    }

    try {
      const updateData: UpdateMeetingOutcome = {
        outcome: selectedOutcome,
        notes: notes || undefined,
        ...(selectedOutcome === 'no_show' && noShowReason && {
          no_show_reason: noShowReason
        })
      };

      await updateMeetingMutation.mutateAsync({
        meetingId: meeting.id,
        outcomeData: updateData
      });

      onClose();
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Atualizar Status da Reunião
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {meeting.lead_master?.first_name} {meeting.lead_master?.last_name}
              {meeting.lead_master?.company && ` • ${meeting.lead_master.company}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Outcome Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Resultado da Reunião *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(MEETING_OUTCOME_LABELS) as [MeetingOutcome, string][])
                  .filter(([outcome]) => outcome !== 'agendada') // Não permitir voltar para "agendada"
                  .map(([outcome, label]) => {
                    const IconComponent = outcomeIcons[outcome];
                    const isSelected = selectedOutcome === outcome;
                    
                    return (
                      <button
                        key={outcome}
                        type="button"
                        onClick={() => setSelectedOutcome(outcome)}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div className={`p-2 rounded-lg ${
                            isSelected ? outcomeColors[outcome] : 'text-gray-400 bg-gray-100'
                          }`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <span className={`text-sm font-medium ${
                            isSelected ? 'text-blue-900' : 'text-gray-700'
                          }`}>
                            {label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
              {errors.outcome && (
                <p className="mt-2 text-sm text-red-600">{errors.outcome}</p>
              )}
            </div>

            {/* No-Show Reason (condicional) */}
            {selectedOutcome === 'no_show' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo do No-Show *
                </label>
                <select
                  value={noShowReason}
                  onChange={(e) => setNoShowReason(e.target.value as NoShowReason)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.noShowReason ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecione o motivo</option>
                  {Object.entries(NO_SHOW_REASON_LABELS).map(([reason, label]) => (
                    <option key={reason} value={reason}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.noShowReason && (
                  <p className="mt-1 text-sm text-red-600">{errors.noShowReason}</p>
                )}
              </div>
            )}

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações (Opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione detalhes sobre o resultado da reunião..."
                rows={3}
                maxLength={500}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.notes ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              <div className="flex justify-between mt-1">
                {errors.notes && (
                  <p className="text-sm text-red-600">{errors.notes}</p>
                )}
                <p className="text-xs text-gray-500 ml-auto">
                  {notes.length}/500
                </p>
              </div>
            </div>

            {/* Warning para no-show */}
            {selectedOutcome === 'no_show' && (
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Atenção: No-Show será contabilizado
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Esta ação irá incrementar o contador de no-show do lead e pode afetar 
                    as métricas do pipeline.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMeetingMutation.isPending || !selectedOutcome}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateMeetingMutation.isPending ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Atualizando...
                </div>
              ) : (
                'Atualizar Status'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};