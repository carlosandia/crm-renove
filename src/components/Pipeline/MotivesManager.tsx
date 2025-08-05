import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Trophy, X, Trash2, CheckCircle, XCircle } from 'lucide-react';

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
    colorClasses: string
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className={`text-base flex items-center gap-2 ${colorClasses}`}>
          {icon}
          {title}
        </CardTitle>
        <p className="text-sm text-gray-500">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Motivos existentes */}
          {outcomeReasons[type].length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Motivos Configurados</h4>
                <span className="text-xs text-gray-500">
                  {outcomeReasons[type].length} motivo{outcomeReasons[type].length !== 1 ? 's' : ''}
                </span>
              </div>
              {outcomeReasons[type].map((reason) => (
                <div key={reason.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className={`p-1 rounded-full ${colorClasses} text-white mt-1`}>
                    {type === 'won' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Texto do motivo"
                      value={reason.reason_text}
                      onChange={(e) => handleUpdateReason(type, reason.id, 'reason_text', e.target.value)}
                      className="text-sm font-medium"
                    />
                    {reason.is_default && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                        Padrão
                      </span>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveReason(type, reason.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Botão para adicionar motivos padrão */}
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Motivos Padrão</p>
              <p className="text-xs text-gray-500">
                Adicionar motivos comuns de {type === 'won' ? 'ganho' : 'perda'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddDefaultReasons(type)}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Adicionar Padrão
            </Button>
          </div>

          {/* Formulário para novo motivo */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Novo Motivo *
              </label>
              <Input
                placeholder={`Ex: ${type === 'won' ? 'Proposta aceita' : 'Preço muito alto'}`}
                value={newReason.reason_text || ''}
                onChange={(e) => setNewReason(prev => ({ ...prev, reason_text: e.target.value }))}
                className="text-sm"
              />
            </div>
            
            <div className="flex justify-end">
              <Button
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
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Motivos de Ganho e Perda</h3>
        </div>
        <div className="text-sm text-gray-500">
          {outcomeReasons.won.length + outcomeReasons.lost.length} motivos configurados
        </div>
      </div>

      {/* Motivos de Ganho */}
      {renderReasonForm(
        'won',
        newWonReason,
        setNewWonReason,
        handleAddWonReason,
        'Motivos de Ganho',
        <Trophy className="h-4 w-4" />,
        'Motivos pelos quais leads são conquistados com sucesso',
        'bg-green-600'
      )}

      {/* Motivos de Perda */}
      {renderReasonForm(
        'lost',
        newLostReason,
        setNewLostReason,
        handleAddLostReason,
        'Motivos de Perda',
        <X className="h-4 w-4" />,
        'Motivos pelos quais leads são perdidos ou não convertidos',
        'bg-red-600'
      )}

      {/* Informações sobre o uso */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-purple-900 mb-2 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Como usar os motivos
        </h4>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>• <strong>Ganho:</strong> Selecionados quando um lead é movido para "Ganho"</li>
          <li>• <strong>Perda:</strong> Selecionados quando um lead é movido para "Perdido"</li>
          <li>• <strong>Analytics:</strong> Dados usados para relatórios de performance e insights</li>
          <li>• <strong>Melhoria:</strong> Identifique padrões para otimizar seu processo de vendas</li>
        </ul>
      </div>
    </div>
  );
};

export default MotivesManager;