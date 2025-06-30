// FASE 3.4: ScoringPanel - Sistema MQL e pontuação modular EXPANDIDO
// Extrai lógica de scoring do ModernFormBuilder + Scoring por tipo de formulário + Comportamento + Temperature

import React, { memo, useState, useEffect } from 'react';
import { Star, Plus, Trash2, Target, Award, Thermometer, Activity, Zap, TrendingUp, Settings, Info } from 'lucide-react';
import { FormField, ScoringRule } from '../../../types/Forms';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { Separator } from '../../ui/separator';
import { BlurFade } from '../../ui/blur-fade';

// NOVAS INTERFACES PARA EXPANSÃO
interface FormTypeScoring {
  form_type: string;
  base_score: number;
  behavior_multiplier: number;
  description: string;
}

interface BehaviorScoring {
  behavior_type: 'exit_intent' | 'scroll_trigger' | 'time_delayed' | 'multi_step_completion' | 'immediate_fill';
  score_modifier: number;
  temperature_impact: 'hot' | 'warm' | 'cold' | 'none';
  description: string;
}

interface TemperatureRule {
  id: string;
  score_range: { min: number; max: number };
  temperature: 'hot' | 'warm' | 'cold';
  auto_assign: boolean;
  pipeline_stage?: string;
  priority_level: number;
}

export interface ScoringPanelProps {
  fields: FormField[];
  scoringRules: ScoringRule[];
  onAddRule: () => void;
  onUpdateRule: (ruleId: string, updates: Partial<ScoringRule>) => void;
  onRemoveRule: (ruleId: string) => void;
  // NOVAS PROPS PARA EXPANSÃO
  formType?: string;
  onFormTypeScoringChange?: (config: FormTypeScoring) => void;
  onBehaviorScoringChange?: (config: BehaviorScoring[]) => void;
  onTemperatureRulesChange?: (rules: TemperatureRule[]) => void;
  initialFormTypeScoring?: FormTypeScoring;
  initialBehaviorScoring?: BehaviorScoring[];
  initialTemperatureRules?: TemperatureRule[];
}

