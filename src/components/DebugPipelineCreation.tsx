import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface DebugResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const DebugPipelineCreation: React.FC = () => {
  const { user } = useAuth();
  const [isDebugging, setIsDebugging] = useState(false);
  const [results, setResults] = useState<DebugResult[]>([]);

  const addResult = (result: DebugResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const runDebug = async () => {
    setIsDebugging(true);
    clearResults();

    try {
      // 1. Verificar dados do usuário
      addResult({
        step: '1. Verificação do Usuário',
        status: user?.id && user?.tenant_id ? 'success' : 'error',
        message: user?.id && user?.tenant_id ? 'Usuário autenticado corretamente' : 'Usuário não está autenticado ou dados incompletos',
        details: {
          id: user?.id,
          email: user?.email,
          role: user?.role,
          tenant_id: user?.tenant_id
        }
      });

      if (!user?.id || !user?.tenant_id) {
        setIsDebugging(false);
        return;
      }

      // 2. Testar conexão com Supabase
      try {
        const { data: testData, error: testError } = await supabase
          .from('pipelines')
          .select('count(*)')
          .limit(1);

        addResult({
          step: '2. Conexão Supabase',
          status: testError ? 'error' : 'success',
          message: testError ? 'Erro na conexão com Supabase' : 'Conexão com Supabase OK',
          details: testError || testData
        });

        if (testError) {
          setIsDebugging(false);
          return;
        }
      } catch (error) {
        addResult({
          step: '2. Conexão Supabase',
          status: 'error',
          message: 'Erro na conexão com Supabase',
          details: error
        });
        setIsDebugging(false);
        return;
      }

      // 3. Testar inserção de pipeline
      const testPipelineData = {
        name: `Debug Test ${Date.now()}`,
        description: 'Pipeline criada para teste de debug',
        tenant_id: user.tenant_id,
        created_by: user.email || user.id,
      };

      try {
        const { data: insertResult, error: insertError } = await supabase
          .from('pipelines')
          .insert(testPipelineData)
          .select('*');

        if (insertError) {
          let errorType = 'Erro desconhecido';
          if (insertError.code === '42501') {
            errorType = 'Erro de permissão - RLS policies muito restritivas';
          } else if (insertError.code === '23505') {
            errorType = 'Nome já existe - conflict de unique constraint';
          } else if (insertError.message?.includes('RLS')) {
            errorType = 'Row Level Security bloqueando inserção';
          } else if (insertError.message?.includes('foreign key')) {
            errorType = 'Foreign key constraint violation';
          }

          addResult({
            step: '3. Inserção de Pipeline',
            status: 'error',
            message: `Erro na inserção: ${errorType}`,
            details: {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
              insertData: testPipelineData
            }
          });
        } else {
          addResult({
            step: '3. Inserção de Pipeline',
            status: 'success',
            message: 'Pipeline criada com sucesso!',
            details: insertResult
          });

          // 4. Verificar se pipeline aparece na busca
          const { data: searchResult, error: searchError } = await supabase
            .from('pipelines')
            .select('*')
            .eq('tenant_id', user.tenant_id)
            .order('created_at', { ascending: false })
            .limit(5);

          addResult({
            step: '4. Busca de Pipelines',
            status: searchError ? 'error' : 'success',
            message: searchError ? 'Erro na busca de pipelines' : `${searchResult?.length || 0} pipelines encontradas`,
            details: searchError || searchResult?.map(p => ({
              id: p.id,
              name: p.name,
              created_by: p.created_by,
              created_at: p.created_at
            }))
          });
        }
      } catch (error) {
        addResult({
          step: '3. Inserção de Pipeline',
          status: 'error',
          message: 'Erro geral na inserção',
          details: error
        });
      }

      // 5. Verificar autenticação
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        addResult({
          step: '5. Status de Autenticação',
          status: authError ? 'warning' : 'success',
          message: authError ? 'Usuário não autenticado no Supabase' : 'Usuário autenticado no Supabase',
          details: authError || { userId: authData.user?.id }
        });
      } catch (error) {
        addResult({
          step: '5. Status de Autenticação',
          status: 'error',
          message: 'Erro ao verificar autenticação',
          details: error
        });
      }

    } catch (error) {
      addResult({
        step: 'Debug Geral',
        status: 'error',
        message: 'Erro geral no debug',
        details: error
      });
    } finally {
      setIsDebugging(false);
    }
  };

  const getStatusIcon = (status: DebugResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '🔍';
    }
  };

  const getStatusColor = (status: DebugResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 Debug - Criação de Pipeline</CardTitle>
        <CardDescription>
          Ferramenta para diagnosticar problemas na criação de pipelines
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button 
            onClick={runDebug} 
            disabled={isDebugging}
            className="min-w-[150px]"
          >
            {isDebugging ? 'Debugando...' : 'Executar Debug'}
          </Button>
          <Button 
            onClick={clearResults} 
            variant="outline"
            disabled={results.length === 0}
          >
            Limpar Resultados
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Resultados do Debug:</h3>
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(result.status)}</span>
                  <span className="font-medium">{result.step}</span>
                  <span className={`text-sm ${getStatusColor(result.status)}`}>
                    ({result.status.toUpperCase()})
                  </span>
                </div>
                <p className="text-gray-700 mb-2">{result.message}</p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      Ver detalhes
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !isDebugging && (
          <div className="text-center py-8 text-gray-500">
            Clique em "Executar Debug" para começar o diagnóstico
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Como usar:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Execute o debug para identificar onde está o problema</li>
            <li>2. Verifique cada etapa do resultado</li>
            <li>3. Se houver erro na inserção, verifique os detalhes para entender o motivo</li>
            <li>4. Problemas comuns: RLS policies, dados de usuário, configuração do Supabase</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebugPipelineCreation; 