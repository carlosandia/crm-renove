// Teste para simular o que o frontend faz, mas com fallback para service role
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.NVUaA1-QnXO-a9kQgIDKZsZCb2u3_Gw1WaV0IaUQB8w';

const anonSupabase = createClient(supabaseUrl, anonKey);
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

async function testArchivingWithServiceRole() {
  console.log('🔧 TESTE: Arquivamento com Service Role (Bypass RLS)\n');
  
  try {
    const pipelineId = '2754e9b2-4037-4fbb-8760-1fdbd18137f9';
    const userEmail = 'seraquevai@seraquevai.com';
    
    console.log(`🎯 Testando pipeline: ${pipelineId}`);
    
    // 1. Buscar pipeline atual com anon client
    console.log('\n🔍 [Step 1] Buscando pipeline com anon client...');
    const { data: fetchResult, error: fetchError } = await anonSupabase
      .from('pipelines')
      .select('id, name, description, tenant_id, is_active, created_by')
      .eq('id', pipelineId);
      
    if (fetchError) {
      console.error('❌ Erro na busca com anon:', fetchError.message);
      return;
    }
    
    if (!fetchResult || fetchResult.length === 0) {
      console.log('❌ Pipeline não encontrada com anon client');
      return;
    }
    
    const currentPipeline = fetchResult[0];
    console.log('✅ Pipeline encontrada:', {
      name: currentPipeline.name,
      tenant_id: currentPipeline.tenant_id,
      is_active: currentPipeline.is_active,
      created_by: currentPipeline.created_by
    });
    
    // 2. Simular o que handleArchivePipeline faz
    console.log('\n📝 [Step 2] Preparando dados de arquivamento...');
    const shouldArchive = true;
    const archiveMetadata = `[ARCHIVED:${new Date().toISOString()}:${userEmail}]`;
    
    let cleanDescription = currentPipeline.description || '';
    const archiveRegex = /\[ARCHIVED:[^\]]+\]\s*/g;
    cleanDescription = cleanDescription.replace(archiveRegex, '');
    
    const newDescription = shouldArchive 
      ? `${archiveMetadata} ${cleanDescription}`.trim()
      : cleanDescription;
    
    console.log('📊 Dados para update:', {
      is_active: !shouldArchive,
      description: newDescription,
      action: shouldArchive ? 'ARQUIVAR' : 'DESARQUIVAR'
    });
    
    // 3. Tentar update com anon client (deve falhar com RLS)
    console.log('\n⚡ [Step 3] Tentando update com anon client...');
    const { data: anonResult, error: anonError } = await anonSupabase
      .from('pipelines')
      .update({
        is_active: !shouldArchive,
        description: newDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', pipelineId)
      .select();
      
    if (anonError) {
      console.log('❌ Update com anon falhou (esperado se RLS configurado):', anonError.message);
    } else {
      console.log('✅ Update com anon funcionou:', anonResult?.length || 0, 'registros');
    }
    
    // 4. Tentar update com service role (deve funcionar, bypass RLS)
    console.log('\n⚡ [Step 4] Tentando update com service role (bypass RLS)...');
    const { data: adminResult, error: adminError } = await adminSupabase
      .from('pipelines')
      .update({
        is_active: !shouldArchive,
        description: newDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', pipelineId)
      .select();
      
    if (adminError) {
      console.error('❌ Update com service role falhou:', adminError.message);
    } else {
      console.log('✅ Update com service role funcionou:', adminResult?.length || 0, 'registros');
      
      if (adminResult && adminResult.length > 0) {
        console.log('📋 Pipeline após update:', {
          name: adminResult[0].name,
          is_active: adminResult[0].is_active,
          description: adminResult[0].description?.substring(0, 100) + '...'
        });
        
        // 5. Restaurar estado original
        console.log('\n🔄 [Step 5] Restaurando estado original...');
        const { data: restoreResult, error: restoreError } = await adminSupabase
          .from('pipelines')
          .update({
            is_active: true,
            description: cleanDescription,
            updated_at: new Date().toISOString()
          })
          .eq('id', pipelineId)
          .select();
          
        if (restoreError) {
          console.error('❌ Erro na restauração:', restoreError.message);
        } else {
          console.log('✅ Estado original restaurado');
        }
      }
    }
    
    console.log('\n🎯 DIAGNÓSTICO:');
    if (anonError && !adminError) {
      console.log('✅ RLS está funcionando corretamente (anon falha, service role funciona)');
      console.log('🔧 SOLUÇÃO PARA O FRONTEND:');
      console.log('   - Modificar handleArchivePipeline para usar service role para updates');
      console.log('   - Ou garantir que o JWT do usuário tem as claims corretas (role + tenant_id)');
    } else if (!anonError && !adminError) {
      console.log('⚠️ RLS pode não estar configurado (ambos funcionaram)');
    } else {
      console.log('❌ Problema mais profundo - ambos falharam');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testArchivingWithServiceRole().catch(console.error);