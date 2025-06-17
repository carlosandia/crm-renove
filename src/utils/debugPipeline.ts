import { supabase } from '../lib/supabase';

export const debugPipelineData = async (tenantId: string, userId: string) => {
  console.log('🔍 [DEBUG] Iniciando debug da pipeline...');
  console.log('🔍 [DEBUG] Tenant ID:', tenantId);
  console.log('🔍 [DEBUG] User ID:', userId);

  try {
    // 1. Verificar pipelines básicas
    console.log('🔍 [DEBUG] 1. Verificando pipelines básicas...');
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('tenant_id', tenantId);

    if (pipelinesError) {
      console.error('❌ [DEBUG] Erro ao buscar pipelines:', pipelinesError);
      return;
    }

    console.log('✅ [DEBUG] Pipelines encontradas:', pipelines?.length || 0);
    console.log('📋 [DEBUG] Pipelines:', pipelines);

    if (!pipelines || pipelines.length === 0) {
      console.log('ℹ️ [DEBUG] Nenhuma pipeline encontrada. Criando pipeline de teste...');
      
      // Criar pipeline de teste
      const { data: newPipeline, error: createError } = await supabase
        .from('pipelines')
        .insert({
          name: 'Pipeline de Teste',
          description: 'Pipeline criada automaticamente para teste',
          tenant_id: tenantId,
          created_by: userId
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ [DEBUG] Erro ao criar pipeline de teste:', createError);
        return;
      }

      console.log('✅ [DEBUG] Pipeline de teste criada:', newPipeline);
      
      // Criar estágios para a pipeline
      const stages = [
        { name: 'Prospecção', order_index: 1, temperature_score: 10, max_days_allowed: 7, color: '#3B82F6' },
        { name: 'Qualificação', order_index: 2, temperature_score: 30, max_days_allowed: 5, color: '#F59E0B' },
        { name: 'Proposta', order_index: 3, temperature_score: 60, max_days_allowed: 3, color: '#EF4444' },
        { name: 'Ganho', order_index: 4, temperature_score: 100, max_days_allowed: 1, color: '#10B981' }
      ];

      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(stages.map(stage => ({
          ...stage,
          pipeline_id: newPipeline.id
        })));

      if (stagesError) {
        console.error('❌ [DEBUG] Erro ao criar estágios:', stagesError);
      } else {
        console.log('✅ [DEBUG] Estágios criados com sucesso');
      }
    }

    // 2. Verificar membros disponíveis
    console.log('🔍 [DEBUG] 2. Verificando usuários members...');
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('tenant_id', tenantId)
      .eq('role', 'member');

    if (membersError) {
      console.error('❌ [DEBUG] Erro ao buscar members:', membersError);
    } else {
      console.log('✅ [DEBUG] Members encontrados:', members?.length || 0);
      console.log('👥 [DEBUG] Members:', members);
    }

    // 3. Verificar pipeline_members
    console.log('🔍 [DEBUG] 3. Verificando pipeline_members...');
    const { data: pipelineMembers, error: pmError } = await supabase
      .from('pipeline_members')
      .select('*');

    if (pmError) {
      console.error('❌ [DEBUG] Erro ao buscar pipeline_members:', pmError);
    } else {
      console.log('✅ [DEBUG] Pipeline members encontrados:', pipelineMembers?.length || 0);
      console.log('🔗 [DEBUG] Pipeline members:', pipelineMembers);
    }

    // 4. Testar query completa para admin
    console.log('🔍 [DEBUG] 4. Testando query completa para admin...');
    const { data: adminPipelines, error: adminError } = await supabase
      .from('pipelines')
      .select(`
        id,
        name,
        description,
        created_by,
        created_at,
        updated_at,
        tenant_id,
        pipeline_stages (
          id,
          pipeline_id,
          name,
          order_index,
          temperature_score,
          max_days_allowed,
          color
        )
      `)
      .eq('tenant_id', tenantId);

    if (adminError) {
      console.error('❌ [DEBUG] Erro na query admin:', adminError);
    } else {
      console.log('✅ [DEBUG] Query admin funcionou:', adminPipelines?.length || 0);
      console.log('📊 [DEBUG] Admin pipelines:', adminPipelines);
    }

    // 5. Testar query de membros separadamente
    if (adminPipelines && adminPipelines.length > 0) {
      console.log('🔍 [DEBUG] 5. Testando query de membros separadamente...');
      
      for (const pipeline of adminPipelines) {
        console.log(`🔍 [DEBUG] Buscando membros para pipeline: ${pipeline.name}`);
        
        const { data: pipelineMembers, error: membersError } = await supabase
          .from('pipeline_members')
          .select('id, pipeline_id, member_id, created_at, updated_at')
          .eq('pipeline_id', pipeline.id);

        if (membersError) {
          console.error(`❌ [DEBUG] Erro ao buscar membros da pipeline ${pipeline.name}:`, membersError);
          continue;
        }

        console.log(`👥 [DEBUG] Membros da pipeline ${pipeline.name}:`, pipelineMembers?.length || 0);

        if (pipelineMembers && pipelineMembers.length > 0) {
          for (const member of pipelineMembers) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, first_name, last_name, email')
              .eq('id', member.member_id)
              .single();

            if (userError) {
              console.error(`❌ [DEBUG] Erro ao buscar dados do usuário ${member.member_id}:`, userError);
            } else {
              console.log(`✅ [DEBUG] Dados do usuário:`, userData);
            }
          }
        }
      }
    }

    console.log('✅ [DEBUG] Debug concluído!');
    
  } catch (error) {
    console.error('💥 [DEBUG] Erro inesperado:', error);
  }
}; 