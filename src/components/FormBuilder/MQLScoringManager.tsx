
import React, { useState } from 'react';
import { Star, Plus, Trash2, Save } from 'lucide-react';

interface MQLRule {
  id: string;
  fieldName: string;
  condition: string;
  value: string;
  points: number;
}

interface MQLScoringManagerProps {
  form: any;
  onSave: (scoringConfig: { mql_rules: MQLRule[]; mql_threshold: number }) => void;
}

const MQLScoringManager: React.FC<MQLScoringManagerProps> = ({ form, onSave }) => {
  const [rules, setRules] = useState<MQLRule[]>(form?.qualification_rules?.mql_rules || []);
  const [threshold, setThreshold] = useState(form?.qualification_rules?.mql_threshold || 70);

  const addRule = () => {
    const newRule: MQLRule = {
      id: Date.now().toString(),
      fieldName: '',
      condition: 'equals',
      value: '',
      points: 10
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, field: keyof MQLRule, value: any) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  const handleSave = () => {
    const scoringConfig = {
      mql_rules: rules,
      mql_threshold: threshold
    };
    onSave(scoringConfig);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Star className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sistema MQL Scoring</h2>
            <p className="text-sm text-gray-500">Configure regras de pontuação para qualificar leads</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Save size={16} />
          <span>Salvar</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Threshold Configuration */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pontuação Mínima para MQL
          </label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min="0"
            max="1000"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leads com pontuação igual ou superior serão marcados como MQL
          </p>
        </div>

        {/* Rules List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Regras de Pontuação</h3>
            <button
              onClick={addRule}
              className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
            >
              <Plus size={16} />
              <span>Nova Regra</span>
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Star size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Nenhuma regra configurada</p>
              <p className="text-sm">Adicione regras para começar a pontuar leads</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Campo
                      </label>
                      <input
                        type="text"
                        value={rule.fieldName}
                        onChange={(e) => updateRule(rule.id, 'fieldName', e.target.value)}
                        placeholder="nome_do_campo"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Condição
                      </label>
                      <select
                        value={rule.condition}
                        onChange={(e) => updateRule(rule.id, 'condition', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="equals">Igual a</option>
                        <option value="contains">Contém</option>
                        <option value="greater_than">Maior que</option>
                        <option value="less_than">Menor que</option>
                        <option value="not_empty">Não vazio</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor
                      </label>
                      <input
                        type="text"
                        value={rule.value}
                        onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                        placeholder="valor_esperado"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pontos
                      </label>
                      <input
                        type="number"
                        value={rule.points}
                        onChange={(e) => updateRule(rule.id, 'points', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="100"
                      />
                    </div>

                    <div>
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover regra"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        {rules.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Resumo do Sistema</h4>
            <div className="text-sm text-blue-700">
              <p>• {rules.length} regra(s) configurada(s)</p>
              <p>• Pontuação máxima possível: {rules.reduce((sum, rule) => sum + rule.points, 0)} pontos</p>
              <p>• Threshold MQL: {threshold} pontos</p>
              <p>• Taxa de qualificação estimada: {threshold > 0 ? Math.min(100, Math.round((threshold / rules.reduce((sum, rule) => sum + rule.points, 0)) * 100)) : 0}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MQLScoringManager;
