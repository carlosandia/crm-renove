import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { BlurFade } from '../ui/blur-fade';
import { Plus, Trophy, X, Trash2, CheckCircle, XCircle, Target } from 'lucide-react';

// AIDEV-NOTE: Componente para gerenciar motivos de ganho e perda (pipeline_outcome_reasons JSONB)
// Essencial para analytics e melhoria contínua do processo de vendas

export interface OutcomeReason {
  id: string;
  reason_type: 'won' | 'lost';
  reason_text: string;
  description: string;
  is_default?: boolean;
}

export interface OutcomeReasons {
  won: OutcomeReason[];
  lost: OutcomeReason[];
}

interface MotivesManagerProps {
  pipelineId?: string;
  outcomeReasons: OutcomeReasons;
  onOutcomeReasonsChange: (reasons: OutcomeReasons) => void;
  isEditMode?: boolean;
}

const DEFAULT_WON_REASONS = [
  { value: 'budget_approved', label: 'Orçamento aprovado' },
  { value: 'proposal_accepted', label: 'Proposta aceita' },
  { value: 'contract_signed', label: 'Contrato assinado' },
  { value: 'immediate_need', label: 'Necessidade imediata' },
  { value: 'good_fit', label: 'Boa adequação de produto' }
];

const DEFAULT_LOST_REASONS = [
  { value: 'budget_constraints', label: 'Restrições orçamentárias' },
  { value: 'competitor_chosen', label: 'Concorrente escolhido' },
  { value: 'no_response', label: 'Sem resposta' },
  { value: 'timing_not_right', label: 'Timing inadequado' },
  { value: 'not_qualified', label: 'Lead não qualificado' },
  { value: 'price_too_high', label: 'Preço muito alto' },
  { value: 'feature_missing', label: 'Funcionalidade ausente' }
];

