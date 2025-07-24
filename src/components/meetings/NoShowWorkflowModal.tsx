// =====================================================================================
// COMPONENT: NoShowWorkflowModal
// Autor: Claude (Arquiteto Sênior)
// Descrição: Modal workflow inteligente para no-show seguindo padrões enterprise
// =====================================================================================

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, PhoneOff, UserX, Zap, Mail, RotateCcw, CheckCircle } from 'lucide-react';

// AIDEV-NOTE: Interface para props do modal
interface NoShowWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  meetingData?: {
    planned_at: string;
    owner_name?: string;
  };
  onComplete: (result: NoShowResult) => void;
}

// AIDEV-NOTE: Interface para resultado do no-show
interface NoShowResult {
  action: 'completed' | 'reschedule';
  noShowData?: {
    no_show_reason: string;
    notes?: string;
    next_action: string;
    follow_up_type?: string;
  };
  rescheduleData?: {
    new_planned_at: string;
    reschedule_reason: string;
    notes?: string;
  };
}

// AIDEV-NOTE: Motivos de no-show padronizados (seguindo DB constraint)
const NO_SHOW_REASONS = [
  {
    value: 'nao_atendeu',
    label: 'Não atendeu telefone/chamada',
    icon: PhoneOff,
    suggestion: 'follow_up',
    description: 'Cliente não atendeu a ligação ou chamada'
  },
  {
    value: 'esqueceu',
    label: 'Esqueceu da reunião',
    icon: Clock,
    suggestion: 'reagendar',
    description: 'Cliente esqueceu do agendamento'
  },
  {
    value: 'sem_interesse',
    label: 'Sem interesse no momento',
    icon: UserX,
    suggestion: 'finalizar',
    description: 'Cliente demonstrou falta de interesse'
  },
  {
    value: 'problema_tecnico',
    label: 'Problema técnico',
    icon: Zap,
    suggestion: 'reagendar',
    description: 'Falha técnica impediu a reunião'
  },
  {
    value: 'outro',
    label: 'Outro motivo',
    icon: AlertCircle,
    suggestion: 'finalizar',
    description: 'Outro motivo não listado'
  }
];

// AIDEV-NOTE: Próximos passos baseados no motivo
const NEXT_ACTIONS = [
  {
    value: 'reagendar',
    label: 'Reagendar para nova data',
    icon: RotateCcw,
    color: 'blue',
    description: 'Agendar nova reunião'
  },
  {
    value: 'finalizar',
    label: 'Finalizar (sem reagendamento)',
    icon: CheckCircle,
    color: 'gray',
    description: 'Marcar como no-show final'
  },
  {
    value: 'follow_up',
    label: 'Enviar follow-up por email',
    icon: Mail,
    color: 'green',
    description: 'Tentar contato por email'
  }
];

