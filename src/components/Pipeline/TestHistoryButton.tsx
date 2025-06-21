import React, { useState } from 'react';
import { registerStageMove, registerLeadHistory, getLeadHistory } from '../../utils/historyUtils';
import { supabase } from '../../lib/supabase';

interface TestHistoryButtonProps {
  leadId: string;
}

const TestHistoryButton: React.FC<TestHistoryButtonProps> = ({ leadId }) => {
  const [results, setResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
    console.log(message);
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    
    try {
      addResult('🧪 Iniciando testes do sistema de histórico...\n');
      
      // Teste 1: Verificar se tabela existe
      addResult('📋 Teste 1: Verificando tabela lead_history...');
      const { data: tableCheck, error: tableError } = await supabase
        .from('lead_history')
        .select('count(*)')
        .limit(1);
      
      if (tableError) {
        addResult(`❌ Erro: ${tableError.message}`);
        return;
      }
      
      addResult('✅ Tabela lead_history existe e funcional');
      
      // Teste 2: Inserção direta com timestamp Brasil
      addResult('\n📋 Teste 2: Inserção direta com timezone Brasil...');
      
      // Criar timestamp no horário do Brasil
      const brasilTime = new Date().toLocaleString('en-CA', { 
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(', ', 'T') + '-03:00';
      
      addResult(`⏰ Timestamp Brasil criado: ${brasilTime}`);
      
      const { data: directInsert, error: directError } = await supabase
        .from('lead_history')
        .insert([{
          lead_id: leadId,
          action: 'test_direct',
          description: 'Teste direto com timestamp Brasil',
          created_at: brasilTime
        }])
        .select()
        .single();
      
      if (directError) {
        addResult(`❌ Erro na inserção direta: ${directError.message}`);
      } else {
        addResult(`✅ Inserção direta funcionou - ID: ${directInsert.id}`);
        addResult(`⏰ Timestamp salvo: ${directInsert.created_at}`);
      }
      
      // Teste 3: Função registerLeadHistory com timezone
      addResult('\n📋 Teste 3: Função registerLeadHistory com timezone...');
      
      try {
        const historyId = await registerLeadHistory({
          lead_id: leadId,
          action: 'test_function',
          description: 'Teste da função com timezone Brasil',
          created_at: brasilTime
        });
        
        if (historyId) {
          addResult(`✅ Função registerLeadHistory funcionou - ID: ${historyId}`);
        } else {
          addResult('❌ Função registerLeadHistory retornou null');
        }
      } catch (historyError: any) {
        addResult(`❌ Erro na função registerLeadHistory: ${historyError.message}`);
      }
      
      // Teste 4: Função registerStageMove com stages reais
      addResult('\n📋 Teste 4: Função registerStageMove com stages reais...');
      
      try {
        // Buscar stages reais da pipeline
        const { data: stages, error: stagesError } = await supabase
          .from('pipeline_stages')
          .select('id, name, order')
          .order('order', { ascending: true })
          .limit(3);
        
        if (stagesError) {
          addResult(`❌ Erro ao buscar stages: ${stagesError.message}`);
        } else if (!stages || stages.length < 2) {
          addResult('❌ Não há stages suficientes para testar');
        } else {
          addResult(`🎯 Stages encontradas: ${stages.map(s => `${s.name} (${s.id})`).join(', ')}`);
          
          // Testar movimentação da primeira para a segunda etapa
          const firstStage = stages[0];
          const secondStage = stages[1];
          
          addResult(`🔄 Testando movimentação: ${firstStage.name} → ${secondStage.name}`);
          
          await registerStageMove(leadId, firstStage.id, secondStage.id);
          addResult(`✅ Função registerStageMove executada: ${firstStage.name} → ${secondStage.name}`);
        }
      } catch (stageError: any) {
        addResult(`❌ Erro na função registerStageMove: ${stageError.message}`);
      }
      
      // Teste 5: Buscar histórico e verificar horários
      addResult('\n📋 Teste 5: Verificando histórico salvo...');
      
      const { data: history, error: historyError } = await supabase
        .from('lead_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (historyError) {
        addResult(`❌ Erro ao buscar histórico: ${historyError.message}`);
      } else {
        addResult(`✅ ${history?.length || 0} entradas encontradas no histórico`);
        
        if (history && history.length > 0) {
          addResult('\n📋 Últimas entradas:');
          history.forEach((entry, index) => {
            const date = new Date(entry.created_at);
            const brasilFormatted = date.toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            
            addResult(`${index + 1}. ${entry.action}: ${entry.description}`);
            addResult(`   ⏰ Horário: ${brasilFormatted} (Brasil)`);
            addResult(`   📅 Raw: ${entry.created_at}\n`);
          });
        }
      }
      
      // Teste 6: Verificar se tabelas complementares existem
      addResult('\n📋 Teste 6: Verificando tabelas complementares...');
      
      const tablesToCheck = ['lead_comments', 'lead_feedbacks'];
      
      for (const tableName of tablesToCheck) {
        try {
          const { data: tableData, error: tableCheckError } = await supabase
            .from(tableName)
            .select('count(*)')
            .limit(1);
          
          if (tableCheckError) {
            addResult(`❌ Tabela ${tableName}: ${tableCheckError.message}`);
          } else {
            addResult(`✅ Tabela ${tableName}: OK`);
          }
        } catch (error: any) {
          addResult(`❌ Tabela ${tableName}: ${error.message}`);
        }
      }
      
      addResult('\n🎉 Todos os testes concluídos!');
      
    } catch (error: any) {
      addResult(`❌ Erro geral nos testes: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🧪 Testes Timezone & Stages</h3>
        <button
          onClick={runTests}
          disabled={testing}
          className={`px-4 py-2 rounded font-medium ${
            testing 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {testing ? '⏳ Testando...' : '🧪 Testar Sistema'}
        </button>
      </div>
      
      {results.length > 0 && (
        <div className="bg-white p-4 rounded border">
          <h4 className="font-medium mb-2">📋 Resultados dos Testes:</h4>
          <div className="text-sm space-y-1 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div key={index} className="whitespace-pre-wrap font-mono text-xs">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestHistoryButton;