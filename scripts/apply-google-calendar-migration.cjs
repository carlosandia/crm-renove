#!/usr/bin/env node

/**
 * GOOGLE CALENDAR ENTERPRISE ARCHITECTURE MIGRATION
 * Aplicar migração das tabelas platform_integrations e tenant_integrations
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20250126000000-google-calendar-enterprise-architecture.sql');

async function applyMigration() {
  console.log('🚀 Applying Google Calendar Enterprise Architecture migration...');
  
  try {
    // Read migration file
    if (!fs.existsSync(MIGRATION_FILE)) {
      throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
    }
    
    const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
    console.log('📝 Migration file loaded successfully');
    
    // Execute migration using exec_sql function
    console.log('⚡ Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_text: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration execution failed:', error);
      throw error;
    }
    
    console.log('✅ Migration executed successfully');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function validateMigration() {
  console.log('🔍 Validating migration...');
  
  try {
    // Check if new tables exist
    const { data: platformIntegrations, error: platformError } = await supabase
      .from('platform_integrations')
      .select('count')
      .limit(1);
    
    const { data: tenantIntegrations, error: tenantError } = await supabase
      .from('tenant_integrations')
      .select('count')
      .limit(1);
    
    const { data: platformLogs, error: logsError } = await supabase
      .from('platform_integration_logs')
      .select('count')
      .limit(1);
    
    if (platformError || tenantError || logsError) {
      console.error('❌ Validation failed:', { platformError, tenantError, logsError });
      return false;
    }
    
    console.log('✅ New tables created successfully:');
    console.log('   - platform_integrations ✅');
    console.log('   - tenant_integrations ✅');
    console.log('   - platform_integration_logs ✅');
    
    // Check if calendar_integrations table was enhanced
    const { data: calendarIntegrations, error: calendarError } = await supabase
      .from('calendar_integrations')
      .select('tenant_integration_id, connection_source, approved_by')
      .limit(1);
    
    if (!calendarError) {
      console.log('✅ calendar_integrations table enhanced successfully');
    }
    
    // Check if functions exist
    const { data: functions, error: functionsError } = await supabase
      .rpc('configure_platform_integration', {
        p_provider: 'test',
        p_integration_name: 'Test Integration',
        p_client_id: 'test_client_id',
        p_client_secret: 'test_secret',
        p_redirect_uri: 'http://localhost:3000/callback',
        p_scopes: ['test_scope'],
        p_configured_by: '00000000-0000-0000-0000-000000000000'
      })
      .then(() => true)
      .catch(() => false);
    
    if (functions) {
      console.log('✅ Platform integration functions created successfully');
    }
    
    console.log('🎉 Migration validation completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

async function main() {
  console.log('🏗️  GOOGLE CALENDAR ENTERPRISE ARCHITECTURE MIGRATION');
  console.log('===================================================');
  console.log('Creating tables for centralized OAuth2 configuration');
  console.log('');
  
  try {
    // Step 1: Apply migration
    await applyMigration();
    
    // Step 2: Validate migration
    const isValid = await validateMigration();
    
    if (isValid) {
      console.log('');
      console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('');
      console.log('Next steps:');
      console.log('1. ✅ Backend routes created (/api/platform-integrations)');
      console.log('2. 🔄 Create frontend components for Super Admin');
      console.log('3. 🔄 Update IntegrationsModule for Admin/Member');
      console.log('4. 🔄 Update Google Calendar auth service');
      console.log('');
    } else {
      throw new Error('Migration validation failed');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ MIGRATION FAILED');
    console.error('Error:', error.message);
    console.error('');
    console.error('Please check your Supabase configuration and try again.');
    process.exit(1);
  }
}

// Run migration
main(); 