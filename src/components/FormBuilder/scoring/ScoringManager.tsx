import React, { useCallback, useMemo, useState } from 'react';
import { ScoringRule, FormField } from '../../../types/Forms';

export interface ScoringManagerProps {
  scoringRules: ScoringRule[];
  scoringThreshold: number;
  fields: FormField[];
  onScoringRulesChange: (rules: ScoringRule[]) => void;
  onScoringThresholdChange: (threshold: number) => void;
}

export interface ScoringManagerReturn {
  // CRUD de regras
  addScoringRule: (rule: ScoringRule) => void;
  updateScoringRule: (ruleId: string, updates: Partial<ScoringRule>) => void;
  removeScoringRule: (ruleId: string) => void;
  
  // Cálculos
  calculateMaxScore: () => number;
  calculateScore: (formData: Record<string, any>) => number;
  isQualifiedLead: (score: number) => boolean;
  
  // Validações
  validateRule: (rule: ScoringRule) => { isValid: boolean; errors: string[] };
  
  // Utilidades
  getAvailableFields: () => FormField[];
  getFieldOptions: (fieldId: string) => string[];
}

export const useScoringManager = (
  scoringRules: ScoringRule[],
  scoringThreshold: number,
  fields: FormField[],
  onScoringRulesChange: (rules: ScoringRule[]) => void,
  onScoringThresholdChange: (threshold: number) => void
): ScoringManagerReturn => {

  const generateId = useCallback(() => {
    return Math.random().toString(36).substr(2, 9);
  }, []);

  const addScoringRule = useCallback((rule: ScoringRule) => {
    const newRule = { ...rule, id: generateId() };
    const updatedRules = [...scoringRules, newRule];
    onScoringRulesChange(updatedRules);
  }, [scoringRules, onScoringRulesChange, generateId]);

  const updateScoringRule = useCallback((ruleId: string, updates: Partial<ScoringRule>) => {
    const updatedRules = scoringRules.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    onScoringRulesChange(updatedRules);
  }, [scoringRules, onScoringRulesChange]);

  const removeScoringRule = useCallback((ruleId: string) => {
    const updatedRules = scoringRules.filter(rule => rule.id !== ruleId);
    onScoringRulesChange(updatedRules);
  }, [scoringRules, onScoringRulesChange]);

  const calculateMaxScore = useCallback(() => {
    return scoringRules.reduce((sum, rule) => sum + rule.points, 0);
  }, [scoringRules]);

  const calculateScore = useCallback((formData: Record<string, any>): number => {
    let totalScore = 0;

    scoringRules.forEach(rule => {
      const field = fields.find(f => f.id === rule.field_id);
      if (!field) return;

      const fieldValue = formData[field.field_name];
      if (!fieldValue) return;

      let ruleMatches = false;

      switch (rule.condition) {
        case 'equals':
          ruleMatches = fieldValue.toString().toLowerCase() === rule.value.toLowerCase();
          break;
        
        case 'contains':
          ruleMatches = fieldValue.toString().toLowerCase().includes(rule.value.toLowerCase());
          break;
        
        case 'greater_than':
          const numValue = parseFloat(fieldValue);
          const numRule = parseFloat(rule.value);
          ruleMatches = !isNaN(numValue) && !isNaN(numRule) && numValue > numRule;
          break;
        
        case 'less_than':
          const numValue2 = parseFloat(fieldValue);
          const numRule2 = parseFloat(rule.value);
          ruleMatches = !isNaN(numValue2) && !isNaN(numRule2) && numValue2 < numRule2;
          break;
        
        case 'not_empty':
          ruleMatches = fieldValue.toString().trim() !== '';
          break;
        
        case 'range':
          const [min, max] = rule.value.split(',').map(v => parseFloat(v.trim()));
          const rangeValue = parseFloat(fieldValue);
          ruleMatches = !isNaN(rangeValue) && !isNaN(min) && !isNaN(max) && 
                       rangeValue >= min && rangeValue <= max;
          break;
      }

      if (ruleMatches) {
        totalScore += rule.points;
      }
    });

    return totalScore;
  }, [scoringRules, fields]);

  const isQualifiedLead = useCallback((score: number): boolean => {
    return score >= scoringThreshold;
  }, [scoringThreshold]);

  const validateRule = useCallback((rule: ScoringRule): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!rule.field_id) {
      errors.push('Campo é obrigatório');
    }

    if (!rule.condition) {
      errors.push('Condição é obrigatória');
    }

    if (!rule.value && rule.condition !== 'not_empty') {
      errors.push('Valor é obrigatório para esta condição');
    }

    if (rule.points === undefined || rule.points === null) {
      errors.push('Pontos são obrigatórios');
    } else if (rule.points < 0) {
      errors.push('Pontos não podem ser negativos');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const getAvailableFields = useCallback(() => {
    return fields.filter(field => 
      ['text', 'email', 'number', 'select', 'radio', 'checkbox', 'rating', 'range'].includes(field.field_type)
    );
  }, [fields]);

  const getFieldOptions = useCallback((fieldId: string): string[] => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return [];
    
    if (field.field_options.options) {
      return field.field_options.options;
    }
    
    return [];
  }, [fields]);

  return {
    addScoringRule,
    updateScoringRule,
    removeScoringRule,
    calculateMaxScore,
    calculateScore,
    isQualifiedLead,
    validateRule,
    getAvailableFields,
    getFieldOptions
  };
};

