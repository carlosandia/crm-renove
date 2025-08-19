import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { BlurFade } from '../ui/blur-fade';
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

// ✅ NOVO: Interface para campos disponíveis (sistema + customizados + draft)
export interface FieldOption {
  value: string;
  label: string;
  type?: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date' | 'url' | 'currency';
  isDraft?: boolean; // ✅ NOVO: Flag para identificar campos draft (não salvos no banco)
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
    <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-slate-50 rounded-lg">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="space-y-4">
        {/* Regras existentes */}
        {qualificationRules[type].length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700">Regras Configuradas</h4>
            {qualificationRules[type].map((rule) => (
              <div key={rule.id} className="flex items-center gap-3 p-4 bg-white/80 border border-slate-200 rounded-lg shadow-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-900">{rule.field}</span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {QUALIFICATION_OPERATORS.find(op => op.value === rule.operator)?.label}
                    </span>
                    {rule.value && <span className="text-sm text-blue-600 font-medium">"{rule.value}"</span>}
                  </div>
                  {rule.description && (
                    <p className="text-xs text-slate-500">{rule.description}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRule(type, rule.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Formulário para nova regra */}
        <div className="bg-slate-50/80 rounded-lg p-4 border border-slate-200">
          <h5 className="text-sm font-medium text-slate-700 mb-4">Adicionar Nova Regra</h5>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Campo</label>
                <select
                  value={newRule.field}
                  onChange={(e) => setNewRule(prev => ({ ...prev, field: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {fieldsToUse.map(field => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Operador</label>
                <select
                  value={newRule.operator}
                  onChange={(e) => setNewRule(prev => ({ ...prev, operator: e.target.value as any }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {QUALIFICATION_OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Valor</label>
                <Input
                  placeholder="Valor para comparação"
                  value={newRule.value || ''}
                  onChange={(e) => setNewRule(prev => ({ ...prev, value: e.target.value }))}
                  className="border-slate-300 focus:ring-indigo-500"
                  disabled={newRule.operator === 'not_empty'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
                <Input
                  placeholder="Descrição da regra"
                  value={newRule.description || ''}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  className="border-slate-300 focus:ring-indigo-500"
                />
              </div>
            </div>
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
              <h3 className="text-lg font-semibold text-slate-900">Regras de Qualificação</h3>
              <p className="text-sm text-slate-500">
                {qualificationRules.mql.length + qualificationRules.sql.length} regras configuradas
              </p>
            </div>
          </div>
        </div>
      </BlurFade>

      {/* MQL Rules */}
      <BlurFade delay={0.2} direction="up">
        {renderRuleForm(
          'mql',
          newMqlRule,
          setNewMqlRule,
          handleAddMqlRule,
          'Marketing Qualified Lead (MQL)',
          <Target className="h-4 w-4 text-orange-600" />,
          'Leads que demonstraram interesse através de ações de marketing'
        )}
      </BlurFade>

      {/* SQL Rules */}
      <BlurFade delay={0.3} direction="up">
        {renderRuleForm(
          'sql',
          newSqlRule,
          setNewSqlRule,
          handleAddSqlRule,
          'Sales Qualified Lead (SQL)',
          <Users className="h-4 w-4 text-green-600" />,
          'Leads qualificados pela equipe de vendas e prontos para abordagem comercial'
        )}
      </BlurFade>

      {/* Informações sobre o uso */}
      <BlurFade delay={0.4} direction="up">
        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900">Como funciona a qualificação</h4>
              <p className="text-sm text-slate-500">Entenda o processo automatizado de qualificação de leads</p>
            </div>
          </div>
          <ul className="text-sm text-slate-700 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span><strong>MQL:</strong> Leads são automaticamente marcados como MQL quando atendem às regras configuradas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span><strong>SQL:</strong> Leads MQL podem ser promovidos para SQL quando atendem aos critérios de vendas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span><strong>Múltiplas regras:</strong> Todas as regras do mesmo tipo devem ser atendidas (operador AND)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span><strong>Automação:</strong> A classificação é automática baseada nos dados do lead</span>
            </li>
          </ul>
        </div>
      </BlurFade>
    </div>
  );
};

export default QualificationManager;