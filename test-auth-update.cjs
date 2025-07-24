// Teste específico para simular autenticação do frontend
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthentatedUpdate() {
  console.log('🔐 TESTE: Update Autenticado (Simulando Frontend)\n');
  
  try {
    const userEmail = 'seraquevai@seraquevai.com';
    const userPassword = 'password123'; // senha padrão para teste
    const pipelineId = '2754e9b2-4037-4fbb-8760-1fdbd18137f9';
    
    console.log(`🔑 [Step 1] Fazendo login como: ${userEmail}...`);
    
    // 1. Fazer login (simulando o que o frontend faz)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    });
    
    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      
      // Tentar login alternativo
      console.log('🔄 Tentando login alternativo...');
      const { data: altAuthData, error: altAuthError } = await supabase.auth.signInWithPassword({
        email: 'admin@teste.com',
        password: 'password123'
      });
      
      if (altAuthError) {
        console.error('❌ Login alternativo também falhou:', altAuthError.message);
        console.log('🔄 Continuando sem autenticação (usando anon key)...');
      } else {
        console.log('✅ Login alternativo bem-sucedido:', altAuthData.user?.email);
      }
    } else {
      console.log('✅ Login bem-sucedido:', authData.user?.email);
      console.log('🔍 User info:', {
        id: authData.user?.id,
        email: authData.user?.email,
        role: authData.user?.user_metadata?.role,
        tenant_id: authData.user?.user_metadata?.tenant_id
      });
    }
    
    // 2. Buscar pipeline como usuário autenticado
    console.log('\n🔍 [Step 2] Buscando pipeline como usuário autenticado...');
    const { data: fetchResult, error: fetchError } = await supabase
      .from('pipelines')
      .select('id, name, description, tenant_id, is_active, created_by')
      .eq('id', pipelineId);
      
    if (fetchError) {
      console.error('❌ Erro na busca autenticada:', fetchError);
      return;
    }
    
    if (!fetchResult || fetchResult.length === 0) {
      console.log('❌ Pipeline não encontrada com usuário autenticado');
      return;
    }
    
    const currentPipeline = fetchResult[0];
    console.log('✅ Pipeline encontrada:', currentPipeline);
    
    // 3. Verificar se há sessão ativa
    console.log('\n🔍 [Step 3] Verificando sessão ativa...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erro ao verificar sessão:', sessionError.message);
    } else if (sessionData.session) {
      console.log('✅ Sessão ativa encontrada:', {
        user_id: sessionData.session.user.id,
        expires_at: sessionData.session.expires_at,
        access_token_length: sessionData.session.access_token.length
      });
      
      // 4. Tentar update com sessão autenticada
      console.log('\n⚡ [Step 4] Tentando update com sessão autenticada...');
      const { data: updateResult, error: updateError } = await supabase
        .from('pipelines')
        .update({
          updated_at: new Date().toISOString(),
          description: `${currentPipeline.description || ''} [TEST:${Date.now()}]`.trim()
        })
        .eq('id', pipelineId)
        .select();
        
      if (updateError) {
        console.error('❌ Erro no update autenticado:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        
        // 5. Verificar políticas RLS
        console.log('\n🔍 [Step 5] Investigando políticas RLS...');
        const { data: policies, error: policiesError } = await supabase
          .rpc('get_table_policies', { table_name: 'pipelines' });
          
        if (policiesError) {
          console.log('⚠️ Não foi possível buscar políticas RLS:', policiesError.message);
        } else {
          console.log('📋 Políticas RLS encontradas:', policies);
        }
        
      } else {
        console.log('✅ Update autenticado bem-sucedido!');
        console.log(`📊 Registros afetados: ${updateResult?.length || 0}`);
        
        if (updateResult && updateResult.length > 0) {
          console.log('📋 Pipeline após update:', updateResult[0]);
        } else {
          console.log('❌ Nenhum registro foi afetado mesmo sem erro - possível problema de RLS');
        }
      }
      
    } else {
      console.log('❌ Nenhuma sessão ativa encontrada');
      
      // 6. Fazer logout e tentar novamente
      console.log('\n🚪 [Step 6] Fazendo logout e limpando sessão...');
      await supabase.auth.signOut();
      
      // Tentar update sem autenticação (como o teste original)
      console.log('\n⚡ [Step 7] Tentando update sem autenticação...');
      const { data: unauthResult, error: unauthError } = await supabase
        .from('pipelines')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', pipelineId)
        .select();
        
      if (unauthError) {
        console.error('❌ Update sem auth falhou:', unauthError.message);
      } else {
        console.log('✅ Update sem auth funcionou!');
        console.log(`📊 Registros afetados: ${unauthResult?.length || 0}`);
      }
    }
    
    console.log('\n🎯 DIAGNÓSTICO:');
    console.log('- Se update autenticado falhou mas não-autenticado funcionou = problema RLS');
    console.log('- Se ambos falharam = problema de permissão geral');
    console.log('- Se ambos funcionaram = problema no frontend/estado React');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testAuthentatedUpdate().catch(console.error);