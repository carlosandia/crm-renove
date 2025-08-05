#!/usr/bin/env node

const https = require('https');

// Configurações
const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: 'marajvabdwkpgopytvhh.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🔧 Executando correção RLS via API direta...');
  
  try {
    // 1. Remover políticas antigas
    console.log('📝 Step 1: Removendo políticas antigas...');
    const dropSQL = `
      DROP POLICY IF EXISTS "allow_all_cadence_configs" ON cadence_configs;
      DROP POLICY IF EXISTS "cadence_configs_tenant_policy" ON cadence_configs;
      DROP POLICY IF EXISTS "cadence_configs_users_policy" ON cadence_configs;
    `;
    
    await executeSQL(dropSQL);
    console.log('✅ Políticas antigas removidas');

    // 2. Criar nova política
    console.log('🔐 Step 2: Criando nova política RLS...');
    const createSQL = `
      CREATE POLICY "cadence_configs_auth_uid" ON cadence_configs
      FOR ALL
      USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM users u 
          JOIN pipelines p ON p.tenant_id = u.tenant_id
          WHERE u.id = auth.uid() 
          AND u.is_active = true
          AND p.id = cadence_configs.pipeline_id
        )
      )
      WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM users u 
          JOIN pipelines p ON p.tenant_id = u.tenant_id
          WHERE u.id = auth.uid() 
          AND u.is_active = true
          AND p.id = pipeline_id
        )
      );
    `;
    
    await executeSQL(createSQL);
    console.log('✅ Nova política criada');

    // 3. Verificar resultado
    console.log('🔍 Step 3: Verificando políticas...');
    const checkSQL = `
      SELECT schemaname, tablename, policyname, permissive, roles, cmd
      FROM pg_policies 
      WHERE tablename = 'cadence_configs';
    `;
    
    const result = await executeSQL(checkSQL);
    console.log('✅ Verificação concluída');
    
    console.log('🎉 Correção RLS aplicada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();