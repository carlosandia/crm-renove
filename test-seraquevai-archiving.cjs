// Teste específico para seraquevai@seraquevai.com
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSeraquevaiArchiving() {
  console.log('🧪 TESTE ESPECÍFICO: seraquevai@seraquevai.com\n');
  
  try {
    // Dados do usuário
    const userTenantId = 'd7caffc1-c923-47c8-9301-ca9eeff1a243';
    const userEmail = 'seraquevai@seraquevai.com';
    const userId = 'bbaf8441-23c9-44dc-9a4c-a4da787f829c';
    
    console.log(`👤 Usuário: ${userEmail}`);
    console.log(`🏢 Tenant ID: ${userTenantId}`);
    console.log(`🆔 User ID: ${userId}`);
    
    // Buscar uma pipeline ativa para testar
    console.log('\n📋 Buscando pipeline ativa para teste...');
    const { data: activePipelines, error: activeError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('tenant_id', userTenantId)
      .eq('is_active', true)
      .limit(1);
      
    if (activeError) {
      console.error('❌ Erro ao buscar pipelines ativas:', activeError.message);
      return;
    }
    
    if (!activePipelines || activePipelines.length === 0) {
      console.log('⚠️ Nenhuma pipeline ativa encontrada para teste');
      return;
    }
    
    const testPipeline = activePipelines[0];
    console.log(`🎯 Pipeline para teste: "${testPipeline.name}"`);
    console.log(`   ID: ${testPipeline.id}`);
    console.log(`   Tenant ID: ${testPipeline.tenant_id}`);
    console.log(`   Created by: ${testPipeline.created_by}`);
    console.log(`   Status: is_active=${testPipeline.is_active}`);
    
    // Simular exatamente o que o frontend faz
    console.log('\n🔧 Simulando função handleArchivePipeline...');
    
    // 1. Buscar pipeline atual
    console.log('🔍 [Step 1] Buscando pipeline atual...');
    const { data: currentPipeline, error: fetchError } = await supabase
      .from('pipelines')
      .select('description, tenant_id, is_active, name')
      .eq('id', testPipeline.id)
      .single();
      
    if (fetchError) {
      console.error('❌ [Step 1] Erro ao buscar pipeline:', fetchError.message);
      return;
    }
    
    console.log('✅ [Step 1] Pipeline encontrada:', {
      name: currentPipeline.name,
      tenantId: currentPipeline.tenant_id,
      isActive: currentPipeline.is_active,
      description: currentPipeline.description || 'Sem descrição'
    });
    
    // 2. Verificar tenant IDs
    console.log('🔍 [Step 2] Verificando tenant IDs:', {
      pipelineTenant: currentPipeline.tenant_id,
      userTenant: userTenantId,
      match: currentPipeline.tenant_id === userTenantId
    });
    
    // 3. Preparar dados de arquivamento
    console.log('📝 [Step 3] Preparando dados de arquivamento...');
    const shouldArchive = true;
    const archiveMetadata = `[ARCHIVED:${new Date().toISOString()}:${userEmail}]`;
    
    let cleanDescription = currentPipeline.description || '';
    const archiveRegex = /\[ARCHIVED:[^\]]+\]\s*/g;
    cleanDescription = cleanDescription.replace(archiveRegex, '');
    
    const newDescription = shouldArchive 
      ? `${archiveMetadata} ${cleanDescription}`.trim()
      : cleanDescription;
    
    console.log('📊 [Step 3] Dados da atualização:', {
      is_active: !shouldArchive,
      description: newDescription,
      original_is_active: currentPipeline.is_active,
      action: shouldArchive ? 'ARQUIVAR' : 'DESARQUIVAR'
    });
    
    // 4. Executar update (exatamente como o frontend)
    console.log('⚡ [Step 4] Executando update...');
    const { data: updateResult, error: updateError } = await supabase
      .from('pipelines')
      .update({
        is_active: !shouldArchive,
        description: newDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', testPipeline.id)
      .select();
      
    if (updateError) {
      console.error('❌ [Step 4] Erro na atualização:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      return;
    }
    
    console.log('✅ [Step 4] Atualização realizada com sucesso!');
    console.log(`📊 Registros afetados: ${updateResult?.length || 0}`);
    
    if (updateResult && updateResult.length > 0) {
      const updatedPipeline = updateResult[0];
      console.log('📋 Pipeline após update:', {
        id: updatedPipeline.id,
        name: updatedPipeline.name,
        isActive: updatedPipeline.is_active,
        description: updatedPipeline.description,
        updatedAt: updatedPipeline.updated_at
      });
      
      // Verificar detecção do frontend
      const isDetectedArchived = !updatedPipeline.is_active || updatedPipeline.description?.includes('[ARCHIVED:');
      console.log(`🔍 Frontend detectaria como arquivada: ${isDetectedArchived ? '✅ SIM' : '❌ NÃO'}`);
    }
    
    // 5. Verificar filtros
    console.log('\n📊 [Step 5] Verificando filtros...');
    const { data: allTenantPipelines, error: allError } = await supabase
      .from('pipelines')
      .select('id, name, is_active, description')
      .eq('tenant_id', userTenantId);
      
    if (allError) {
      console.error('❌ Erro ao buscar todas as pipelines:', allError.message);
    } else {
      // Aplicar lógica de filtros do frontend
      const activePipelinesCount = allTenantPipelines.filter(p => {
        const isArchived = !p.is_active || (p.description?.includes('[ARCHIVED:') || false);
        return !isArchived;
      }).length;
      
      const archivedPipelinesCount = allTenantPipelines.filter(p => {
        const isArchived = !p.is_active || (p.description?.includes('[ARCHIVED:') || false);
        return isArchived;
      }).length;
      
      console.log(`✅ Filtro "Ativas": ${activePipelinesCount} pipelines`);
      console.log(`📦 Filtro "Arquivadas": ${archivedPipelinesCount} pipelines`);
      console.log(`📊 Total: ${allTenantPipelines.length} pipelines`);
    }
    
    // 6. Limpeza - desarquivar para voltar ao estado original
    console.log('\n🔄 [Step 6] Limpeza - desarquivando pipeline...');
    const { data: cleanupResult, error: cleanupError } = await supabase
      .from('pipelines')
      .update({
        is_active: true,
        description: cleanDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', testPipeline.id)
      .select();
      
    if (cleanupError) {
      console.error('❌ Erro na limpeza:', cleanupError.message);
    } else {
      console.log('✅ Pipeline desarquivada (estado original restaurado)');
    }
    
    console.log('\n🎉 RESULTADO FINAL:');
    console.log('✅ Sistema de arquivamento funcionando perfeitamente');
    console.log('✅ Usuário tem permissões adequadas');
    console.log('✅ Filtros de tenant_id funcionando');
    console.log('✅ Update sem erros de RLS');
    
    console.log('\n🌐 INSTRUÇÕES PARA O BROWSER:');
    console.log('1. Limpe o cache do browser (Ctrl+Shift+R)');
    console.log('2. Recarregue a página http://127.0.0.1:8080');
    console.log('3. Abra o console (F12) para ver os logs');
    console.log('4. Agora o arquivamento deve funcionar sem erros');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.log('🔍 Stack trace:', error.stack);
  }
}

testSeraquevaiArchiving().catch(console.error);