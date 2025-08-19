import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  Plus, 
  Trash2, 
  Target, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Users,
  TrendingUp,
  Award,
  Info,
  Thermometer
} from 'lucide-react';

// Shared components
import { SectionHeader } from '../shared/SectionHeader';

// Constants
import { PIPELINE_UI_CONSTANTS } from '../../../styles/pipeline-constants';
import { TemperatureConfigRender } from '../temperature';
import { AnimatedCard } from '../../ui/animated-card';
import { BlurFade } from '../../ui/blur-fade';
// ✅ AIDEV-NOTE: Usando tipo derivado do schema Zod para garantir consistência
import { CustomField } from '../../../types/Pipeline';

// AIDEV-NOTE: Tipos para regras de qualificação
interface QualificationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'empty' | 'greater_than' | 'less_than';
  value: string;
}

interface QualificationRule {
  id?: string;
  name: string;
  description?: string;
  conditions: QualificationCondition[];
  is_active: boolean;
}

interface QualificationRules {
  mql: QualificationRule[];
  sql: QualificationRule[];
}

interface QualificationRulesManagerProps {
  initialRules?: QualificationRules;
  customFields: CustomField[];
  onRulesChange: (rules: QualificationRules) => void;
  isEditMode?: boolean;
  // ✅ NOVA: Props para configuração de temperatura
  temperatureManager?: any;
}

// AIDEV-NOTE: Operadores disponíveis com descrições amigáveis
const OPERATORS = [
  { value: 'equals', label: 'É igual a', description: 'Valor exato' },
  { value: 'not_equals', label: 'É diferente de', description: 'Qualquer valor exceto o especificado' },
  { value: 'contains', label: 'Contém', description: 'Contém o texto especificado' },
  { value: 'not_empty', label: 'Não está vazio', description: 'Campo foi preenchido' },
  { value: 'empty', label: 'Está vazio', description: 'Campo não foi preenchido' },
  { value: 'greater_than', label: 'Maior que', description: 'Para campos numéricos' },
  { value: 'less_than', label: 'Menor que', description: 'Para campos numéricos' }
];

