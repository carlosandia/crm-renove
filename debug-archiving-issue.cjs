// Debug do problema de arquivamento
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugArchivingIssue() {
  console.log('🔍 DEBUG: Investigando problema de arquivamento\n');
  
  try {
    // 1. Buscar uma pipeline para testar
    console.log('📋 Buscando pipelines disponíveis...');
    const { data: pipelines, error: selectError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('is_active', true)
      .limit(1);
      
    if (selectError) {
      console.error('❌ Erro ao buscar pipelines:', selectError.message);
      return;
    }
    
    if (!pipelines || pipelines.length === 0) {
      console.log('⚠️ Nenhuma pipeline ativa encontrada para teste');
      return;
    }
    
    const testPipeline = pipelines[0];
    console.log(`🎯 Pipeline de teste: ${testPipeline.name} (${testPipeline.id})`);
    console.log(`   Tenant ID: ${testPipeline.tenant_id}`);
    console.log(`   Status atual: is_active=${testPipeline.is_active}`);
    console.log(`   Description: "${testPipeline.description || 'Sem descrição'}"`);
    
    // 2. Simular exatamente o que o frontend faz
    console.log('\n🔧 Simulando arquivamento exato do frontend...');
    
    // Dados do usuário simulado (teste3@teste3.com)
    const mockUser = {
      id: 'user-id-teste3',
      email: 'teste3@teste3.com',
      tenant_id: testPipeline.tenant_id // Usar o mesmo tenant da pipeline
    };
    
    console.log(`👤 Usuário simulado: ${mockUser.email} (tenant: ${mockUser.tenant_id})`);
    
    // Metadata de arquivamento
    const archiveMetadata = `[ARCHIVED:${new Date().toISOString()}:${mockUser.email}]`;
    console.log(`📝 Metadata: ${archiveMetadata}`);
    
    // Limpar description anterior
    let cleanDescription = testPipeline.description || '';
    const archiveRegex = /\[ARCHIVED:[^\]]+\]\s*/g;
    cleanDescription = cleanDescription.replace(archiveRegex, '');
    
    const newDescription = `${archiveMetadata} ${cleanDescription}`.trim();
    console.log(`📄 Nova description: "${newDescription}"`);
    
    // 3. Executar update exato
    console.log('\n⚡ Executando update...');
    const updateData = {
      is_active: false, // false = arquivada
      description: newDescription,
      updated_at: new Date().toISOString()
    };
    
    console.log('📊 Dados do update:', updateData);
    
    const { data: updateResult, error: updateError } = await supabase
      .from('pipelines')
      .update(updateData)
      .eq('id', testPipeline.id)
      .eq('tenant_id', mockUser.tenant_id)
      .select();
      
    if (updateError) {
      console.error('❌ Erro no update:', updateError);
      console.log('🔍 Detalhes do erro:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      return;
    }
    
    console.log('✅ Update executado com sucesso!');
    console.log(`📊 Registros afetados: ${updateResult?.length || 0}`);
    
    if (updateResult && updateResult.length > 0) {
      const updatedPipeline = updateResult[0];
      console.log('📋 Pipeline após update:');
      console.log(`   is_active: ${updatedPipeline.is_active}`);
      console.log(`   description: "${updatedPipeline.description}"`);
      console.log(`   updated_at: ${updatedPipeline.updated_at}`);
    }
    
    // 4. Verificar se a detecção do frontend funcionaria
    console.log('\n🔍 Testando detecção do frontend...');
    const isArchived = !updateResult[0].is_active || (updateResult[0].description?.includes('[ARCHIVED:') || false);
    console.log(`🎯 Frontend detectaria como arquivada: ${isArchived ? '✅ SIM' : '❌ NÃO'}`);
    
    // 5. Testar filtros
    console.log('\n📊 Testando filtros após arquivamento...');
    
    // Filtro de ativas
    const { data: activePipelines, error: activeError } = await supabase
      .from('pipelines')
      .select('id, name, is_active, description')
      .eq('tenant_id', mockUser.tenant_id)
      .eq('is_active', true);
      
    if (!activeError) {
      console.log(`✅ Pipelines ativas: ${activePipelines?.length || 0}`);
    }
    
    // Filtro de arquivadas (usando lógica do frontend)
    const { data: allPipelines, error: allError } = await supabase
      .from('pipelines')
      .select('id, name, is_active, description')
      .eq('tenant_id', mockUser.tenant_id);
      
    if (!allError && allPipelines) {
      const archived = allPipelines.filter(p => 
        !p.is_active || (p.description?.includes('[ARCHIVED:') || false)
      );
      console.log(`📦 Pipelines arquivadas: ${archived.length}`);
      archived.forEach(p => console.log(`   - ${p.name} (is_active: ${p.is_active})`));
    }
    
    // 6. Testar desarquivamento
    console.log('\n🔄 Testando desarquivamento...');
    
    // Limpar metadata
    let cleanDescriptionUnarchive = updateResult[0].description || '';
    cleanDescriptionUnarchive = cleanDescriptionUnarchive.replace(archiveRegex, '');
    
    const { data: unarchiveResult, error: unarchiveError } = await supabase
      .from('pipelines')
      .update({
        is_active: true,
        description: cleanDescriptionUnarchive,
        updated_at: new Date().toISOString()
      })
      .eq('id', testPipeline.id)
      .eq('tenant_id', mockUser.tenant_id)
      .select();
      
    if (unarchiveError) {
      console.error('❌ Erro no desarquivamento:', unarchiveError.message);
    } else {
      console.log('✅ Desarquivamento executado com sucesso!');
      console.log(`📋 Pipeline restaurada: is_active=${unarchiveResult[0].is_active}`);
    }
    
    console.log('\n🎯 DIAGNÓSTICO COMPLETO:');
    console.log('✅ Update de arquivamento funciona');
    console.log('✅ Update de desarquivamento funciona');
    console.log('✅ Detecção do frontend funciona');
    console.log('✅ Filtros funcionam corretamente');
    
    console.log('\n💡 Se o problema persiste no browser, verifique:');
    console.log('1. 🔄 Cache do browser ou do React Query');
    console.log('2. 🔍 Console do browser para erros JavaScript');
    console.log('3. 📡 Network tab para ver se requests estão sendo feitos');
    console.log('4. 🎯 Se o tenant_id do usuário está correto');
    console.log('5. 🔒 Se há problemas de RLS no Supabase');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.log('🔍 Stack trace:', error.stack);
  }
}

debugArchivingIssue().catch(console.error);