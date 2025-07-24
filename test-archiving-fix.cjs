// Teste da correção do arquivamento
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testArchivingFix() {
  console.log('🧪 TESTE: Correção do Arquivamento\n');
  
  try {
    const pipelineId = '2754e9b2-4037-4fbb-8760-1fdbd18137f9';
    const userEmail = 'seraquevai@seraquevai.com';
    
    console.log(`🎯 Testando pipeline: ${pipelineId}`);
    
    // 1. Simular busca como o frontend CORRIGIDO faz
    console.log('\n🔍 [Step 1] Busca corrigida (sem .single())...');
    const { data: fetchResult, error: fetchError } = await supabase
      .from('pipelines')
      .select('description, tenant_id, is_active, name')
      .eq('id', pipelineId);
      
    if (fetchError) {
      console.error('❌ Erro na busca:', fetchError.message);
      return;
    }
    
    if (!fetchResult || fetchResult.length === 0) {
      console.log('❌ Pipeline não encontrada');
      return;
    }
    
    const currentPipeline = fetchResult[0];
    console.log('✅ Pipeline encontrada:');
    console.log('📊 Dados:', JSON.stringify(currentPipeline, null, 2));
    
    // 2. Verificar se tenant_id está presente
    console.log('\n🔍 [Step 2] Verificação de tenant_id...');
    console.log(`   tenant_id: ${currentPipeline.tenant_id}`);
    console.log(`   tenant_id type: ${typeof currentPipeline.tenant_id}`);
    console.log(`   has tenant_id: ${!!currentPipeline.tenant_id}`);
    
    if (!currentPipeline.tenant_id) {
      console.error('❌ tenant_id ainda está undefined');
      return;
    }
    
    // 3. Simular preparação dos dados
    console.log('\n📝 [Step 3] Preparando dados de arquivamento...');
    const shouldArchive = true;
    const archiveMetadata = `[ARCHIVED:${new Date().toISOString()}:${userEmail}]`;
    
    let cleanDescription = currentPipeline.description || '';
    const archiveRegex = /\[ARCHIVED:[^\]]+\]\s*/g;
    cleanDescription = cleanDescription.replace(archiveRegex, '');
    
    const newDescription = shouldArchive 
      ? `${archiveMetadata} ${cleanDescription}`.trim()
      : cleanDescription;
    
    console.log('📊 Dados da atualização:', {
      is_active: !shouldArchive,
      description: newDescription,
      original_is_active: currentPipeline.is_active,
      action: shouldArchive ? 'ARQUIVAR' : 'DESARQUIVAR'
    });
    
    // 4. Executar update
    console.log('\n⚡ [Step 4] Executando update...');
    const { data: updateResult, error: updateError } = await supabase
      .from('pipelines')
      .update({
        is_active: !shouldArchive,
        description: newDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', pipelineId)
      .select();
      
    if (updateError) {
      console.error('❌ Erro no update:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      return;
    }
    
    console.log('✅ Update realizado com sucesso!');
    console.log(`📊 Registros afetados: ${updateResult?.length || 0}`);
    
    if (updateResult && updateResult.length > 0) {
      console.log('📋 Pipeline após update:', updateResult[0]);
      
      // 5. Verificar se frontend detectaria como arquivada
      const updatedPipeline = updateResult[0];
      const isDetectedArchived = !updatedPipeline.is_active || updatedPipeline.description?.includes('[ARCHIVED:');
      console.log(`🔍 Frontend detectaria como arquivada: ${isDetectedArchived ? '✅ SIM' : '❌ NÃO'}`);
      
      // 6. Limpeza - desarquivar
      console.log('\n🔄 [Step 5] Limpeza - desarquivando...');
      const { data: cleanupResult, error: cleanupError } = await supabase
        .from('pipelines')
        .update({
          is_active: true,
          description: cleanDescription,
          updated_at: new Date().toISOString()
        })
        .eq('id', pipelineId)
        .select();
        
      if (cleanupError) {
        console.error('❌ Erro na limpeza:', cleanupError.message);
      } else {
        console.log('✅ Estado original restaurado');
      }
      
    } else {
      console.log('❌ Nenhum registro foi afetado - possível problema de RLS');
    }
    
    console.log('\n🎉 RESULTADO:');
    if (updateResult && updateResult.length > 0) {
      console.log('✅ Correção funcionou! O arquivamento deve funcionar no frontend agora.');
      console.log('\n🌐 INSTRUÇÕES:');
      console.log('1. Recarregue a página no browser');
      console.log('2. Teste o arquivamento novamente');
      console.log('3. Verifique os logs no console');
    } else {
      console.log('❌ Ainda há problemas com o update');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testArchivingFix().catch(console.error);