export const ScoringManager: React.FC<ScoringManagerProps> = ({
  scoringRules,
  scoringThreshold,
  fields,
  onScoringRulesChange,
  onScoringThresholdChange
}) => {
  const [newRule, setNewRule] = useState<Partial<ScoringRule>>({
    field_id: '',
    condition: 'equals',
    value: '',
    points: 10,
    description: ''
  });

  const scoringManager = useScoringManager(
    scoringRules,
    scoringThreshold,
    fields,
    onScoringRulesChange,
    onScoringThresholdChange
  );

  const maxScore = scoringManager.calculateMaxScore();
  const availableFields = scoringManager.getAvailableFields();

  const handleAddRule = () => {
    if (newRule.field_id && newRule.condition && newRule.points !== undefined) {
      const rule: ScoringRule = {
        id: '',
        field_id: newRule.field_id!,
        condition: newRule.condition!,
        value: newRule.value || '',
        points: newRule.points!,
        description: newRule.description || ''
      };

      const validation = scoringManager.validateRule(rule);
      if (validation.isValid) {
        scoringManager.addScoringRule(rule);
        setNewRule({
          field_id: '',
          condition: 'equals',
          value: '',
          points: 10,
          description: ''
        });
      } else {
        alert('Erro na regra: ' + validation.errors.join(', '));
      }
    }
  };

  return (
    <div className="scoring-manager space-y-6 p-6">
      {/* Resumo do Sistema de Score */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-blue-900">
            Sistema de Pontuação MQL
          </h3>
          <div className="text-blue-700">
            <span className="text-sm">Score Máximo: </span>
            <span className="font-bold text-lg">{maxScore}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Threshold MQL (pontos mínimos)
            </label>
            <input
              type="number"
              min="0"
              max={maxScore}
              value={scoringThreshold}
              onChange={(e) => onScoringThresholdChange(parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-1 border border-blue-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* Lista de Regras Existentes */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">
          Regras de Pontuação ({scoringRules.length})
        </h4>

        <div className="space-y-3">
          {scoringRules.map((rule) => {
            const field = fields.find(f => f.id === rule.field_id);
            return (
              <div key={rule.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {field?.field_label || 'Campo não encontrado'} {rule.condition} "{rule.value}"
                  </div>
                  <div className="text-sm text-gray-500">
                    +{rule.points} pontos {rule.description && `• ${rule.description}`}
                  </div>
                </div>
                
                <button
                  onClick={() => scoringManager.removeScoringRule(rule.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Remover regra"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}

          {scoringRules.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <p className="text-sm">Nenhuma regra de pontuação configurada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScoringManager; 