const ScoringPanel: React.FC<ScoringPanelProps> = memo(({
  fields,
  scoringRules,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
  // NOVAS PROPS
  formType = 'standard',
  onFormTypeScoringChange,
  onBehaviorScoringChange,
  onTemperatureRulesChange,
  initialFormTypeScoring,
  initialBehaviorScoring,
  initialTemperatureRules
}) => {
  // FUNÇÕES AUXILIARES PARA TIPOS DE FORMULÁRIO
  function getDefaultScoreByType(type: string): number {
    switch (type) {
      case 'exit_intent': return 25;
      case 'scroll_trigger': return 15;
      case 'time_delayed': return 10;
      case 'multi_step': return 20;
      case 'smart_scheduling': return 30;
      case 'cadence_trigger': return 18;
      case 'whatsapp_integration': return 22;
      case 'standard': default: return 5;
    }
  }

  function getBehaviorMultiplierByType(type: string): number {
    switch (type) {
      case 'exit_intent': return 2.0;
      case 'scroll_trigger': return 1.5;
      case 'time_delayed': return 1.2;
      case 'multi_step': return 1.8;
      case 'smart_scheduling': return 2.5;
      case 'cadence_trigger': return 1.4;
      case 'whatsapp_integration': return 1.6;
      case 'standard': default: return 1.0;
    }
  }

  function getDescriptionByType(type: string): string {
    switch (type) {
      case 'exit_intent': return 'Alta intenção de saída, alto valor de conversão';
      case 'scroll_trigger': return 'Engajamento médio, interesse demonstrado';
      case 'time_delayed': return 'Engajamento baixo a médio, visita prolongada';
      case 'multi_step': return 'Alto engajamento, interesse qualificado';
      case 'smart_scheduling': return 'Altíssima intenção, pronto para conversão';
      case 'cadence_trigger': return 'Interesse em follow-up, lead nutrição';
      case 'whatsapp_integration': return 'Preferência por contato direto, lead quente';
      case 'standard': default: return 'Formulário padrão, scoring básico';
    }
  }

  function getDefaultBehaviorScoring(): BehaviorScoring[] {
    return [
      {
        behavior_type: 'exit_intent',
        score_modifier: 25,
        temperature_impact: 'hot',
        description: 'Tentativa de saída da página - alta intenção'
      },
      {
        behavior_type: 'scroll_trigger',
        score_modifier: 15,
        temperature_impact: 'warm',
        description: 'Rolagem até seção específica - interesse demonstrado'
      },
      {
        behavior_type: 'time_delayed',
        score_modifier: 10,
        temperature_impact: 'warm',
        description: 'Tempo significativo na página - consideração'
      },
      {
        behavior_type: 'multi_step_completion',
        score_modifier: 20,
        temperature_impact: 'hot',
        description: 'Completou múltiplas etapas - alto engajamento'
      },
      {
        behavior_type: 'immediate_fill',
        score_modifier: 5,
        temperature_impact: 'cold',
        description: 'Preenchimento imediato - baixo engajamento'
      }
    ];
  }

  function getDefaultTemperatureRules(): TemperatureRule[] {
    return [
      {
        id: 'hot',
        score_range: { min: 70, max: 1000 },
        temperature: 'hot',
        auto_assign: true,
        pipeline_stage: 'qualified',
        priority_level: 1
      },
      {
        id: 'warm',
        score_range: { min: 30, max: 69 },
        temperature: 'warm',
        auto_assign: true,
        pipeline_stage: 'lead',
        priority_level: 2
      },
      {
        id: 'cold',
        score_range: { min: 0, max: 29 },
        temperature: 'cold',
        auto_assign: false,
        priority_level: 3
      }
    ];
  }

  // ESTADOS EXPANDIDOS
  const [activeTab, setActiveTab] = useState<'basic' | 'form_type' | 'behavior' | 'temperature'>('basic');
  
  // CONFIGURAÇÃO DE SCORING POR TIPO DE FORMULÁRIO
  const [formTypeScoring, setFormTypeScoring] = useState<FormTypeScoring>(
    initialFormTypeScoring || {
      form_type: formType,
      base_score: getDefaultScoreByType(formType),
      behavior_multiplier: getBehaviorMultiplierByType(formType),
      description: getDescriptionByType(formType)
    }
  );

  // CONFIGURAÇÃO DE SCORING POR COMPORTAMENTO
  const [behaviorScoring, setBehaviorScoring] = useState<BehaviorScoring[]>(
    initialBehaviorScoring || getDefaultBehaviorScoring()
  );

  // REGRAS DE TEMPERATURA
  const [temperatureRules, setTemperatureRules] = useState<TemperatureRule[]>(
    initialTemperatureRules || getDefaultTemperatureRules()
  );

  // CÁLCULOS EXPANDIDOS
  const totalPossibleScore = fields.reduce((sum, field) => sum + (field.scoring_weight || 0), 0);
  const avgScoreFromRules = scoringRules.reduce((sum, rule) => sum + rule.points, 0) / (scoringRules.length || 1);
  const formTypeBonus = formTypeScoring.base_score;
  const maxBehaviorBonus = Math.max(...behaviorScoring.map(b => b.score_modifier));
  const totalMaxScore = totalPossibleScore + formTypeBonus + maxBehaviorBonus;

  // EFEITOS PARA NOTIFICAR MUDANÇAS
  useEffect(() => {
    onFormTypeScoringChange?.(formTypeScoring);
  }, [formTypeScoring, onFormTypeScoringChange]);

  useEffect(() => {
    onBehaviorScoringChange?.(behaviorScoring);
  }, [behaviorScoring, onBehaviorScoringChange]);

  useEffect(() => {
    onTemperatureRulesChange?.(temperatureRules);
  }, [temperatureRules, onTemperatureRulesChange]);

  // FUNÇÕES AUXILIARES PARA TEMPERATURA
  const getTemperatureColor = (temp: string) => {
    switch (temp) {
      case 'hot': return 'text-red-600 bg-red-50 border-red-200';
      case 'warm': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'cold': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTemperatureIcon = (temp: string) => {
    switch (temp) {
      case 'hot': return '🔥';
      case 'warm': return '🌡️';
      case 'cold': return '❄️';
      default: return '📊';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER EXPANDIDO E ESTATÍSTICAS */}
      <BlurFade delay={0.1}>
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Star size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sistema de Scoring Avançado</h3>
              <p className="text-sm text-muted-foreground">Marketing Qualified Lead com IA comportamental</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Activity className="w-3 h-3 mr-1" />
              Tipo: {formType}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Target size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Score Base</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{totalPossibleScore}</p>
              <p className="text-xs text-blue-600">campos + regras</p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Zap size={16} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Tipo Bonus</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">+{formTypeBonus}</p>
              <p className="text-xs text-purple-600">por tipo de form</p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <Activity size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-900">Comportamento</span>
              </div>
              <p className="text-2xl font-bold text-green-700">+{maxBehaviorBonus}</p>
              <p className="text-xs text-green-600">máx. comportamental</p>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp size={16} className="text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Score Máximo</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">{totalMaxScore}</p>
              <p className="text-xs text-orange-600">pontos totais</p>
            </div>
          </div>
        </Card>
      </BlurFade>

      {/* NAVEGAÇÃO POR TABS */}
      <BlurFade delay={0.2}>
        <Card className="p-6">
          <div className="flex items-center space-x-1 mb-6 bg-muted rounded-lg p-1">
            {[
              { id: 'basic', label: 'Básico', icon: Star },
              { id: 'form_type', label: 'Tipo Form', icon: Settings },
              { id: 'behavior', label: 'Comportamento', icon: Activity },
              { id: 'temperature', label: 'Temperatura', icon: Thermometer }
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${activeTab === tab.id 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  <TabIcon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* CONTEÚDO BÁSICO ORIGINAL */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Pontuação por Campo - ORIGINAL PRESERVADO */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Star size={16} className="mr-2 text-yellow-500" />
                  Pontuação por Campo
                </h4>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {fields.filter(f => f.scoring_weight && f.scoring_weight > 0).map(field => (
                    <div key={field.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{field.field_label}</p>
                        <p className="text-xs text-gray-500">{field.field_name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="bg-yellow-100 px-2 py-1 rounded text-xs font-medium text-yellow-700">
                          +{field.scoring_weight} pts
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {fields.filter(f => f.scoring_weight && f.scoring_weight > 0).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Star size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum campo com pontuação definida</p>
                      <p className="text-xs">Configure pesos nos campos para ativar o scoring</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Regras Condicionais - ORIGINAL PRESERVADO */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Regras Condicionais</h4>
                  <button
                    onClick={onAddRule}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Plus size={14} />
                    <span>Nova Regra</span>
                  </button>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {scoringRules.map(rule => (
                    <div key={rule.id} className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Campo</label>
                        <select
                          value={rule.field_id}
                          onChange={(e) => onUpdateRule(rule.id, { field_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="">Selecione um campo</option>
                          {fields.map(field => (
                            <option key={field.id} value={field.id}>
                              {field.field_label} ({field.field_name})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Condição</label>
                          <select
                            value={rule.condition}
                            onChange={(e) => onUpdateRule(rule.id, { condition: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="equals">É igual a</option>
                            <option value="contains">Contém</option>
                            <option value="greater_than">Maior que</option>
                            <option value="less_than">Menor que</option>
                            <option value="not_empty">Não está vazio</option>
                            <option value="range">Está entre</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                          <input
                            type="text"
                            value={rule.value}
                            onChange={(e) => onUpdateRule(rule.id, { value: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="Valor de comparação"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pontos</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={rule.points}
                            onChange={(e) => onUpdateRule(rule.id, { points: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        
                        <div className="flex items-end">
                          <button
                            onClick={() => onRemoveRule(rule.id)}
                            className="w-full px-3 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors text-sm flex items-center justify-center space-x-2"
                          >
                            <Trash2 size={14} />
                            <span>Remover</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <input
                          type="text"
                          value={rule.description}
                          onChange={(e) => onUpdateRule(rule.id, { description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Descrição da regra (opcional)"
                        />
                      </div>
                    </div>
                  ))}
                  
                  {scoringRules.length === 0 && (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      <Target size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">Nenhuma regra condicional</p>
                      <p className="text-xs">Crie regras para pontuação baseada em valores específicos</p>
                      <button
                        onClick={onAddRule}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Criar primeira regra
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Configurações MQL - ORIGINAL PRESERVADO */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Award size={16} className="mr-2 text-green-500" />
                  Configurações MQL
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pontuação mínima para MQL
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      defaultValue={50}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      placeholder="Ex: 50"
                    />
                    <p className="text-xs text-green-600 mt-1">
                      Leads com esta pontuação ou maior serão marcados como MQL
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      id="auto-mql"
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="auto-mql" className="text-sm text-gray-700">
                      Marcar automaticamente como MQL ao atingir pontuação
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      id="notify-mql"
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="notify-mql" className="text-sm text-gray-700">
                      Notificar equipe quando MQL for gerado
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB SCORING POR TIPO DE FORMULÁRIO */}
          {activeTab === 'form_type' && (
            <div className="space-y-6">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Settings size={16} className="mr-2 text-purple-500" />
                  Scoring por Tipo de Formulário
                </h4>
                <p className="text-sm text-purple-700 mb-4">
                  {formTypeScoring.description}
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pontuação Base
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formTypeScoring.base_score}
                      onChange={(e) => setFormTypeScoring(prev => ({ 
                        ...prev, 
                        base_score: parseInt(e.target.value) || 0 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    />
                    <p className="text-xs text-purple-600 mt-1">
                      Pontos automáticos por usar este tipo de formulário
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Multiplicador Comportamental
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={formTypeScoring.behavior_multiplier}
                      onChange={(e) => setFormTypeScoring(prev => ({ 
                        ...prev, 
                        behavior_multiplier: parseFloat(e.target.value) || 1.0 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    />
                    <p className="text-xs text-purple-600 mt-1">
                      Multiplica pontos de comportamento (ex: 2.0x)
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-white rounded border">
                  <h5 className="font-medium text-sm mb-2">Preview do Cálculo:</h5>
                  <div className="text-xs space-y-1">
                    <p>Base do formulário: <span className="font-medium">+{formTypeScoring.base_score} pontos</span></p>
                    <p>Comportamento máximo: <span className="font-medium">{maxBehaviorBonus} × {formTypeScoring.behavior_multiplier} = {Math.round(maxBehaviorBonus * formTypeScoring.behavior_multiplier)} pontos</span></p>
                    <p className="font-medium text-purple-700">Total possível: {formTypeScoring.base_score + Math.round(maxBehaviorBonus * formTypeScoring.behavior_multiplier) + totalPossibleScore} pontos</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB SCORING COMPORTAMENTAL */}
          {activeTab === 'behavior' && (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Activity size={16} className="mr-2 text-green-500" />
                  Scoring Comportamental
                </h4>
                <p className="text-sm text-green-700 mb-4">
                  Configure pontuações baseadas no comportamento do usuário
                </p>
                
                <div className="space-y-3">
                  {behaviorScoring.map((behavior, index) => (
                    <div key={behavior.behavior_type} className="p-4 bg-white rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="font-medium text-sm capitalize">
                            {behavior.behavior_type.replace('_', ' ')}
                          </h5>
                          <p className="text-xs text-gray-500">{behavior.description}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium border ${getTemperatureColor(behavior.temperature_impact)}`}>
                          {getTemperatureIcon(behavior.temperature_impact)} {behavior.temperature_impact}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Pontos de Modificação
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={behavior.score_modifier}
                            onChange={(e) => {
                              const newBehaviorScoring = [...behaviorScoring];
                              newBehaviorScoring[index].score_modifier = parseInt(e.target.value) || 0;
                              setBehaviorScoring(newBehaviorScoring);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Impacto na Temperatura
                          </label>
                          <select
                            value={behavior.temperature_impact}
                            onChange={(e) => {
                              const newBehaviorScoring = [...behaviorScoring];
                              newBehaviorScoring[index].temperature_impact = e.target.value as any;
                              setBehaviorScoring(newBehaviorScoring);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          >
                            <option value="none">Sem impacto</option>
                            <option value="cold">Frio</option>
                            <option value="warm">Morno</option>
                            <option value="hot">Quente</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB REGRAS DE TEMPERATURA */}
          {activeTab === 'temperature' && (
            <div className="space-y-6">
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Thermometer size={16} className="mr-2 text-orange-500" />
                  Regras de Temperatura
                </h4>
                <p className="text-sm text-orange-700 mb-4">
                  Configure como a pontuação define a temperatura do lead
                </p>
                
                <div className="space-y-3">
                  {temperatureRules.map((rule, index) => (
                    <div key={rule.id} className={`p-4 rounded-lg border-2 ${getTemperatureColor(rule.temperature)}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getTemperatureIcon(rule.temperature)}</span>
                          <h5 className="font-medium capitalize">{rule.temperature}</h5>
                          <Badge variant={rule.auto_assign ? "default" : "secondary"}>
                            {rule.auto_assign ? 'Auto-assign' : 'Manual'}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium">
                          Prioridade #{rule.priority_level}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1">Score Mínimo</label>
                          <input
                            type="number"
                            min="0"
                            value={rule.score_range.min}
                            onChange={(e) => {
                              const newRules = [...temperatureRules];
                              newRules[index].score_range.min = parseInt(e.target.value) || 0;
                              setTemperatureRules(newRules);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium mb-1">Score Máximo</label>
                          <input
                            type="number"
                            min="0"
                            value={rule.score_range.max}
                            onChange={(e) => {
                              const newRules = [...temperatureRules];
                              newRules[index].score_range.max = parseInt(e.target.value) || 1000;
                              setTemperatureRules(newRules);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium mb-1">Estágio Pipeline</label>
                          <input
                            type="text"
                            value={rule.pipeline_stage || ''}
                            onChange={(e) => {
                              const newRules = [...temperatureRules];
                              newRules[index].pipeline_stage = e.target.value;
                              setTemperatureRules(newRules);
                            }}
                            placeholder="Ex: qualified"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                      </div>

                      <div className="mt-2 flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={rule.auto_assign}
                          onChange={(e) => {
                            const newRules = [...temperatureRules];
                            newRules[index].auto_assign = e.target.checked;
                            setTemperatureRules(newRules);
                          }}
                          className="h-3 w-3"
                        />
                        <label className="text-xs">
                          Atribuir automaticamente para pipeline/estágio
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-white rounded border">
                  <h5 className="font-medium text-sm mb-2">Resumo das Regras:</h5>
                  <div className="text-xs space-y-1">
                    {temperatureRules.map(rule => (
                      <p key={rule.id}>
                        {getTemperatureIcon(rule.temperature)} 
                        <span className="font-medium"> {rule.temperature.toUpperCase()}</span>: 
                        {rule.score_range.min}-{rule.score_range.max} pontos
                        {rule.auto_assign && rule.pipeline_stage && (
                          <span className="text-gray-500"> → {rule.pipeline_stage}</span>
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </BlurFade>
    </div>
  );
});

ScoringPanel.displayName = 'ScoringPanel';

export default ScoringPanel; 