import { supabase } from '../lib/supabase';

export const fixHistoryTables = async (): Promise<boolean> => {
  try {
    console.log('🔧 Iniciando correção das tabelas de histórico...');

    // 1. Verificar se a tabela lead_history existe
    const { data: tableExists, error: tableCheckError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'lead_history')
      .single();

    if (tableCheckError && tableCheckError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar tabela:', tableCheckError);
      return false;
    }

    // Se a tabela não existe, significa que precisa ser criada no banco
    if (!tableExists) {
      console.log('⚠️ Tabela lead_history não encontrada. Verifique se ela foi criada no banco de dados.');
      return false;
    }

    console.log('✅ Tabela lead_history encontrada');
    return true;

  } catch (error) {
    console.error('❌ Erro ao corrigir tabelas:', error);
    return false;
  }
};

// Função alternativa usando INSERT direto
export const testHistoryInsert = async (leadId: string): Promise<boolean> => {
  try {
    console.log('🧪 Testando inserção direta no histórico...');

    const { data, error } = await supabase
      .from('lead_history')
      .insert([{
        lead_id: leadId,
        action: 'test_action',
        description: 'Teste de inserção no histórico',
        user_name: 'Sistema de Teste',
        old_values: {},
        new_values: { test: true }
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao inserir teste:', error);
      return false;
    }

    console.log('✅ Teste de inserção bem-sucedido:', data.id);
    return true;

  } catch (error) {
    console.error('❌ Erro no teste de inserção:', error);
    return false;
  }
};

// Função para verificar estrutura da tabela
export const checkHistoryTable = async (): Promise<boolean> => {
  try {
    console.log('🔍 Verificando estrutura da tabela lead_history...');

    // Tentar fazer uma query simples
    const { data, error, count } = await supabase
      .from('lead_history')
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.error('❌ Erro ao verificar tabela:', error);
      return false;
    } else {
      console.log('✅ Tabela lead_history existe e está acessível');
      console.log('📊 Total de registros:', count);
      return true;
    }

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    return false;
  }
}; 