export const NoShowWorkflowModal: React.FC<NoShowWorkflowModalProps> = ({
  isOpen,
  onClose,
  meetingId,
  meetingData,
  onComplete
}) => {
  // AIDEV-NOTE: Estados do workflow
  const [step, setStep] = useState<'motivo' | 'proximo_passo'>('motivo');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AIDEV-NOTE: Reset states quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      setStep('motivo');
      setSelectedReason('');
      setSelectedAction('');
      setNotes('');
      setCustomReason('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // AIDEV-NOTE: Sugestão inteligente baseada no motivo
  useEffect(() => {
    if (selectedReason) {
      const reason = NO_SHOW_REASONS.find(r => r.value === selectedReason);
      if (reason) {
        setSelectedAction(reason.suggestion);
      }
    }
  }, [selectedReason]);

  // AIDEV-NOTE: Handler para continuar para próximo passo
  const handleContinueToNextStep = () => {
    if (!selectedReason) return;
    setStep('proximo_passo');
  };

  // AIDEV-NOTE: Handler para voltar ao passo anterior
  const handleBackToReason = () => {
    setStep('motivo');
  };

  // AIDEV-NOTE: Handler para confirmar no-show
  const handleConfirmNoShow = async () => {
    if (!selectedReason || !selectedAction) return;

    setIsSubmitting(true);

    try {
      if (selectedAction === 'reagendar') {
        // Retorna para componente pai lidar com reagendamento
        onComplete({
          action: 'reschedule',
          noShowData: {
            no_show_reason: selectedReason,
            notes: notes || customReason,
            next_action: selectedAction
          }
        });
      } else {
        // Finaliza no-show
        onComplete({
          action: 'completed',
          noShowData: {
            no_show_reason: selectedReason,
            notes: notes || customReason,
            next_action: selectedAction,
            follow_up_type: selectedAction === 'follow_up' ? 'email' : undefined
          }
        });
      }
    } catch (error) {
      console.error('Erro ao processar no-show:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedReasonData = NO_SHOW_REASONS.find(r => r.value === selectedReason);
  const selectedActionData = NEXT_ACTIONS.find(a => a.value === selectedAction);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Registrar No-Show
              </h3>
              <p className="text-sm text-gray-500">
                {meetingData ? new Date(meetingData.planned_at).toLocaleDateString('pt-BR') : 'Reunião'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              step === 'motivo' ? 'text-blue-600' : 'text-green-600'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step === 'motivo' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {step === 'motivo' ? '1' : '✓'}
              </div>
              <span className="text-sm font-medium">Motivo</span>
            </div>
            <div className="flex-1 h-px bg-gray-300" />
            <div className={`flex items-center space-x-2 ${
              step === 'proximo_passo' ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step === 'proximo_passo' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Próximo Passo</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'motivo' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Por que o cliente não compareceu à reunião?
                </h4>
                <div className="space-y-2">
                  {NO_SHOW_REASONS.map((reason) => {
                    const IconComponent = reason.icon;
                    return (
                      <label
                        key={reason.value}
                        className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedReason === reason.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="no_show_reason"
                          value={reason.value}
                          checked={selectedReason === reason.value}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="sr-only"
                        />
                        <IconComponent className={`w-5 h-5 mt-0.5 mr-3 ${
                          selectedReason === reason.value ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {reason.label}
                          </div>
                          <div className="text-sm text-gray-500">
                            {reason.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {selectedReason === 'outro' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Especifique o motivo
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Descreva o motivo específico..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações adicionais (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais sobre o no-show..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>
            </div>
          )}

          {step === 'proximo_passo' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Motivo selecionado:
                </h4>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  {selectedReasonData && (
                    <>
                      <selectedReasonData.icon className="w-5 h-5 text-gray-600 mr-3" />
                      <span className="text-sm text-gray-900">
                        {selectedReasonData.label}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  O que gostaria de fazer agora?
                </h4>
                
                {selectedReasonData && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                      <span className="text-sm font-medium text-blue-800">
                        Sugestão: {NEXT_ACTIONS.find(a => a.value === selectedReasonData.suggestion)?.label}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {NEXT_ACTIONS.map((action) => {
                    const IconComponent = action.icon;
                    return (
                      <label
                        key={action.value}
                        className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAction === action.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="next_action"
                          value={action.value}
                          checked={selectedAction === action.value}
                          onChange={(e) => setSelectedAction(e.target.value)}
                          className="sr-only"
                        />
                        <IconComponent className={`w-5 h-5 mt-0.5 mr-3 ${
                          selectedAction === action.value ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {action.label}
                          </div>
                          <div className="text-sm text-gray-500">
                            {action.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          {step === 'motivo' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleContinueToNextStep}
                disabled={!selectedReason || (selectedReason === 'outro' && !customReason)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleBackToReason}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmNoShow}
                disabled={!selectedAction || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processando...' : 
                 selectedAction === 'reagendar' ? 'Continuar p/ Reagendamento' : 'Confirmar No-Show'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoShowWorkflowModal;