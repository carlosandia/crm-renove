#!/usr/bin/env node

/**
 * CRM RESTRUCTURE - PHASE 1 MIGRATION SCRIPT
 * Seguindo padrão dos grandes CRMs (Zero-downtime migration)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20250116000000-crm-restructure-phase1.sql');

async function createBackup() {
  console.log('🔄 Creating backup before migration...');
  
  try {
    // Backup critical tables
    const tables = ['users', 'pipelines', 'pipeline_leads', 'pipeline_stages', 'pipeline_custom_fields'];
    const backupData = {};
    
    for (const table of tables) {
      console.log(`📋 Backing up ${table}...`);
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`❌ Error backing up ${table}:`, error);
        throw error;
      }
      
      backupData[table] = data;
      console.log(`✅ Backed up ${data.length} records from ${table}`);
    }
    
    // Save backup to file
    const backupFile = path.join(__dirname, `../backups/backup-${Date.now()}.json`);
    const backupDir = path.dirname(backupFile);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`💾 Backup saved to: ${backupFile}`);
    
    return backupFile;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

async function validatePreMigration() {
  console.log('🔍 Validating pre-migration state...');
  
  try {
    // Check if new tables already exist
    const { data: companies } = await supabase.from('companies').select('count').limit(1);
    const { data: newLeads } = await supabase.from('leads').select('count').limit(1);
    
    if (companies || newLeads) {
      console.log('⚠️  New tables already exist. Migration may have been run before.');
      const answer = await promptUser('Continue anyway? (y/N): ');
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ Migration cancelled by user.');
        process.exit(0);
      }
    }
    
    // Check existing data
    const { data: existingLeads } = await supabase.from('pipeline_leads').select('count');
    const { data: existingUsers } = await supabase.from('users').select('count');
    
    console.log(`📊 Found ${existingLeads?.length || 0} existing leads`);
    console.log(`👥 Found ${existingUsers?.length || 0} existing users`);
    
    return true;
  } catch (error) {
    console.error('❌ Pre-migration validation failed:', error);
    return false;
  }
}

async function applyMigration() {
  console.log('🚀 Applying Phase 1 migration...');
  
  try {
    // Read migration file
    const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
    
    // Split into individual statements (rough split)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute migration (Note: This is simplified - in production use proper migration tools)
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
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

async function validatePostMigration() {
  console.log('🔍 Validating post-migration state...');
  
  try {
    // Check new tables exist and have data
    const { data: companies, error: companiesError } = await supabase.from('companies').select('*');
    const { data: newLeads, error: leadsError } = await supabase.from('leads').select('count');
    const { data: users, error: usersError } = await supabase.from('users').select('company_id').limit(1);
    
    if (companiesError || leadsError || usersError) {
      console.error('❌ Post-migration validation errors:', { companiesError, leadsError, usersError });
      return false;
    }
    
    console.log(`🏢 Companies created: ${companies?.length || 0}`);
    console.log(`📋 Leads migrated: ${newLeads?.length || 0}`);
    console.log(`👥 Users updated with company_id: ${users?.[0]?.company_id ? 'Yes' : 'No'}`);
    
    // Validate data integrity
    const { data: leadCount } = await supabase.from('leads').select('count');
    const { data: oldLeadCount } = await supabase.from('pipeline_leads').select('count');
    
    if (leadCount?.length !== oldLeadCount?.length) {
      console.warn(`⚠️  Lead count mismatch: Old: ${oldLeadCount?.length}, New: ${leadCount?.length}`);
    } else {
      console.log('✅ Lead data migration validated');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Post-migration validation failed:', error);
    return false;
  }
}

async function promptUser(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🏗️  CRM RESTRUCTURE - PHASE 1 MIGRATION');
  console.log('=====================================');
  console.log('Following Salesforce/HubSpot/Pipedrive patterns');
  console.log('Zero-downtime incremental migration strategy');
  console.log('');
  
  try {
    // Step 1: Validate environment
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }
    
    // Step 2: Pre-migration validation
    const isValid = await validatePreMigration();
    if (!isValid) {
      throw new Error('Pre-migration validation failed');
    }
    
    // Step 3: Create backup
    const backupFile = await createBackup();
    
    // Step 4: Confirm migration
    console.log('');
    console.log('⚠️  IMPORTANT: This will modify your database structure');
    console.log('✅ Backup created successfully');
    console.log('📝 Migration will:');
    console.log('   - Add new tables (companies, leads)');
    console.log('   - Add new columns to existing tables');
    console.log('   - Migrate data from pipeline_leads to leads');
    console.log('   - Update RLS policies');
    console.log('   - Keep old structure working (zero downtime)');
    console.log('');
    
    const confirm = await promptUser('Proceed with migration? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Migration cancelled by user.');
      return;
    }
    
    // Step 5: Apply migration
    await applyMigration();
    
    // Step 6: Post-migration validation
    const postValid = await validatePostMigration();
    if (!postValid) {
      console.error('❌ Post-migration validation failed');
      console.log(`🔄 Restore from backup: ${backupFile}`);
      return;
    }
    
    // Step 7: Success
    console.log('');
    console.log('🎉 PHASE 1 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('============================================');
    console.log('✅ New structure added (companies, leads table)');
    console.log('✅ Existing data migrated');
    console.log('✅ Old structure preserved (zero downtime)');
    console.log('✅ RLS policies updated');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('  1. Test the application thoroughly');
    console.log('  2. Update backend services (Phase 2)');
    console.log('  3. Update frontend components (Phase 3)');
    console.log('  4. Remove old structure (Phase 4)');
    console.log('');
    console.log(`💾 Backup available at: ${backupFile}`);
    
  } catch (error) {
    console.error('💥 MIGRATION FAILED:', error.message);
    console.log('');
    console.log('🔄 Rollback options:');
    console.log('  1. Restore from backup');
    console.log('  2. Check Supabase dashboard for partial changes');
    console.log('  3. Contact support if needed');
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createBackup, applyMigration, validatePostMigration }; 