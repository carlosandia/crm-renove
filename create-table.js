const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://maralvabadbgqpytlvh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFsdmFiYWRiZ3FweXRsdmgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcxNzIzMDE4NiwiZXhwIjoyMDMyODA2MTg2fQ.YiNs1_3bJa_C9Jw4gQRhxPbmNnwRnXNJzgR3kbCZlLw'
);

async function createTable() {
  console.log('🚀 Criando tabela user_pipeline_links...');
  
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql_query: `
      CREATE TABLE IF NOT EXISTS user_pipeline_links (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, pipeline_id)
      );
    `
  });
  
  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log('✅ Tabela criada com sucesso!');
  }
  
  // Criar índices
  console.log('📊 Criando índices...');
  
  const { error: indexError } = await supabase.rpc('exec_sql', { 
    sql_query: `
      CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_user_id ON user_pipeline_links(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_pipeline_id ON user_pipeline_links(pipeline_id);
    `
  });
  
  if (indexError) {
    console.error('❌ Erro nos índices:', indexError);
  } else {
    console.log('✅ Índices criados com sucesso!');
  }
  
  // Habilitar RLS
  console.log('🔒 Habilitando RLS...');
  
  const { error: rlsError } = await supabase.rpc('exec_sql', { 
    sql_query: `ALTER TABLE user_pipeline_links ENABLE ROW LEVEL SECURITY;`
  });
  
  if (rlsError) {
    console.error('❌ Erro no RLS:', rlsError);
  } else {
    console.log('✅ RLS habilitado com sucesso!');
  }
  
  console.log('🎉 Configuração completa!');
}

createTable(); 