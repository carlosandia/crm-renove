import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Target, Users, Trash2, AlertCircle } from 'lucide-react';

// AIDEV-NOTE: Componente para gerenciar regras de qualificação (qualification_rules JSONB)
// Suporta regras MQL (Marketing Qualified Lead) e SQL (Sales Qualified Lead)

export interface QualificationRule {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_empty' | 'in_list';
  value: string;
  description: string;
}

export interface QualificationRules {
  mql: QualificationRule[];
  sql: QualificationRule[];
}

// ✅ NOVO: Interface para campos disponíveis (sistema + customizados)
export interface FieldOption {
  value: string;
  label: string;
  type?: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
}

interface QualificationManagerProps {
  pipelineId?: string;
  qualificationRules: QualificationRules;
  onQualificationRulesChange: (rules: QualificationRules) => void;
  isEditMode?: boolean;
  // ✅ NOVO: Campos disponíveis do sistema + customizados
  availableFields?: FieldOption[];
}

const QUALIFICATION_OPERATORS = [
  { value: 'equals', label: 'É igual a' },
  { value: 'contains', label: 'Contém' },
  { value: 'greater_than', label: 'Maior que' },
  { value: 'less_than', label: 'Menor que' },
  { value: 'not_empty', label: 'Não está vazio' },
  { value: 'in_list', label: 'Está na lista' }
] as const;

// ✅ ALTERADO: Campos padrão como fallback (agora dinâmico via props)
const DEFAULT_FIELDS: FieldOption[] = [
  { value: 'nome_lead', label: 'Nome do Lead', type: 'text' },
  { value: 'email', label: 'E-mail', type: 'email' },
  { value: 'phone', label: 'Telefone', type: 'phone' },
  { value: 'company', label: 'Empresa', type: 'text' },
  { value: 'source', label: 'Origem', type: 'text' },
  { value: 'score', label: 'Score do Lead', type: 'number' },
  { value: 'budget', label: 'Orçamento', type: 'number' },
  { value: 'timeline', label: 'Prazo', type: 'text' }
];

