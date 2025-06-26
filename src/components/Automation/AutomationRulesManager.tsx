/**
 * Automation Rules Manager - Interface para gerenciar regras de negócio
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BlurFade } from '../ui/blur-fade';
import { useToast } from '../../hooks/useToast';

interface BusinessRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'event' | 'schedule' | 'condition';
    event?: string;
    schedule?: string;
    entityType?: string;
  };
  conditions: {
    operator: 'AND' | 'OR';
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  actions: Array<{
    id: string;
    type: 'email' | 'task' | 'notification' | 'webhook' | 'update_field' | 'change_stage';
    parameters: Record<string, any>;
  }>;
  priority: number;
  isActive: boolean;
  metadata: {
    executionCount: number;
    successCount: number;
    failureCount: number;
    averageExecutionTime: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface AutomationMetrics {
  rules: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  };
  events: {
    queueSize: number;
    isProcessing: boolean;
    eventDefinitions: number;
    totalSubscriptions: number;
  };
  activeExecutions: {
    count: number;
  };
}

const AutomationRulesManager: React.FC = () => {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [metrics, setMetrics] = useState<AutomationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<BusinessRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRules();
    loadMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRules = async () => {
    try {
      const response = await fetch('/api/automation/rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load rules');
      }

      const data = await response.json();
      setRules(data.data || []);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar regras de automação',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/automation/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load metrics');
      }

      const data = await response.json();
      setMetrics(data.data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/automation/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update rule');
      }

      await loadRules();
      toast({
        title: 'Sucesso',
        description: `Regra ${!isActive ? 'ativada' : 'desativada'} com sucesso`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating rule:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar regra',
        variant: 'destructive'
      });
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) {
      return;
    }

    try {
      const response = await fetch(`/api/automation/rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      await loadRules();
      toast({
        title: 'Sucesso',
        description: 'Regra excluída com sucesso',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir regra',
        variant: 'destructive'
      });
    }
  };

  const testRule = async (rule: BusinessRule) => {
    try {
      const testData = {
        id: 'test-lead-123',
        name: 'Lead de Teste',
        email: 'teste@exemplo.com',
        temperature: 'hot',
        source: 'website',
        stage_id: 'stage-1'
      };

      const response = await fetch(`/api/automation/rules/${rule.id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testData })
      });

      if (!response.ok) {
        throw new Error('Failed to test rule');
      }

      const result = await response.json();
      
      toast({
        title: 'Teste de Regra',
        description: result.data.conditionsMatch 
          ? 'Condições atendidas - Regra seria executada' 
          : 'Condições não atendidas - Regra não seria executada',
        variant: result.data.conditionsMatch ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Error testing rule:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao testar regra',
        variant: 'destructive'
      });
    }
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterActive === null || rule.isActive === filterActive;
    return matchesSearch && matchesFilter;
  });

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      'lead.created': 'Lead Criado',
      'lead.updated': 'Lead Atualizado',
      'lead.stage_changed': 'Lead Mudou de Etapa',
      'deal.created': 'Deal Criado',
      'deal.stage_changed': 'Deal Mudou de Etapa',
      'deal.won': 'Deal Ganho',
      'deal.lost': 'Deal Perdido',
      'task.created': 'Tarefa Criada',
      'task.completed': 'Tarefa Concluída'
    };
    return labels[eventType] || eventType;
  };

  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'email': 'Enviar Email',
      'task': 'Criar Tarefa',
      'notification': 'Notificação',
      'webhook': 'Webhook',
      'update_field': 'Atualizar Campo',
      'change_stage': 'Mudar Etapa'
    };
    return labels[actionType] || actionType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <BlurFade delay={0.1} inView>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Automação</h1>
            <p className="text-muted-foreground">
              Gerencie regras de negócio e workflows automatizados
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            + Nova Regra
          </Button>
        </div>
      </BlurFade>

      {/* Metrics Cards */}
      {metrics && (
        <BlurFade delay={0.2} inView>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Regras</CardTitle>
                <Badge variant="secondary">{rules.length}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rules.filter(r => r.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  regras ativas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Execuções</CardTitle>
                <Badge variant="secondary">{metrics.rules.totalExecutions}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.rules.successfulExecutions}
                </div>
                <p className="text-xs text-muted-foreground">
                  execuções bem-sucedidas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
                <Badge variant="secondary">
                  {metrics.rules.averageExecutionTime.toFixed(0)}ms
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.rules.totalExecutions > 0 
                    ? ((metrics.rules.successfulExecutions / metrics.rules.totalExecutions) * 100).toFixed(1)
                    : '100'}%
                </div>
                <p className="text-xs text-muted-foreground">
                  taxa de sucesso
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fila de Eventos</CardTitle>
                <Badge variant={metrics.events.queueSize > 10 ? "destructive" : "secondary"}>
                  {metrics.events.queueSize}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.activeExecutions.count}
                </div>
                <p className="text-xs text-muted-foreground">
                  execuções ativas
                </p>
              </CardContent>
            </Card>
          </div>
        </BlurFade>
      )}

      {/* Filters */}
      <BlurFade delay={0.3} inView>
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Buscar regras</Label>
                <Input
                  id="search"
                  placeholder="Nome ou descrição da regra..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterActive === null ? "default" : "outline"}
                  onClick={() => setFilterActive(null)}
                >
                  Todas
                </Button>
                <Button
                  variant={filterActive === true ? "default" : "outline"}
                  onClick={() => setFilterActive(true)}
                >
                  Ativas
                </Button>
                <Button
                  variant={filterActive === false ? "default" : "outline"}
                  onClick={() => setFilterActive(false)}
                >
                  Inativas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Rules List */}
      <BlurFade delay={0.4} inView>
        <div className="space-y-4">
          {filteredRules.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm || filterActive !== null 
                    ? 'Nenhuma regra encontrada com os filtros aplicados'
                    : 'Nenhuma regra de automação criada ainda'
                  }
                </p>
                {!searchTerm && filterActive === null && (
                  <Button className="mt-4" onClick={() => setIsCreating(true)}>
                    Criar primeira regra
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredRules.map((rule, index) => (
              <BlurFade key={rule.id} delay={0.5 + index * 0.1} inView>
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? 'Ativa' : 'Inativa'}
                          </Badge>
                          <Badge variant="outline">
                            Prioridade {rule.priority}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">
                          {rule.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testRule(rule)}
                        >
                          Testar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRuleStatus(rule.id, rule.isActive)}
                        >
                          {rule.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRule(rule)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteRule(rule.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Trigger</Label>
                        <p className="text-sm text-muted-foreground">
                          {rule.trigger.event 
                            ? getEventTypeLabel(rule.trigger.event)
                            : `${rule.trigger.type} trigger`
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Ações</Label>
                        <p className="text-sm text-muted-foreground">
                          {rule.actions.map(action => getActionTypeLabel(action.type)).join(', ')}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Performance</Label>
                        <p className="text-sm text-muted-foreground">
                          {rule.metadata.executionCount} execuções
                          {rule.metadata.executionCount > 0 && (
                            <> • {rule.metadata.averageExecutionTime.toFixed(0)}ms médio</>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </BlurFade>
            ))
          )}
        </div>
      </BlurFade>
    </div>
  );
};

export default AutomationRulesManager; 