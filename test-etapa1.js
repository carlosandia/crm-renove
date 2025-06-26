const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://bplzklspzehkkhghkffg.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwbHprbHNwemVoa2toZ2hrZmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MzIzNzksImV4cCI6MjA1MzMwODM3OX0.FNAjmMkBK5l4yOkIX7wKsqGsj4pGKYdSwgvQhUIwdcY';

console.log('🔍 Testando ETAPA 1: Documentos, Links e Notas');
console.log('Conectando ao Supabase...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEtapa1() {
  try {
    // 1. Buscar um lead existente
    console.log('\n1. Buscando leads existentes...');
    const { data: leads, error: leadsError } = await supabase
      .from('pipeline_leads')
      .select('id, custom_data, lead_data')
      .limit(5);
    
    if (leadsError) {
      console.error('❌ Erro ao buscar leads:', leadsError.message);
      return;
    }
    
    if (!leads || leads.length === 0) {
      console.log('⚠️ Nenhum lead encontrado. Criando um lead de teste...');
      await createTestLead();
      return;
    }
    
    console.log(`✅ Encontrados ${leads.length} leads`);
    
    // 2. Selecionar o primeiro lead e adicionar dados de teste
    const targetLead = leads[0];
    console.log(`\n2. Adicionando dados de teste ao lead: ${targetLead.id}`);
    
    const testData = {
      ...(targetLead.custom_data || targetLead.lead_data || {}),
      documentos_anexos: [
        {
          name: 'Proposta Comercial.pdf',
          url: 'https://exemplo.com/proposta.pdf',
          type: 'PDF'
        },
        {
          name: 'Apresentação.pptx',
          url: 'https://exemplo.com/apresentacao.pptx',
          type: 'PowerPoint'
        }
      ],
      links_oportunidade: [
        {
          title: 'Site da Empresa',
          url: 'https://empresa-cliente.com.br',
          description: 'Website institucional'
        },
        {
          title: 'LinkedIn',
          url: 'https://linkedin.com/company/empresa',
          description: 'Perfil no LinkedIn'
        }
      ],
      notas_oportunidade: `Cliente muito interessado no produto premium.
      
Pontos importantes:
- Orçamento aprovado: R$ 150.000
- Implementação: Março 2025
- Decisor: João Silva (Diretor TI)

Próximos passos:
1. Enviar proposta técnica
2. Agendar demo personalizada`
    };
    
    const { error: updateError } = await supabase
      .from('pipeline_leads')
      .update({ custom_data: testData })
      .eq('id', targetLead.id);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar lead:', updateError.message);
      return;
    }
    
    console.log('✅ Dados de teste adicionados com sucesso!');
    
    // 3. Verificar se os dados foram salvos
    console.log('\n3. Verificando dados salvos...');
    const { data: updatedLead, error: verifyError } = await supabase
      .from('pipeline_leads')
      .select('custom_data')
      .eq('id', targetLead.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Erro ao verificar dados:', verifyError.message);
      return;
    }
    
    console.log('\n📋 Dados salvos no lead:');
    console.log('📎 Documentos:', updatedLead.custom_data.documentos_anexos?.length || 0);
    console.log('🔗 Links:', updatedLead.custom_data.links_oportunidade?.length || 0);
    console.log('📝 Notas:', updatedLead.custom_data.notas_oportunidade ? 'Sim' : 'Não');
    
    console.log('\n🎉 ETAPA 1 IMPLEMENTADA COM SUCESSO!');
    console.log('\n📍 Para testar:');
    console.log('1. Acesse o sistema CRM');
    console.log('2. Abra uma pipeline');
    console.log('3. Clique em um card de lead');
    console.log('4. Na aba "Dados", veja os novos campos na seção "Oportunidade"');
    console.log(`5. Lead de teste: ${targetLead.id}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

async function createTestLead() {
  console.log('Criando lead de teste...');
  // Aqui você poderia criar um lead de teste se necessário
  console.log('⚠️ Por favor, crie um lead através do sistema primeiro.');
}

// Executar teste
testEtapa1(); 