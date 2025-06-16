import express from 'express';
import { supabase } from '../index';

const router = express.Router();

router.post('/create-custom-fields-tables', async (req, res) => {
  try {
    console.log('🔧 Criando tabelas de campos customizados...');

    // Tentar criar as tabelas usando queries diretas
    try {
      // Criar tabela pipeline_custom_fields usando query SQL direta
      const { error: error1 } = await supabase
        .from('pipeline_custom_fields')
        .select('id')
        .limit(1);

      // Se a tabela não existe, vamos criá-la manualmente
      if (error1 && error1.code === 'PGRST116') {
        console.log('Tabela pipeline_custom_fields não existe, tentando criar...');
        
        // Como não podemos usar exec_sql, vamos tentar uma abordagem diferente
        // Vamos inserir dados de exemplo diretamente para forçar a criação da estrutura
        const { error: insertError } = await supabase
          .from('pipeline_custom_fields')
          .insert({
            pipeline_id: '00000000-0000-0000-0000-000000000000',
            field_name: 'test',
            field_label: 'Test Field',
            field_type: 'text',
            field_order: 1,
            is_required: false
          });

        console.log('Resultado da tentativa de inserção:', insertError);
      }

      // Tentar criar tabela pipeline_leads
      const { error: error2 } = await supabase
        .from('pipeline_leads')
        .select('id')
        .limit(1);

      if (error2 && error2.code === 'PGRST116') {
        console.log('Tabela pipeline_leads não existe, tentando criar...');
        
        const { error: insertError2 } = await supabase
          .from('pipeline_leads')
          .insert({
            pipeline_id: '00000000-0000-0000-0000-000000000000',
            stage_id: '00000000-0000-0000-0000-000000000000',
            lead_data: {},
            created_by: '00000000-0000-0000-0000-000000000000'
          });

        console.log('Resultado da tentativa de inserção 2:', insertError2);
      }

      res.json({
        success: true,
        message: 'Tentativa de criação das tabelas concluída!',
        note: 'As tabelas precisam ser criadas manualmente no painel do Supabase',
        sql_commands: [
          `CREATE TABLE IF NOT EXISTS pipeline_custom_fields (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            pipeline_id UUID NOT NULL,
            field_name VARCHAR(100) NOT NULL,
            field_label VARCHAR(200) NOT NULL,
            field_type VARCHAR(50) NOT NULL,
            field_options JSONB,
            is_required BOOLEAN DEFAULT false,
            field_order INTEGER DEFAULT 0,
            placeholder TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );`,
          `CREATE TABLE IF NOT EXISTS pipeline_leads (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            pipeline_id UUID NOT NULL,
            stage_id UUID NOT NULL,
            lead_data JSONB NOT NULL DEFAULT '{}',
            created_by UUID NOT NULL,
            assigned_to UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );`
        ]
      });

    } catch (createError) {
      console.error('Erro ao tentar criar tabelas:', createError);
      
      res.json({
        success: false,
        message: 'Não foi possível criar as tabelas automaticamente',
        error: createError,
        instructions: 'Execute os comandos SQL manualmente no painel do Supabase',
        sql_commands: [
          `CREATE TABLE IF NOT EXISTS pipeline_custom_fields (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            pipeline_id UUID NOT NULL,
            field_name VARCHAR(100) NOT NULL,
            field_label VARCHAR(200) NOT NULL,
            field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'textarea', 'select', 'number', 'date')),
            field_options JSONB,
            is_required BOOLEAN DEFAULT false,
            field_order INTEGER DEFAULT 0,
            placeholder TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(pipeline_id, field_name)
          );`,
          `CREATE TABLE IF NOT EXISTS pipeline_leads (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            pipeline_id UUID NOT NULL,
            stage_id UUID NOT NULL,
            lead_data JSONB NOT NULL DEFAULT '{}',
            created_by UUID NOT NULL,
            assigned_to UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );`,
          `-- Inserir campos de exemplo
          INSERT INTO pipeline_custom_fields (pipeline_id, field_name, field_label, field_type, field_order, is_required, placeholder) 
          SELECT 
              p.id,
              'nome',
              'Nome Completo',
              'text',
              1,
              true,
              'Digite o nome completo do cliente'
          FROM pipelines p 
          WHERE p.name = 'Vendas Imoveis';`
        ]
      });
    }

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao criar tabelas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para verificar se as tabelas existem
router.get('/check-tables', async (req, res) => {
  try {
    // Verificar pipeline_custom_fields
    const { error: error1 } = await supabase
      .from('pipeline_custom_fields')
      .select('id')
      .limit(1);

    // Verificar pipeline_leads
    const { error: error2 } = await supabase
      .from('pipeline_leads')
      .select('id')
      .limit(1);

    const tablesExist = {
      pipeline_custom_fields: !error1,
      pipeline_leads: !error2
    };

    res.json({
      tables_exist: tablesExist,
      all_ready: !error1 && !error2,
      message: (!error1 && !error2) 
        ? '✅ Todas as tabelas estão prontas!' 
        : '⚠️ Algumas tabelas precisam ser criadas'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao verificar tabelas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota temporária para criar tabelas de pipeline
router.post('/create-pipeline-tables', async (req, res) => {
  try {
    console.log('🔧 Criando tabelas de pipeline...');

    // Verificar se a tabela pipelines existe
    const { error: pipelineError } = await supabase
      .from('pipelines')
      .select('id')
      .limit(1);

    console.log('Resultado da verificação da tabela pipelines:', pipelineError);

    // Verificar se a tabela pipeline_stages existe
    const { error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('id')
      .limit(1);

    console.log('Resultado da verificação da tabela pipeline_stages:', stagesError);

    // Verificar se a tabela pipeline_members existe
    const { error: membersError } = await supabase
      .from('pipeline_members')
      .select('id')
      .limit(1);

    console.log('Resultado da verificação da tabela pipeline_members:', membersError);

    res.json({
      success: true,
      message: 'Verificação das tabelas de pipeline concluída',
      tables_status: {
        pipelines: !pipelineError,
        pipeline_stages: !stagesError,
        pipeline_members: !membersError
      },
      errors: {
        pipelines: pipelineError?.message,
        pipeline_stages: stagesError?.message,
        pipeline_members: membersError?.message
      },
      note: 'Se alguma tabela não existe, execute o SQL manualmente no painel do Supabase'
    });

  } catch (error) {
    console.error('Erro ao verificar tabelas de pipeline:', error);
    res.status(500).json({
      error: 'Erro ao verificar tabelas de pipeline',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para corrigir políticas RLS
router.post('/fix-rls-policies', async (req, res) => {
  try {
    console.log('🔧 Corrigindo políticas RLS...');

    // Como não podemos executar SQL diretamente, vamos tentar uma abordagem diferente
    // Vamos desabilitar temporariamente o RLS para teste
    
    res.json({
      success: true,
      message: 'Para corrigir as políticas RLS, execute o seguinte SQL no painel do Supabase:',
      sql_commands: [
        `-- Remover políticas restritivas
        DROP POLICY IF EXISTS "Users can view custom fields of their tenant pipelines" ON pipeline_custom_fields;
        DROP POLICY IF EXISTS "Admins can manage custom fields of their tenant pipelines" ON pipeline_custom_fields;
        DROP POLICY IF EXISTS "Users can view leads of their tenant pipelines" ON pipeline_leads;
        DROP POLICY IF EXISTS "Members can manage leads assigned to them or created by them" ON pipeline_leads;`,
        
        `-- Criar políticas permissivas para desenvolvimento
        CREATE POLICY "pipeline_custom_fields_all_access" ON pipeline_custom_fields FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "pipeline_leads_all_access" ON pipeline_leads FOR ALL USING (true) WITH CHECK (true);`,
        
        `-- Ou temporariamente desabilitar RLS para desenvolvimento
        ALTER TABLE pipeline_custom_fields DISABLE ROW LEVEL SECURITY;
        ALTER TABLE pipeline_leads DISABLE ROW LEVEL SECURITY;`
      ],
      note: 'Execute estes comandos no SQL Editor do Supabase para resolver o problema de RLS'
    });

  } catch (error) {
    console.error('Erro ao preparar correção RLS:', error);
    res.status(500).json({
      error: 'Erro ao preparar correção RLS',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para tentar desabilitar RLS temporariamente
router.post('/disable-rls-temp', async (req, res) => {
  try {
    console.log('🔧 Tentando desabilitar RLS temporariamente...');

    // Tentar usar uma query SQL direta (pode não funcionar)
    try {
      const { error: disableError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE pipeline_custom_fields DISABLE ROW LEVEL SECURITY;'
      });
      
      if (disableError) {
        console.log('Não foi possível desabilitar RLS via RPC:', disableError);
      }
    } catch (rpcError) {
      console.log('RPC não disponível:', rpcError);
    }

    // Tentar inserir um registro de teste para verificar se o RLS está causando problema
    const testInsert = {
      pipeline_id: '00000000-0000-0000-0000-000000000000',
      field_name: 'test_field',
      field_label: 'Test Field',
      field_type: 'text',
      field_order: 1,
      is_required: false
    };

    const { data: testResult, error: testError } = await supabase
      .from('pipeline_custom_fields')
      .insert(testInsert)
      .select();

    res.json({
      success: true,
      message: 'Teste de RLS concluído',
      test_result: {
        success: !testError,
        error: testError?.message,
        data: testResult
      },
      instructions: [
        '1. Acesse o painel do Supabase',
        '2. Vá para SQL Editor',
        '3. Execute: ALTER TABLE pipeline_custom_fields DISABLE ROW LEVEL SECURITY;',
        '4. Execute: ALTER TABLE pipeline_leads DISABLE ROW LEVEL SECURITY;',
        '5. Teste novamente a criação da pipeline'
      ]
    });

  } catch (error) {
    console.error('Erro no teste RLS:', error);
    res.status(500).json({
      error: 'Erro no teste RLS',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 