const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = 'https://maralvabadbgqpytlvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFsdmFiYWRiZ3FweXRsdmgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcxNzIzMDE4NiwiZXhwIjoyMDMyODA2MTg2fQ.YiNs1_3bJa_C9Jw4gQRhxPbmNnwRnXNJzgR3kbCZlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executarSQL() {
  try {
    console.log('🚀 Executando SQL para criar tabela user_pipeline_links...');
    
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('user-pipeline-links.sql', 'utf8');
    
    // Dividir em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && !cmd.startsWith('/*'));
    
    for (const command of commands) {
      if (command.toLowerCase().includes('select')) {
        // Para comandos SELECT, usar rpc
        console.log('📋 Executando consulta...');
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: command + ';' 
        });
        
        if (error) {
          console.error('❌ Erro na consulta:', error);
        } else {
          console.log('✅ Consulta executada:', data);
        }
      } else {
        // Para outros comandos, usar rpc
        console.log('🔧 Executando comando:', command.substring(0, 50) + '...');
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: command + ';' 
        });
        
        if (error) {
          console.error('❌ Erro no comando:', error);
        } else {
          console.log('✅ Comando executado com sucesso');
        }
      }
    }
    
    console.log('🎉 Todos os comandos SQL foram executados!');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

executarSQL(); 