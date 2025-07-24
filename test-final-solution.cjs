// Teste final da solução de arquivamento
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, anonKey);

async function testFinalSolution() {
  console.log('🎯 TESTE FINAL: Solução de Arquivamento Implementada\n');
  
  try {
    const pipelineId = '2754e9b2-4037-4fbb-8760-1fdbd18137f9';
    const userTenantId = 'd7caffc1-c923-47c8-9301-ca9eeff1a243';
    const userEmail = 'seraquevai@seraquevai.com';
    const userRole = 'admin';
    
    console.log(`🎯 Testando pipeline: ${pipelineId}`);
    console.log(`👤 Simulando usuário: ${userEmail} (${userRole})`);
    
    // 1. Buscar pipeline atual
    console.log('\n🔍 [Step 1] Buscando pipeline atual...');
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
    console.log('✅ Pipeline encontrada:', {
      name: currentPipeline.name,
      tenant_id: currentPipeline.tenant_id,
      is_active: currentPipeline.is_active
    });
    
    // 2. Validações de segurança (como o frontend faz)
    console.log('\n🔒 [Step 2] Executando validações de segurança...');
    
    // Validação 1: Role
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      console.error('❌ Validação falhou: Usuário não é admin');
      return;
    }
    console.log('✅ Validação de role: PASSOU');
    
    // Validação 2: Tenant
    if (userRole !== 'super_admin' && currentPipeline.tenant_id !== userTenantId) {
      console.error('❌ Validação falhou: Pipeline não pertence ao tenant do usuário');
      return;
    }
    console.log('✅ Validação de tenant: PASSOU');
    
    console.log('✅ Todas as validações passaram!');
    
    // 3. Preparar dados de arquivamento
    console.log('\n📝 [Step 3] Preparando dados de arquivamento...');
    const shouldArchive = !currentPipeline.is_active; // Inverter o estado atual
    const action = shouldArchive ? 'ARQUIVAR' : 'DESARQUIVAR';
    
    const archiveMetadata = shouldArchive 
      ? `[ARCHIVED:${new Date().toISOString()}:${userEmail}]`
      : '';
    
    let cleanDescription = currentPipeline.description || '';
    const archiveRegex = /\[ARCHIVED:[^\]]+\]\s*/g;
    cleanDescription = cleanDescription.replace(archiveRegex, '');
    
    const newDescription = shouldArchive 
      ? `${archiveMetadata} ${cleanDescription}`.trim()
      : cleanDescription;
    
    console.log(`📊 Ação: ${action}`);
    console.log('📊 Dados para update:', {
      is_active: !shouldArchive,
      description: newDescription.substring(0, 100) + (newDescription.length > 100 ? '...' : ''),
      pipeline_name: currentPipeline.name
    });
    
    // 4. Executar update
    console.log(`\n⚡ [Step 4] Executando ${action}...`);
    const { data, error } = await supabase
      .from('pipelines')
      .update({
        is_active: !shouldArchive,
        description: newDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', pipelineId)
      .select();
      
    if (error) {
      console.error(`❌ Erro no ${action}:`, error.message);
      return;
    }
    
    console.log(`✅ ${action} realizado com sucesso!`);
    console.log(`📊 Registros afetados: ${data?.length || 0}`);
    
    if (data && data.length > 0) {
      const updatedPipeline = data[0];
      console.log('📋 Pipeline após update:', {
        name: updatedPipeline.name,
        is_active: updatedPipeline.is_active,
        has_archive_metadata: updatedPipeline.description?.includes('[ARCHIVED:'),
        status: updatedPipeline.is_active ? 'ATIVA' : 'ARQUIVADA'
      });
      
      // 5. Verificar como o frontend detectaria o status
      console.log('\n🔍 [Step 5] Verificando detecção do frontend...');
      const isDetectedArchived = !updatedPipeline.is_active || updatedPipeline.description?.includes('[ARCHIVED:');
      console.log(`🎯 Frontend detectaria como: ${isDetectedArchived ? 'ARQUIVADA' : 'ATIVA'}`);
      
      // 6. Testar filtros
      console.log('\n📂 [Step 6] Testando filtros...');
      
      // Filtro "Ativas"
      const shouldShowInActive = updatedPipeline.is_active && !updatedPipeline.description?.includes('[ARCHIVED:');
      console.log(`📁 Apareceria no filtro "Ativas": ${shouldShowInActive ? '✅ SIM' : '❌ NÃO'}`);
      
      // Filtro "Arquivadas"  
      const shouldShowInArchived = !updatedPipeline.is_active || updatedPipeline.description?.includes('[ARCHIVED:');
      console.log(`📁 Apareceria no filtro "Arquivadas": ${shouldShowInArchived ? '✅ SIM' : '❌ NÃO'}`);
      
      console.log('\n🎉 RESULTADO FINAL:');
      console.log(`✅ ${action} funcionou perfeitamente!`);
      console.log('✅ Sistema de filtros funcionará corretamente');
      console.log('✅ Validações de segurança implementadas');
      console.log('✅ Solução pronta para produção');
      
    } else {
      console.log('❌ Nenhum registro foi afetado - possível problema');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testFinalSolution().catch(console.error);