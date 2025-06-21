
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Star, Target, Save } from 'lucide-react';

interface ScoringRule {
  id?: string;
  field_key: string;
  field_value: string;
  score_points: number;
  condition_type: 'equals' | 'contains' | 'not_empty' | 'greater_than' | 'less_than';
}

interface MQLScoringManagerProps {
  formId: string;
  formSchema: any;
  onSave: () => void;
}

const MQLScoringManager: React.FC<MQLScoringManagerProps> = ({ formId, formSchema, onSave }) => {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(70);
  const [availableFields, setAvailableFields] = useState<any[]>([]);

  useEffect(() => {
    loadScoringRules();
    extractFormFields();
  }, [formId, formSchema]);

  const extractFormFields = () => {
    if (!formSchema?.components) return;
    
    const fields = formSchema.components
      .filter((comp: any) => comp.input !== false)
      .map((comp: any) => ({
        key: comp.key,
        label: comp.label || comp.key,
        type: comp.type
      }));
    
    setAvailableFields(fields);
  };

  const loadScoringRules = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_scoring_rules')
        .select('*')
        .eq('form_id', formId);

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
    }
  };

  const addRule = () => {
    setRules([...rules, {
      field_key: '',
      field_value: '',
      score_points: 10,
      condition_type: 'equals'
    }]);
  };

  const updateRule = (index: number, field: keyof ScoringRule, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const saveRules = async () => {
    setLoading(true);
    try {
      // Deletar regras existentes
      await supabase
        .from('lead_scoring_rules')
        .delete()
        .eq('form_id', formId);

      // Inserir novas regras
      if (rules.length > 0) {
        const { error } = await supabase
          .from('lead_scoring_rules')
          .insert(
            rules.map(rule => ({
              form_id: formId,
              field_key: rule.field_key,
              field_value: rule.field_value,
              score_points: rule.score_points,
              condition_type: rule.condition_type
            }))
          );

        if (error) throw error;
      }

      onSave();
      alert('Regras de pontuação salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar regras:', error);
      alert('Erro ao salvar regras');
    } finally {
      setLoading(false);
    }
  };

  const calculatePreviewScore = () => {
    return rules.reduce((total, rule) => total + (rule.score_points || 0), 0);
  };

  const getConditionText = (condition: string) => {
    const conditions = {
      equals: 'é igual a',
      contains: 'contém',
      not_empty: 'não está vazio',
      greater_than: 'é maior que',
      less_than: 'é menor que'
    };
    return conditions[condition as keyof typeof conditions] || condition;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Star className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sistema de Pontuação MQL</h2>
            <p className="text-sm text-gray-500">Configure as regras para qualificação automática de leads</p>
          </div>
        </div>

        <button
          onClick={saveRules}
          disabled={loading}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <Save size={16} />
          <span>{loading ? 'Salvando...' : 'Salvar Regras'}</span>
        </button>
      </div>

      {/* Configuração do Threshold */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <Target className="text-blue-600" size={20} />
          <h3 className="font-medium text-blue-900">Limite de Qualificação</h3>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-24 px-3 py-2 border border-blue-200 rounded-lg"
            min="0"
            max="1000"
          />
          <span className="text-blue-700">pontos mínimos para ser considerado MQL</span>
        </div>
        
        <div className="mt-3 flex items-center space-x-4">
          <div className="text-sm text-blue-700">
            <strong>Score Máximo Atual:</strong> {calculatePreviewScore()} pontos
          </div>
          <div className={`text-sm font-medium ${calculatePreviewScore() >= threshold ? 'text-green-600' : 'text-orange-600'}`}>
            {calculatePreviewScore() >= threshold ? '✓ Qualificado como MQL' : '⚠ Não qualifica como MQL'}
          </div>
        </div>
      </div>

      {/* Regras de Pontuação */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Regras de Pontuação</h3>
          <button
            onClick={addRule}
            className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200"
          >
            <Plus size={16} />
            <span>Adicionar Regra</span>
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Star size={32} className="mx-auto mb-3 text-gray-300" />
            <p>Nenhuma regra de pontuação configurada</p>
            <p className="text-sm">Adicione regras para qualificar leads automaticamente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Campo */}
                  <div className="col-span-3">
                    <select
                      value={rule.field_key}
                      onChange={(e) => updateRule(index, 'field_key', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Selecionar campo</option>
                      {availableFields.map(field => (
                        <option key={field.key} value={field.key}>
                          {field.label} ({field.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Condição */}
                  <div className="col-span-2">
                    <select
                      value={rule.condition_type}
                      onChange={(e) => updateRule(index, 'condition_type', e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="equals">é igual a</option>
                      <option value="contains">contém</option>
                      <option value="not_empty">não vazio</option>
                      <option value="greater_than">maior que</option>
                      <option value="less_than">menor que</option>
                    </select>
                  </div>

                  {/* Valor */}
                  <div className="col-span-3">
                    {rule.condition_type !== 'not_empty' && (
                      <input
                        type="text"
                        value={rule.field_value}
                        onChange={(e) => updateRule(index, 'field_value', e.target.value)}
                        placeholder="Valor de referência"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    )}
                  </div>

                  {/* Pontos */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={rule.score_points}
                      onChange={(e) => updateRule(index, 'score_points', Number(e.target.value))}
                      placeholder="Pontos"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      min="0"
                      max="100"
                    />
                  </div>

                  {/* Ações */}
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => removeRule(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Preview da Regra */}
                <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Regra:</strong> Se <em>{rule.field_key || 'campo'}</em> {getConditionText(rule.condition_type)} 
                  {rule.condition_type !== 'not_empty' && <em> "{rule.field_value || 'valor'}"</em>}, 
                  adicionar <strong>{rule.score_points || 0} pontos</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exemplos de Pontuação */}
      <div className="mt-6 bg-green-50 p-4 rounded-lg">
        <h4 className="font-medium text-green-800 mb-2">💡 Exemplos de Pontuação</h4>
        <div className="text-sm text-green-700 space-y-1">
          <div>• <strong>CEO/Diretor:</strong> 30-40 pontos (alto poder de decisão)</div>
          <div>• <strong>Empresa Grande (>100 funcionários):</strong> 25-35 pontos</div>
          <div>• <strong>Orçamento Alto (>R$10k):</strong> 40-50 pontos</div>
          <div>• <strong>Urgência Alta:</strong> 20-30 pontos</div>
          <div>• <strong>Telefone preenchido:</strong> 15-20 pontos</div>
          <div>• <strong>LinkedIn preenchido:</strong> 10-15 pontos</div>
        </div>
      </div>
    </div>
  );
};

export default MQLScoringManager;