const QualificationRulesManager: React.FC<QualificationRulesManagerProps> = ({
  initialRules = { mql: [], sql: [] },
  customFields = [],
  onRulesChange,
  isEditMode = false,
  temperatureManager
}) => {
  const [rules, setRules] = useState<QualificationRules>(initialRules);
  const [activeTab, setActiveTab] = useState<'temperature' | 'mql' | 'sql'>('temperature');

  // AIDEV-NOTE: Notificar mudanças para o componente pai
  useEffect(() => {
    onRulesChange(rules);
  }, [rules, onRulesChange]);

  // AIDEV-NOTE: Adicionar nova regra
  const addRule = useCallback((type: 'mql' | 'sql') => {
    const newRule: QualificationRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: type === 'mql' ? 'Nova Regra MQL' : 'Nova Regra SQL',
      description: '',
      conditions: [{
        field: customFields[0]?.field_name || 'score_qualificacao',
        operator: 'greater_than',
        value: type === 'mql' ? '50' : '80'
      }],
      is_active: true
    };

    setRules(prev => ({
      ...prev,
      [type]: [...prev[type], newRule]
    }));
  }, [customFields]);

  // AIDEV-NOTE: Remover regra
  const removeRule = useCallback((type: 'mql' | 'sql', ruleId: string) => {
    setRules(prev => ({
      ...prev,
      [type]: prev[type].filter(rule => rule.id !== ruleId)
    }));
  }, []);

  // AIDEV-NOTE: Atualizar regra
  const updateRule = useCallback((type: 'mql' | 'sql', ruleId: string, updates: Partial<QualificationRule>) => {
    setRules(prev => ({
      ...prev,
      [type]: prev[type].map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    }));
  }, []);

  // AIDEV-NOTE: Adicionar condição a uma regra
  const addCondition = useCallback((type: 'mql' | 'sql', ruleId: string) => {
    const newCondition: QualificationCondition = {
      field: customFields[0]?.field_name || 'score_qualificacao',
      operator: 'equals',
      value: ''
    };

    setRules(prev => ({
      ...prev,
      [type]: prev[type].map(rule => 
        rule.id === ruleId 
          ? { ...rule, conditions: [...rule.conditions, newCondition] }
          : rule
      )
    }));
  }, [customFields]);

  // AIDEV-NOTE: Remover condição de uma regra
  const removeCondition = useCallback((type: 'mql' | 'sql', ruleId: string, conditionIndex: number) => {
    setRules(prev => ({
      ...prev,
      [type]: prev[type].map(rule => 
        rule.id === ruleId 
          ? { 
              ...rule, 
              conditions: (rule.conditions || []).filter((_, index) => index !== conditionIndex)
            }
          : rule
      )
    }));
  }, []);

  // AIDEV-NOTE: Atualizar condição
  const updateCondition = useCallback((
    type: 'mql' | 'sql', 
    ruleId: string, 
    conditionIndex: number, 
    updates: Partial<QualificationCondition>
  ) => {
    setRules(prev => ({
      ...prev,
      [type]: prev[type].map(rule => 
        rule.id === ruleId 
          ? {
              ...rule,
              conditions: (rule.conditions || []).map((condition, index) => 
                index === conditionIndex ? { ...condition, ...updates } : condition
              )
            }
          : rule
      )
    }));
  }, []);

  // AIDEV-NOTE: Renderizar campo de condição
  const renderConditionField = (
    type: 'mql' | 'sql',
    ruleId: string,
    condition: QualificationCondition,
    conditionIndex: number
  ) => (
    <div key={conditionIndex} className="space-y-3 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Condição {conditionIndex + 1}</Label>
        {(rules[type].find(r => r.id === ruleId)?.conditions || []).length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeCondition(type, ruleId, conditionIndex)}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Campo */}
        <div>
          <Label className="text-xs text-gray-600">Campo</Label>
          <Select
            value={condition.field}
            onValueChange={(value) => updateCondition(type, ruleId, conditionIndex, { field: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {customFields.map(field => (
                <SelectItem key={field.field_name} value={field.field_name}>
                  {field.field_label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Operador */}
        <div>
          <Label className="text-xs text-gray-600">Operador</Label>
          <Select
            value={condition.operator}
            onValueChange={(value: any) => updateCondition(type, ruleId, conditionIndex, { operator: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map(op => (
                <SelectItem key={op.value} value={op.value}>
                  <div className="flex flex-col">
                    <span>{op.label}</span>
                    <span className="text-xs text-gray-500">{op.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Valor */}
        {!['not_empty', 'empty'].includes(condition.operator) && (
          <div>
            <Label className="text-xs text-gray-600">Valor</Label>
            <Input
              value={condition.value}
              onChange={(e) => updateCondition(type, ruleId, conditionIndex, { value: e.target.value })}
              placeholder="Digite o valor..."
            />
          </div>
        )}
      </div>
    </div>
  );

  // AIDEV-NOTE: Renderizar regra completa
  const renderRule = (rule: QualificationRule, type: 'mql' | 'sql') => (
    <Card key={rule.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {type === 'mql' ? (
                <Target className="h-5 w-5 text-orange-500" />
              ) : (
                <Zap className="h-5 w-5 text-blue-500" />
              )}
              <Input
                value={rule.name}
                onChange={(e) => updateRule(type, rule.id!, { name: e.target.value })}
                className="font-medium border-none p-0 h-auto text-lg bg-transparent focus:bg-white"
                placeholder="Nome da regra"
              />
            </div>
            <Badge variant={rule.is_active ? 'default' : 'secondary'}>
              {rule.is_active ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateRule(type, rule.id!, { is_active: !rule.is_active })}
              className={rule.is_active ? 'text-green-600' : 'text-gray-400'}
            >
              {rule.is_active ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeRule(type, rule.id!)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Input
          value={rule.description || ''}
          onChange={(e) => updateRule(type, rule.id!, { description: e.target.value })}
          placeholder="Descrição da regra (opcional)"
          className="text-sm text-gray-600 border-none p-0 bg-transparent focus:bg-white"
        />
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Condições (todas devem ser atendidas)
          </Label>
          <div className="space-y-3">
            {(rule.conditions || []).map((condition, index) => 
              renderConditionField(type, rule.id!, condition, index)
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => addCondition(type, rule.id!)}
            className="mt-3 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Condição
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const mqlCount = rules.mql.filter(r => r.is_active).length;
  const sqlCount = rules.sql.filter(r => r.is_active).length;

  return (
    <div className={PIPELINE_UI_CONSTANTS.spacing.section}>
      <SectionHeader
        icon={TrendingUp}
        title="Qualificação Automática de Leads"
      />

      {/* Tabs para Temperatura, MQL e SQL */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="temperature" className="flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            Temperatura
          </TabsTrigger>
          <TabsTrigger value="mql" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Regras MQL ({rules.mql.length})
          </TabsTrigger>
          <TabsTrigger value="sql" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Regras SQL ({rules.sql.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="temperature">
          <BlurFade delay={0.1} inView>
            <AnimatedCard>
              <CardContent className="pt-6">
                {temperatureManager ? (
                  <TemperatureConfigRender temperatureManager={temperatureManager} />
                ) : (
                  <div className="p-8 text-center">
                    <Thermometer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Configuração de Temperatura</h3>
                    <p className="text-gray-600">
                      A configuração de temperatura não está disponível no momento.
                    </p>
                  </div>
                )}
              </CardContent>
            </AnimatedCard>
          </BlurFade>
        </TabsContent>

          <TabsContent value="mql" className={PIPELINE_UI_CONSTANTS.spacing.form}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={PIPELINE_UI_CONSTANTS.typography.cardTitle}>Marketing Qualified Lead (MQL)</h3>
                <p className={PIPELINE_UI_CONSTANTS.typography.description}>
                  Leads que demonstraram interesse através de marketing (downloads, engajamento, etc.)
                </p>
              </div>
              <Button
                onClick={() => addRule('mql')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Regra MQL
              </Button>
            </div>
            
            {(rules.mql || []).length === 0 ? (
              <Card className="p-8 text-center">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma regra MQL configurada</h3>
                <p className="text-gray-600 mb-4">
                  Crie regras para qualificar automaticamente leads como MQL
                </p>
                <Button onClick={() => addRule('mql')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira regra MQL
                </Button>
              </Card>
            ) : (
              <div>
                {(rules.mql || []).map(rule => renderRule(rule, 'mql'))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sql" className={PIPELINE_UI_CONSTANTS.spacing.form}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={PIPELINE_UI_CONSTANTS.typography.cardTitle}>Sales Qualified Lead (SQL)</h3>
                <p className={PIPELINE_UI_CONSTANTS.typography.description}>
                  Leads prontos para contato direto da equipe de vendas (reunião agendada, interesse confirmado, etc.)
                </p>
              </div>
              <Button
                onClick={() => addRule('sql')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Regra SQL
              </Button>
            </div>
            
            {(rules.sql || []).length === 0 ? (
              <Card className="p-8 text-center">
                <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma regra SQL configurada</h3>
                <p className="text-gray-600 mb-4">
                  Crie regras para qualificar automaticamente leads como SQL
                </p>
                <Button onClick={() => addRule('sql')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira regra SQL
                </Button>
              </Card>
            ) : (
              <div>
                {(rules.sql || []).map(rule => renderRule(rule, 'sql'))}
              </div>
            )}
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default QualificationRulesManager;