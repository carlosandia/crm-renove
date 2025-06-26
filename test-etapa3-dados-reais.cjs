const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://bplzklspzehkkhghkffg.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwbHprbHNwemVoa2toZ2hrZmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MzIzNzksImV4cCI6MjA1MzMwODM3OX0.FNAjmMkBK5l4yOkIX7wKsqGsj4pGKYdSwgvQhUIwdcY';

console.log('🎯 TESTE ETAPA 3: Dados Reais no Módulo Feedback');
console.log('Conectando ao Supabase...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDadosReais() {
  try {
    console.log('\n🔍 1. Testando query com JOINs para dados reais...');
    
    // Query idêntica à implementada no FeedbackModule
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('lead_feedback')
      .select(`
        id,
        feedback_type,
        comment,
        created_at,
        lead_id,
        user_id,
        users!lead_feedback_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          role,
          tenant_id
        ),
        pipeline_leads!lead_feedback_lead_id_fkey (
          id,
          custom_data,
          lead_data,
          pipeline_id,
          pipelines!pipeline_leads_pipeline_id_fkey (
            id,
            name,
            created_by,
            users!pipelines_created_by_fkey (
              id,
              first_name,
              last_name,
              email,
              role,
              tenant_id,
              company_name
            )
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.log('⚠️ Erro na query com JOINs:', feedbackError.message);
      console.log('📋 Testando método simplificado...');
      
      // Método simplificado
      const { data: simpleFeedback, error: simpleError } = await supabase
        .from('lead_feedback')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (simpleError) {
        console.log('❌ Erro na query simplificada:', simpleError.message);
        return;
      }
      
      console.log('✅ Feedbacks encontrados (método simplificado):', simpleFeedback?.length || 0);
      if (simpleFeedback && simpleFeedback.length > 0) {
        console.log('📊 Exemplo de feedback encontrado:');
        console.log('- ID:', simpleFeedback[0].id);
        console.log('- Tipo:', simpleFeedback[0].feedback_type);
        console.log('- Comentário:', simpleFeedback[0].comment.substring(0, 50) + '...');
        console.log('- User ID:', simpleFeedback[0].user_id);
        console.log('- Lead ID:', simpleFeedback[0].lead_id);
      }
      return;
    }

    console.log('✅ Query com JOINs executada com sucesso!');
    console.log('📊 Feedbacks encontrados:', feedbackData?.length || 0);

    if (feedbackData && feedbackData.length > 0) {
      const feedback = feedbackData[0];
      console.log('\n🎯 DADOS REAIS EXTRAÍDOS:');
      console.log('1. ✅ Ícone:', feedback.feedback_type === 'positive' ? '👍 Positivo' : '👎 Negativo');
      
      // UTM Source
      const leadData = Array.isArray(feedback.pipeline_leads) ? feedback.pipeline_leads[0] : feedback.pipeline_leads;
      const leadInfo = leadData?.custom_data || leadData?.lead_data || {};
      const utmSource = leadInfo.utm_source || leadInfo.source || leadInfo.traffic_source || 'manual';
      console.log('2. ✅ UTM Source:', utmSource);
      
      // Usuário
      const userData = feedback.users;
      const userName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || userData?.email || 'Usuário';
      const userRole = userData?.role || 'member';
      console.log('3. ✅ Usuário:', userName, `(${userRole})`);
      
      // Comentário
      console.log('4. ✅ Comentário:', feedback.comment.substring(0, 80) + '...');
      
      // Pipeline e data
      const pipelineData = leadData?.pipelines;
      const pipeline = Array.isArray(pipelineData) ? pipelineData[0] : pipelineData;
      console.log('5. ✅ Pipeline:', pipeline?.name || 'Pipeline');
      console.log('6. ✅ Data:', new Date(feedback.created_at).toLocaleString('pt-BR'));
      
      console.log('\n✨ IMPLEMENTAÇÃO DOS DADOS REAIS: FUNCIONAL!');
    } else {
      console.log('📋 Nenhum feedback encontrado. Sistema funcionará com dados mock.');
    }

    console.log('\n🎯 2. Verificando estrutura do banco para UTM Sources...');
    
    // Verificar se existem UTM sources nos leads
    const { data: leadsWithUtm, error: utmError } = await supabase
      .from('pipeline_leads')
      .select('custom_data, lead_data')
      .not('custom_data', 'is', null)
      .limit(5);
      
    if (!utmError && leadsWithUtm && leadsWithUtm.length > 0) {
      console.log('✅ Leads com dados encontrados:', leadsWithUtm.length);
      leadsWithUtm.forEach((lead, i) => {
        const data = lead.custom_data || lead.lead_data || {};
        const source = data.utm_source || data.source || data.traffic_source;
        if (source) {
          console.log(`📍 Lead ${i+1} - UTM Source:`, source);
        }
      });
    } else {
      console.log('📋 Nenhum lead com UTM source encontrado');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testDadosReais(); 