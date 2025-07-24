import { supabase } from './supabase';
import { logger } from './logger';

// Função para testar conectividade com Supabase
export const testSupabaseConnection = async () => {
  try {
    logger.info('🔍 Testando conexão com Supabase...');

    // Teste 1: Verificar se consegue acessar a tabela users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(1);

    if (usersError) {
      logger.error('❌ Erro ao acessar tabela users', usersError);
      return false;
    }

    logger.success(`✅ Tabela users acessível. Usuários encontrados: ${users?.length || 0}`);

    // Teste 2: Verificar se consegue acessar a tabela companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1);

    if (companiesError) {
      logger.error('❌ Erro ao acessar tabela companies', companiesError);
      return false;
    }

    logger.success(`✅ Tabela companies acessível. Empresas encontradas: ${companies?.length || 0}`);

    // Teste 3: Tentar inserir e deletar um registro de teste
    const testId = crypto.randomUUID();
    const testData = {
      id: testId,
      name: 'TESTE_CONEXAO_' + Date.now(),
      segment: 'teste'
    };

    const { error: insertError } = await supabase
      .from('companies')
      .insert([testData]);
      
    const testCompany = { id: testId, ...testData };

    if (insertError) {
      logger.error('❌ Erro ao inserir dados de teste', insertError);
      return false;
    }

    logger.success('✅ Inserção de teste bem-sucedida');

    // Deletar o registro de teste
    const { error: deleteError } = await supabase
      .from('companies')
      .delete()
      .eq('id', testCompany.id);

    if (deleteError) {
      logger.warning('⚠️ Erro ao deletar dados de teste (não crítico)', deleteError);
    } else {
      logger.success('✅ Deleção de teste bem-sucedida');
    }

    logger.success('🎉 Todos os testes de conectividade passaram!');
    return true;

  } catch (error) {
    logger.error('💥 Erro geral nos testes de conectividade', error);
    return false;
  }
};

export const testPipelineMembers = async (tenantId: string) => {
  try {
    logger.info('🧪 Testando pipeline members...');

    // 1. Buscar uma pipeline existente
    const { data: pipelines } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (!pipelines || pipelines.length === 0) {
      logger.info('❌ Nenhuma pipeline encontrada para teste');
      return;
    }

    const pipeline = pipelines[0];
    logger.info('📋 Pipeline para teste:', pipeline);

    // 2. Buscar membros disponíveis
    const { data: members } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('role', 'member')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (!members || members.length === 0) {
      logger.info('❌ Nenhum membro encontrado para teste');
      return;
    }

    const member = members[0];
    logger.info('👤 Membro para teste:', member);

    // 3. Verificar se já existe a associação
    const { data: existingAssociation } = await supabase
      .from('pipeline_members')
      .select('*')
      .eq('pipeline_id', pipeline.id)
      .eq('member_id', member.id);

    if (existingAssociation && existingAssociation.length > 0) {
      logger.info('✅ Associação já existe:', existingAssociation[0]);
      return;
    }

    // 4. Criar associação
    const associationId = crypto.randomUUID();
    const { error } = await supabase
      .from('pipeline_members')
      .insert([{
        id: associationId,
        pipeline_id: pipeline.id,
        member_id: member.id,
        assigned_at: new Date().toISOString()
      }]);
      
    const newAssociation = error ? null : [{ id: associationId, pipeline_id: pipeline.id, member_id: member.id }];

    if (error) {
      logger.error('❌ Erro ao criar associação:', error);
    } else {
      logger.info('✅ Associação criada:', newAssociation);
    }

    // 5. Verificar se consegue carregar com join
    const { data: loadedMembers, error: loadError } = await supabase
      .from('pipeline_members')
      .select(`
        id,
        assigned_at,
        member_id,
        users!pipeline_members_member_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('pipeline_id', pipeline.id);

    if (loadError) {
      logger.error('❌ Erro ao carregar membros com join:', loadError);
    } else {
      logger.info('✅ Membros carregados com join:', loadedMembers);
    }

  } catch (error) {
    logger.error('💥 Erro no teste:', error);
  }
};

export default testSupabaseConnection; 