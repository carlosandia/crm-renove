/**
 * Script de Debug para Criação de Pipeline
 * Execute este script no console do navegador para identificar problemas
 */

// Função para testar criação de pipeline diretamente
async function debugPipelineCreation() {
  console.log('🔍 INICIANDO DEBUG DA CRIAÇÃO DE PIPELINE');
  
  try {
    // 1. Verificar dados do usuário
    console.log('1️⃣ Verificando dados do usuário...');
    const userStr = localStorage.getItem('crm_user_data');
    if (!userStr) {
      console.error('❌ Usuário não encontrado no localStorage');
      return;
    }
    
    const user = JSON.parse(userStr);
    console.log('✅ Usuário encontrado:', {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id
    });
    
    // 2. Verificar se Supabase está configurado
    console.log('2️⃣ Verificando configuração do Supabase...');
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
    console.log('Supabase URL:', supabaseUrl ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
    console.log('Supabase Key:', supabaseKey ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
    
    // 3. Testar conexão com Supabase
    console.log('3️⃣ Testando conexão com Supabase...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Testar uma query simples
    const { data: testData, error: testError } = await supabase
      .from('pipelines')
      .select('count(*)')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erro na conexão com Supabase:', testError);
      return;
    }
    console.log('✅ Conexão com Supabase OK');
    
    // 4. Testar inserção de pipeline
    console.log('4️⃣ Testando inserção de pipeline...');
    const testPipelineData = {
      name: `Teste Debug ${Date.now()}`,
      description: 'Pipeline criada para teste de debug',
      tenant_id: user.tenant_id,
      created_by: user.email || user.id,
    };
    
    console.log('Dados para inserção:', testPipelineData);
    
    const { data: insertResult, error: insertError } = await supabase
      .from('pipelines')
      .insert(testPipelineData)
      .select('*');
    
    if (insertError) {
      console.error('❌ ERRO NA INSERÇÃO:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // Tentar identificar o tipo de erro
      if (insertError.code === '42501') {
        console.error('🔒 PROBLEMA: Erro de permissão - RLS policies muito restritivas');
      } else if (insertError.code === '23505') {
        console.error('🔄 PROBLEMA: Nome já existe - conflict de unique constraint');
      } else if (insertError.message?.includes('RLS')) {
        console.error('🛡️ PROBLEMA: Row Level Security bloqueando inserção');
      } else if (insertError.message?.includes('foreign key')) {
        console.error('🔗 PROBLEMA: Foreign key constraint violation');
      } else {
        console.error('❓ PROBLEMA DESCONHECIDO:', insertError);
      }
      return;
    }
    
    console.log('✅ PIPELINE CRIADA COM SUCESSO:', insertResult);
    
    // 5. Verificar se pipeline aparece na busca
    console.log('5️⃣ Verificando se pipeline aparece na busca...');
    const { data: searchResult, error: searchError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (searchError) {
      console.error('❌ Erro na busca:', searchError);
    } else {
      console.log('✅ Pipelines encontradas:', searchResult.length);
      console.log('📋 Lista de pipelines:', searchResult.map(p => ({
        id: p.id,
        name: p.name,
        created_by: p.created_by,
        created_at: p.created_at
      })));
    }
    
    // 6. Testar políticas RLS específicas
    console.log('6️⃣ Testando políticas RLS...');
    
    // Test com auth context simulado
    const { error: authTestError } = await supabase.auth.getUser();
    console.log('Auth status:', authTestError ? 'SEM AUTH' : 'COM AUTH');
    
    console.log('🎉 DEBUG CONCLUÍDO - Verifique os logs acima para identificar problemas');
    
  } catch (error) {
    console.error('💥 ERRO GERAL NO DEBUG:', error);
  }
}

// Função para testar validação do frontend
function debugFrontendValidation() {
  console.log('🎯 TESTANDO VALIDAÇÃO DO FRONTEND');
  
  // Simular dados de formulário
  const testFormData = {
    name: 'Pipeline Teste Frontend',
    description: 'Teste de validação',
    member_ids: [],
    stages: [
      { name: 'Lead', order_index: 0, is_system_stage: true },
      { name: 'Ganho', order_index: 1, is_system_stage: true },
      { name: 'Perdido', order_index: 2, is_system_stage: true }
    ],
    custom_fields: [
      { field_name: 'nome_lead', field_label: 'Nome', field_type: 'text', is_required: true },
      { field_name: 'email', field_label: 'E-mail', field_type: 'email', is_required: true },
      { field_name: 'telefone', field_label: 'Telefone', field_type: 'phone', is_required: true }
    ],
    cadence_configs: []
  };
  
  // Verificar se dados estão válidos
  console.log('Dados do formulário:', testFormData);
  
  // Verificar campos obrigatórios
  const requiredFields = ['name'];
  const missingFields = requiredFields.filter(field => !testFormData[field]?.trim());
  
  if (missingFields.length > 0) {
    console.error('❌ Campos obrigatórios faltando:', missingFields);
  } else {
    console.log('✅ Validação básica passou');
  }
  
  // Verificar se usuário está autenticado
  const userStr = localStorage.getItem('crm_user_data');
  if (!userStr) {
    console.error('❌ Usuário não autenticado');
  } else {
    const user = JSON.parse(userStr);
    if (!user.id || !user.tenant_id) {
      console.error('❌ Dados de usuário incompletos:', user);
    } else {
      console.log('✅ Usuário autenticado corretamente');
    }
  }
}

// Função para verificar estado dos componentes
function debugComponentState() {
  console.log('🧩 VERIFICANDO ESTADO DOS COMPONENTES');
  
  // Verificar se há elementos na tela
  const createButton = document.querySelector('[data-testid="create-pipeline-button"]') || 
                     document.querySelector('button:contains("Criar Pipeline")') ||
                     document.querySelector('button:contains("Nova Pipeline")');
  
  if (createButton) {
    console.log('✅ Botão "Criar Pipeline" encontrado na tela');
    console.log('Botão habilitado:', !(createButton as HTMLButtonElement).disabled);
  } else {
    console.log('❌ Botão "Criar Pipeline" não encontrado na tela');
  }
  
  // Verificar se há formulários visíveis
  const forms = document.querySelectorAll('form');
  console.log('📝 Formulários na tela:', forms.length);
  
  // Verificar modais abertos
  const modals = document.querySelectorAll('[role="dialog"], .modal, [data-testid*="modal"]');
  console.log('🪟 Modais na tela:', modals.length);
  
  // Verificar console errors
  console.log('⚠️ Para ver erros do console, abra o DevTools → Console');
}

// Exportar funções para uso global
if (typeof window !== 'undefined') {
  (window as any).debugPipelineCreation = debugPipelineCreation;
  (window as any).debugFrontendValidation = debugFrontendValidation;
  (window as any).debugComponentState = debugComponentState;
  
  console.log(`
🔧 FUNÇÕES DE DEBUG DISPONÍVEIS:

• debugPipelineCreation() - Testa criação completa de pipeline
• debugFrontendValidation() - Testa validação do frontend  
• debugComponentState() - Verifica estado dos componentes

Execute qualquer uma dessas funções no console para debuggar.
  `);
}

export { debugPipelineCreation, debugFrontendValidation, debugComponentState }; 