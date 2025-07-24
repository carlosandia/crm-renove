// Script para aplicar migração de arquivamento - versão 2
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyArchiveMigrationV2() {
  console.log('🔧 Aplicando migração de arquivamento via client...');

  try {
    // 1. Tentar adicionar coluna is_archived
    console.log('1. Adicionando coluna is_archived...');
    const { data: data1, error: error1 } = await supabase.rpc('create_column_if_not_exists', {
      table_name: 'pipelines',
      column_name: 'is_archived',
      column_type: 'BOOLEAN DEFAULT FALSE'
    });

    if (error1) {
      console.log('Tentando abordagem direta para is_archived...');
      // Tentar via SQL direto
      await supabase.rpc('exec_sql_direct', {
        query: 'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;'
      });
    }

    // 2. Tentar adicionar coluna archived_at
    console.log('2. Adicionando coluna archived_at...');
    const { data: data2, error: error2 } = await supabase.rpc('create_column_if_not_exists', {
      table_name: 'pipelines',
      column_name: 'archived_at',
      column_type: 'TIMESTAMP WITH TIME ZONE'
    });

    if (error2) {
      console.log('Tentando abordagem direta para archived_at...');
      await supabase.rpc('exec_sql_direct', {
        query: 'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;'
      });
    }

    // 3. Tentar adicionar coluna archived_by
    console.log('3. Adicionando coluna archived_by...');
    const { data: data3, error: error3 } = await supabase.rpc('create_column_if_not_exists', {
      table_name: 'pipelines',
      column_name: 'archived_by',
      column_type: 'TEXT'
    });

    if (error3) {
      console.log('Tentando abordagem direta para archived_by...');
      await supabase.rpc('exec_sql_direct', {
        query: 'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_by TEXT;'
      });
    }

    // 4. Fazer update para garantir is_archived = false em todas pipelines existentes
    console.log('4. Garantindo is_archived = false para pipelines existentes...');
    const { error: updateError } = await supabase
      .from('pipelines')
      .update({ is_archived: false })
      .is('is_archived', null);

    if (updateError) {
      console.log('Aviso ao fazer update:', updateError.message);
    }

    // 5. Testar se funcionou
    console.log('\n🔍 Testando se migração funcionou...');
    const { data: testData, error: testError } = await supabase
      .from('pipelines')
      .select('id, name, is_archived')
      .limit(1);

    if (testError) {
      console.error('❌ Teste falhou:', testError);
      
      // Tentativa última: usar SQL direto manual
      console.log('\n🛠️ Tentativa final: executar comandos um a um...');
      
      const commands = [
        'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;',
        'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;',
        'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_by TEXT;'
      ];

      for (const cmd of commands) {
        try {
          console.log(`Executando: ${cmd}`);
          const { error } = await supabase.sql`${cmd}`;
          if (error) {
            console.log(`Erro (ignorado): ${error.message}`);
          } else {
            console.log('✅ Comando executado');
          }
        } catch (e) {
          console.log(`Erro capturado (ignorado): ${e.message}`);
        }
      }

    } else {
      console.log('✅ Migração aplicada com sucesso!', testData);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

applyArchiveMigrationV2().catch(console.error);