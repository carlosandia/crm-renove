import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { AnimatedCard } from '../../ui/animated-card';
import { BlurFade } from '../../ui/blur-fade';
import { 
  TestTube,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  User,
  Clock,
  Target
} from 'lucide-react';
import { useTestDistribution, useDistributionRule } from '../../../hooks/useDistributionApi';
import { toast } from 'sonner';

// ================================================================================
// INTERFACES E TIPOS
// ================================================================================
interface DistributionTesterProps {
  pipelineId: string;
}

interface TestLead {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
}

interface TestResult {
  success: boolean;
  assigned_to?: string;
  member_name?: string;
  message: string;
  test_timestamp: string;
}

// ================================================================================
// COMPONENTE PRINCIPAL
// ================================================================================
export function DistributionTester({ pipelineId }: DistributionTesterProps) {
  const [testLead, setTestLead] = useState<TestLead>({
    name: 'Lead de Teste',
    email: 'teste@exemplo.com',
    phone: '(11) 99999-9999',
    company: 'Empresa Teste',
    source: 'Teste Manual'
  });
  
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningMultiple, setIsRunningMultiple] = useState(false);
  
  // Hooks para dados da API
  const { data: rule, isLoading: isLoadingRule } = useDistributionRule(pipelineId);
  const testMutation = useTestDistribution(pipelineId);

  // Verificar se pode testar
  const canTest = rule?.mode === 'rodizio' && rule?.is_active;

  // Handler para teste único
  const handleSingleTest = async () => {
    if (!canTest) {
      toast.error('Configuração inválida', {
        description: 'Distribuição deve estar em modo rodízio e ativa para testar'
      });
      return;
    }

    try {
      const result = await testMutation.mutateAsync();
      
      const testResult: TestResult = {
        success: result.success,
        assigned_to: result.assigned_to,
        member_name: result.member_name,
        message: result.message,
        test_timestamp: new Date().toISOString()
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Manter apenas os 10 mais recentes
      
    } catch (error) {
      console.error('Erro no teste:', error);
    }
  };

  // Handler para múltiplos testes
  const handleMultipleTests = async (count: number) => {
    if (!canTest) {
      toast.error('Configuração inválida', {
        description: 'Distribuição deve estar em modo rodízio e ativa para testar'
      });
      return;
    }

    setIsRunningMultiple(true);
    const results: TestResult[] = [];

    try {
      for (let i = 0; i < count; i++) {
        try {
          const result = await testMutation.mutateAsync();
          
          results.push({
            success: result.success,
            assigned_to: result.assigned_to,
            member_name: result.member_name,
            message: `Teste ${i + 1}/${count}: ${result.message}`,
            test_timestamp: new Date().toISOString()
          });
          
          // Pequeno delay entre testes
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          results.push({
            success: false,
            message: `Teste ${i + 1}/${count}: Erro na execução`,
            test_timestamp: new Date().toISOString()
          });
        }
      }
      
      setTestResults(prev => [...results, ...prev.slice(0, 10 - results.length)]);
      
      toast.success(`${count} testes concluídos`, {
        description: `${results.filter(r => r.success).length} sucessos, ${results.filter(r => !r.success).length} falhas`
      });
      
    } finally {
      setIsRunningMultiple(false);
    }
  };

  // Limpar resultados
  const clearResults = () => {
    setTestResults([]);
    toast.info('Resultados limpos');
  };

  // Formatar timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isLoadingRule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <h3 className="text-lg font-semibold">Carregando configuração...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TestTube className="h-5 w-5 text-green-500" />
          Teste de Distribuição
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Simule a distribuição de leads para validar as configurações
        </p>
      </div>

      {/* Status da configuração */}
      <BlurFade delay={0.1} inView>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {canTest ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Status: {canTest ? 'Pronto para testar' : 'Configuração inválida'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rule ? (
                    `Modo: ${rule.mode} • Status: ${rule.is_active ? 'Ativo' : 'Inativo'}`
                  ) : (
                    'Nenhuma regra configurada'
                  )}
                </p>
              </div>
              
              {canTest && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Distribuição funcionando</p>
                  <p className="text-xs text-green-600 font-medium">✓ Configurado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Configuração do lead de teste */}
      <BlurFade delay={0.2} inView>
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Lead de Teste
            </CardTitle>
            <CardDescription>
              Configure os dados do lead para simulação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="test-name">Nome</Label>
                <Input
                  id="test-name"
                  value={testLead.name}
                  onChange={(e) => setTestLead(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do lead"
                />
              </div>
              <div>
                <Label htmlFor="test-email">Email</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testLead.email}
                  onChange={(e) => setTestLead(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="test-phone">Telefone</Label>
                <Input
                  id="test-phone"
                  value={testLead.phone}
                  onChange={(e) => setTestLead(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="test-source">Origem</Label>
                <Select
                  value={testLead.source}
                  onValueChange={(value) => setTestLead(prev => ({ ...prev, source: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Teste Manual">Teste Manual</SelectItem>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Formulário">Formulário</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                    <SelectItem value="Importação">Importação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
      </BlurFade>

      {/* Ações de teste */}
      <BlurFade delay={0.3} inView>
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Executar Testes
            </CardTitle>
            <CardDescription>
              Escolha o tipo de teste a ser executado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                onClick={handleSingleTest}
                disabled={!canTest || testMutation.isPending || isRunningMultiple}
                className="h-16 flex-col gap-1"
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                <span className="text-xs">Teste Único</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleMultipleTests(3)}
                disabled={!canTest || testMutation.isPending || isRunningMultiple}
                className="h-16 flex-col gap-1"
              >
                {isRunningMultiple ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Target className="h-5 w-5" />
                )}
                <span className="text-xs">3 Testes</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleMultipleTests(5)}
                disabled={!canTest || testMutation.isPending || isRunningMultiple}
                className="h-16 flex-col gap-1"
              >
                {isRunningMultiple ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Target className="h-5 w-5" />
                )}
                <span className="text-xs">5 Testes</span>
              </Button>
              
              <Button
                variant="secondary"
                onClick={clearResults}
                disabled={testResults.length === 0 || testMutation.isPending || isRunningMultiple}
                className="h-16 flex-col gap-1"
              >
                <RefreshCw className="h-5 w-5" />
                <span className="text-xs">Limpar</span>
              </Button>
            </div>
            
            {!canTest && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="text-sm text-amber-800">
                    Para testar, configure a distribuição em modo "Rodízio" e ative-a.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </AnimatedCard>
      </BlurFade>

      {/* Resultados dos testes */}
      {testResults.length > 0 && (
        <BlurFade delay={0.4} inView>
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Resultados dos Testes
              </CardTitle>
              <CardDescription>
                Últimos {testResults.length} testes executados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {result.member_name || 'Teste'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.message}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(result.test_timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Sucessos: {testResults.filter(r => r.success).length} • 
                  Falhas: {testResults.filter(r => !r.success).length}
                </p>
              </div>
            </CardContent>
          </AnimatedCard>
        </BlurFade>
      )}
    </div>
  );
}

export default DistributionTester;