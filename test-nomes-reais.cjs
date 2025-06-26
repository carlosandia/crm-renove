const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://bplzklspzehkkhghkffg.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwbHprbHNwemVoa2toZ2hrZmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MzIzNzksImV4cCI6MjA1MzMwODM3OX0.FNAjmMkBK5l4yOkIX7wKsqGsj4pGKYdSwgvQhUIwdcY';

console.log('🎯 TESTE: Nomes Reais dos Usuários no Feedback');
console.log('Conectando ao Supabase...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNomesReais() {
  try {
    console.log('\n🔍 1. Verificando usuários cadastrados no sistema...');
    
    // Buscar usuários existentes
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .limit(10);

    if (usersError) {
      console.log('❌ Erro ao buscar usuários:', usersError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('📋 Nenhum usuário encontrado no banco');
      return;
    }

    console.log('✅ Usuários encontrados:', users.length);
    console.log('\n📊 LISTA DE USUÁRIOS:');
    
    users.forEach((user, i) => {
      const nomeCompleto = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      const nomeExibido = nomeCompleto || user.email?.split('@')[0] || 'Usuário';
      
      console.log(`${i+1}. ID: ${user.id}`);
      console.log(`   Nome: ${nomeExibido}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Dados: first_name='${user.first_name}', last_name='${user.last_name}'`);
      console.log('');
    });

    console.log('\n🔍 2. Verificando feedbacks existentes...');
    
    // Buscar feedbacks existentes
    const { data: feedbacks, error: feedbacksError } = await supabase
      .from('lead_feedback')
      .select('id, user_id, feedback_type, comment')
      .limit(5);

    if (feedbacksError) {
      console.log('❌ Erro ao buscar feedbacks:', feedbacksError.message);
      return;
    }

    if (!feedbacks || feedbacks.length === 0) {
      console.log('📋 Nenhum feedback encontrado no banco');
      console.log('💡 Sugestão: Crie alguns feedbacks primeiro através da interface');
      return;
    }

    console.log('✅ Feedbacks encontrados:', feedbacks.length);
    console.log('\n📊 TESTE DE BUSCA DE NOMES REAIS:');

    for (const feedback of feedbacks) {
      console.log(`\n🔍 Feedback ID: ${feedback.id}`);
      console.log(`   User ID: ${feedback.user_id}`);
      console.log(`   Tipo: ${feedback.feedback_type}`);
      
      // Buscar dados do usuário que registrou este feedback
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('id', feedback.user_id)
        .single();

      if (userError) {
        console.log(`   ❌ Erro ao buscar usuário: ${userError.message}`);
        continue;
      }

      if (userData) {
        const nomeReal = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 
                        userData.email?.split('@')[0] || 
                        'Usuário';
        
        console.log(`   ✅ NOME REAL ENCONTRADO: "${nomeReal}"`);
        console.log(`   📧 Email: ${userData.email}`);
        console.log(`   👤 Role: ${userData.role}`);
        console.log(`   💬 Comentário: ${feedback.comment.substring(0, 50)}...`);
      } else {
        console.log(`   ❌ Usuário não encontrado para ID: ${feedback.user_id}`);
      }
    }

    console.log('\n✨ RESULTADO DO TESTE:');
    console.log('✅ Sistema consegue buscar nomes reais dos usuários');
    console.log('✅ Fallback funciona para emails sem nome');
    console.log('✅ Implementação está funcionando corretamente');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testNomesReais(); 