export const QualificationManager: React.FC<QualificationManagerProps> = ({
  pipelineId,
  qualificationRules = { mql: [], sql: [] },
  onQualificationRulesChange,
  isEditMode = false,
  availableFields
}) => {
  // ✅ NOVO: Usar campos dinâmicos ou fallback
  const fieldsToUse = availableFields && availableFields.length > 0 ? availableFields : DEFAULT_FIELDS;
  const [newMqlRule, setNewMqlRule] = useState<Partial<QualificationRule>>({
    field: fieldsToUse[1]?.value || 'email', // Usar segundo campo (email) ou fallback
    operator: 'not_empty',
    value: '',
    description: ''
  });

  const [newSqlRule, setNewSqlRule] = useState<Partial<QualificationRule>>({
    field: fieldsToUse.find(f => f.type === 'number')?.value || fieldsToUse[0]?.value || 'budget',
    operator: 'greater_than',
    value: '',
    description: ''
  });

  // ✅ CORREÇÃO: Adicionar nova regra MQL
  const handleAddMqlRule = useCallback(() => {
    if (!newMqlRule.field || !newMqlRule.operator) return;

    const rule: QualificationRule = {
      id: `mql_${Date.now()}`,
      field: newMqlRule.field,
      operator: newMqlRule.operator,
      value: newMqlRule.value || '',
      description: newMqlRule.description || ''
    };

    const updatedRules = {
      ...qualificationRules,
      mql: [...qualificationRules.mql, rule]
    };
    onQualificationRulesChange(updatedRules);

    // Limpar formulário
    setNewMqlRule({
      field: fieldsToUse[1]?.value || 'email',
      operator: 'not_empty',
      value: '',
      description: ''
    });
  }, [newMqlRule, qualificationRules, onQualificationRulesChange, fieldsToUse]);

  // ✅ CORREÇÃO: Adicionar nova regra SQL
  const handleAddSqlRule = useCallback(() => {
    if (!newSqlRule.field || !newSqlRule.operator) return;

    const rule: QualificationRule = {
      id: `sql_${Date.now()}`,
      field: newSqlRule.field,
      operator: newSqlRule.operator,
      value: newSqlRule.value || '',
      description: newSqlRule.description || ''
    };

    const updatedRules = {
      ...qualificationRules,
      sql: [...qualificationRules.sql, rule]
    };
    onQualificationRulesChange(updatedRules);

    // Limpar formulário
    setNewSqlRule({
      field: fieldsToUse.find(f => f.type === 'number')?.value || fieldsToUse[0]?.value || 'budget',
      operator: 'greater_than',
      value: '',
      description: ''
    });
  }, [newSqlRule, qualificationRules, onQualificationRulesChange, fieldsToUse]);

  // ✅ CORREÇÃO: Remover regra
  const handleRemoveRule = useCallback((type: 'mql' | 'sql', ruleId: string) => {
    const updatedRules = {
      ...qualificationRules,
      [type]: qualificationRules[type].filter(rule => rule.id !== ruleId)
    };
    onQualificationRulesChange(updatedRules);
  }, [qualificationRules, onQualificationRulesChange]);

  // ✅ CORREÇÃO: Atualizar regra existente
  const handleUpdateRule = useCallback((type: 'mql' | 'sql', ruleId: string, field: keyof QualificationRule, value: string) => {
    const updatedRules = {
      ...qualificationRules,
      [type]: qualificationRules[type].map(rule => 
        rule.id === ruleId ? { ...rule, [field]: value } : rule
      )
    };
    onQualificationRulesChange(updatedRules);
  }, [qualificationRules, onQualificationRulesChange]);

  const renderRuleForm = (
    type: 'mql' | 'sql',
    newRule: Partial<QualificationRule>,
    setNewRule: React.Dispatch<React.SetStateAction<Partial<QualificationRule>>>,
    handleAdd: () => void,
    title: string,
    icon: React.ReactNode,
    description: string
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <p className="text-sm text-gray-500">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Regras existentes */}
          {qualificationRules[type].length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Regras Configuradas</h4>
              {qualificationRules[type].map((rule) => (
                <div key={rule.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded">
                  <span className="text-sm font-medium">{rule.field}</span>
                  <span className="text-xs text-gray-500">
                    {QUALIFICATION_OPERATORS.find(op => op.value === rule.operator)?.label}
                  </span>
                  {rule.value && <span className="text-sm text-blue-600">"{rule.value}"</span>}
                  {rule.description && (
                    <span className="text-xs text-gray-500 italic">({rule.description})</span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRule(type, rule.id)}
                    className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Formulário para nova regra */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campo</label>
              <select
                value={newRule.field}
                onChange={(e) => setNewRule(prev => ({ ...prev, field: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {fieldsToUse.map(field => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operador</label>
              <select
                value={newRule.operator}
                onChange={(e) => setNewRule(prev => ({ ...prev, operator: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {QUALIFICATION_OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
              <Input
                placeholder="Valor para comparação"
                value={newRule.value || ''}
                onChange={(e) => setNewRule(prev => ({ ...prev, value: e.target.value }))}
                className="text-sm"
                disabled={newRule.operator === 'not_empty'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <Input
                placeholder="Descrição da regra"
                value={newRule.description || ''}
                onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                className="text-sm"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!newRule.field || !newRule.operator}
              className="flex items-center gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Adicionar Regra
            </Button>
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
          <h3 className="text-lg font-medium text-gray-900">Regras de Qualificação</h3>
        </div>
        <div className="text-sm text-gray-500">
          {qualificationRules.mql.length + qualificationRules.sql.length} regras configuradas
        </div>
      </div>

      {/* MQL Rules */}
      {renderRuleForm(
        'mql',
        newMqlRule,
        setNewMqlRule,
        handleAddMqlRule,
        'Marketing Qualified Lead (MQL)',
        <Target className="h-4 w-4 text-orange-600" />,
        'Leads que demonstraram interesse através de ações de marketing'
      )}

      {/* SQL Rules */}
      {renderRuleForm(
        'sql',
        newSqlRule,
        setNewSqlRule,
        handleAddSqlRule,
        'Sales Qualified Lead (SQL)',
        <Users className="h-4 w-4 text-green-600" />,
        'Leads qualificados pela equipe de vendas e prontos para abordagem comercial'
      )}

      {/* Informações sobre o uso */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-amber-900 mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Como funciona a qualificação
        </h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• <strong>MQL:</strong> Leads são automaticamente marcados como MQL quando atendem às regras configuradas</li>
          <li>• <strong>SQL:</strong> Leads MQL podem ser promovidos para SQL quando atendem aos critérios de vendas</li>
          <li>• <strong>Múltiplas regras:</strong> Todas as regras do mesmo tipo devem ser atendidas (operador AND)</li>
          <li>• <strong>Automação:</strong> A classificação é automática baseada nos dados do lead</li>
        </ul>
      </div>
    </div>
  );
};

export default QualificationManager;