export const MotivesManager: React.FC<MotivesManagerProps> = ({
  pipelineId,
  outcomeReasons = { won: [], lost: [] },
  onOutcomeReasonsChange,
  isEditMode = false
}) => {
  const [newWonReason, setNewWonReason] = useState<Partial<OutcomeReason>>({
    reason_type: 'won',
    reason_text: ''
  });

  const [newLostReason, setNewLostReason] = useState<Partial<OutcomeReason>>({
    reason_type: 'lost',
    reason_text: ''
  });

  // ✅ CORREÇÃO: Adicionar motivo de ganho
  const handleAddWonReason = useCallback(() => {
    if (!newWonReason.reason_text?.trim()) return;

    const reason: OutcomeReason = {
      id: `won_${Date.now()}`,
      reason_type: 'won',
      reason_text: newWonReason.reason_text.trim(),
      description: '',
      is_default: false
    };

    const updatedReasons = {
      ...outcomeReasons,
      won: [...outcomeReasons.won, reason]
    };
    onOutcomeReasonsChange(updatedReasons);

    // Limpar formulário
    setNewWonReason({
      reason_type: 'won',
      reason_text: ''
    });
  }, [newWonReason, outcomeReasons, onOutcomeReasonsChange]);

  // ✅ CORREÇÃO: Adicionar motivo de perda
  const handleAddLostReason = useCallback(() => {
    if (!newLostReason.reason_text?.trim()) return;

    const reason: OutcomeReason = {
      id: `lost_${Date.now()}`,
      reason_type: 'lost',
      reason_text: newLostReason.reason_text.trim(),
      description: '',
      is_default: false
    };

    const updatedReasons = {
      ...outcomeReasons,
      lost: [...outcomeReasons.lost, reason]
    };
    onOutcomeReasonsChange(updatedReasons);

    // Limpar formulário
    setNewLostReason({
      reason_type: 'lost',
      reason_text: ''
    });
  }, [newLostReason, outcomeReasons, onOutcomeReasonsChange]);

  // ✅ CORREÇÃO: Remover motivo
  const handleRemoveReason = useCallback((type: 'won' | 'lost', reasonId: string) => {
    const updatedReasons = {
      ...outcomeReasons,
      [type]: outcomeReasons[type].filter(reason => reason.id !== reasonId)
    };
    onOutcomeReasonsChange(updatedReasons);
  }, [outcomeReasons, onOutcomeReasonsChange]);

  // ✅ CORREÇÃO: Atualizar motivo existente
  const handleUpdateReason = useCallback((type: 'won' | 'lost', reasonId: string, field: keyof OutcomeReason, value: string) => {
    const updatedReasons = {
      ...outcomeReasons,
      [type]: outcomeReasons[type].map(reason => 
        reason.id === reasonId ? { ...reason, [field]: value } : reason
      )
    };
    onOutcomeReasonsChange(updatedReasons);
  }, [outcomeReasons, onOutcomeReasonsChange]);

  // ✅ CORREÇÃO: Adicionar motivos padrão
  const handleAddDefaultReasons = useCallback((type: 'won' | 'lost') => {
    const defaults = type === 'won' ? DEFAULT_WON_REASONS : DEFAULT_LOST_REASONS;
    const existingTexts = outcomeReasons[type].map(r => r.reason_text.toLowerCase());
    
    const newReasons = defaults
      .filter(def => !existingTexts.includes(def.label.toLowerCase()))
      .map(def => ({
        id: `${type}_default_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reason_type: type,
        reason_text: def.label,
        description: `Motivo padrão: ${def.label}`,
        is_default: true
      }));

    if (newReasons.length > 0) {
      const updatedReasons = {
        ...outcomeReasons,
        [type]: [...outcomeReasons[type], ...newReasons]
      };
      onOutcomeReasonsChange(updatedReasons);
    }
  }, [outcomeReasons, onOutcomeReasonsChange]);

  const renderReasonForm = (
    type: 'won' | 'lost',
    newReason: Partial<OutcomeReason>,
    setNewReason: React.Dispatch<React.SetStateAction<Partial<OutcomeReason>>>,
    handleAdd: () => void,
    title: string,
    icon: React.ReactNode,
    description: string,
    bgColorClass: string,
    iconColorClass: string
  ) => (
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
        {outcomeReasons[type].length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700">Motivos Configurados</h4>
            {outcomeReasons[type].map((reason) => (
              <div key={reason.id} className="flex items-center gap-3 p-4 bg-white/80 border border-slate-200 rounded-lg shadow-sm">
                <div className="flex-1">
                  <Input
                    placeholder="Texto do motivo"
                    value={reason.reason_text}
                    onChange={(e) => handleUpdateReason(type, reason.id, 'reason_text', e.target.value)}
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
                  onClick={() => handleRemoveReason(type, reason.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
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
                placeholder={`Ex: ${type === 'won' ? 'Proposta aceita' : 'Preço muito alto'}`}
                value={newReason.reason_text || ''}
                onChange={(e) => setNewReason(prev => ({ ...prev, reason_text: e.target.value }))}
                className="border-slate-300 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddDefaultReasons(type)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Padrão
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!newReason.reason_text?.trim()}
            className="flex items-center gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Adicionar Motivo
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <BlurFade delay={0.1} direction="up">
        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Target className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Motivos de Ganho e Perda</h3>
              <p className="text-sm text-slate-500">
                {outcomeReasons.won.length + outcomeReasons.lost.length} motivos configurados
              </p>
            </div>
          </div>
        </div>
      </BlurFade>

      {/* Motivos de Ganho */}
      <BlurFade delay={0.2} direction="up">
        {renderReasonForm(
          'won',
          newWonReason,
          setNewWonReason,
          handleAddWonReason,
          'Motivos de Ganho',
          <Trophy className="h-4 w-4 text-green-600" />,
          'Motivos pelos quais leads são conquistados com sucesso',
          'bg-green-50',
          'text-green-600'
        )}
      </BlurFade>

      {/* Motivos de Perda */}
      <BlurFade delay={0.3} direction="up">
        {renderReasonForm(
          'lost',
          newLostReason,
          setNewLostReason,
          handleAddLostReason,
          'Motivos de Perda',
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