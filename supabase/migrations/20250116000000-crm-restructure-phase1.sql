-- =====================================================
-- CRM RESTRUCTURE - PHASE 1: INCREMENTAL MIGRATION
-- Seguindo padrão Salesforce/HubSpot/Pipedrive
-- Zero-downtime migration strategy
-- =====================================================

-- ============================================
-- STEP 1: ADD NEW STRUCTURE (Keep old working)
-- ============================================

-- 1.1 Create companies table (Multi-tenant structure)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 Add new columns to existing tables (ADDITIVE ONLY)
-- Add company_id to users (for proper multi-tenancy)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_id') THEN
    ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(id);
  END IF;
END $$;

-- Add manager_id for hierarchy
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'manager_id') THEN
    ALTER TABLE users ADD COLUMN manager_id UUID REFERENCES users(id);
  END IF;
END $$;

-- Add team_id for grouping
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'team_id') THEN
    ALTER TABLE users ADD COLUMN team_id UUID;
  END IF;
END $$;

-- Add name column (combining first_name + last_name)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') THEN
    ALTER TABLE users ADD COLUMN name VARCHAR(255);
  END IF;
END $$;

-- 1.3 Add new columns to pipelines
-- Add company_id to pipelines (replace tenant_id concept)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipelines' AND column_name = 'company_id') THEN
    ALTER TABLE pipelines ADD COLUMN company_id UUID REFERENCES companies(id);
  END IF;
END $$;

-- 1.4 Create NEW leads table with proper structure (Keep old pipeline_leads)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id),
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  owner_id UUID NOT NULL REFERENCES users(id), -- Single owner (Salesforce pattern)
  
  -- Lead data
  title VARCHAR(255) NOT NULL DEFAULT 'Lead sem título',
  value DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'BRL',
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  
  -- Contact information
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  company_name VARCHAR(255),
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'manual',
  custom_data JSONB DEFAULT '{}',
  
  -- Audit fields
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE DEFAULT DATA
-- ============================================

-- 2.1 Create default company
INSERT INTO companies (id, name) 
VALUES ('dc2f1fc5-53b5-4f54-bb56-009f58481b97', 'Empresa Padrão')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 3: MIGRATE EXISTING DATA
-- ============================================

-- 3.1 Update users with company_id and name
UPDATE users 
SET 
  company_id = 'dc2f1fc5-53b5-4f54-bb56-009f58481b97',
  name = COALESCE(
    NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''),
    email
  )
WHERE company_id IS NULL;

-- 3.2 Update pipelines with company_id
UPDATE pipelines 
SET company_id = 'dc2f1fc5-53b5-4f54-bb56-009f58481b97'
WHERE company_id IS NULL;

-- 3.3 Migrate pipeline_leads to new leads table
INSERT INTO leads (
  id, company_id, pipeline_id, stage_id, owner_id,
  title, contact_name, contact_email, contact_phone, company_name,
  custom_data, created_by, created_at, updated_at, last_activity_at
)
SELECT 
  pl.id,
  'dc2f1fc5-53b5-4f54-bb56-009f58481b97' as company_id,
  pl.pipeline_id,
  pl.stage_id,
  COALESCE(pl.assigned_to, pl.created_by) as owner_id, -- assigned_to becomes owner_id
  
  -- Extract title from lead_data
  COALESCE(
    pl.lead_data->>'nome_lead',
    pl.lead_data->>'nome_oportunidade', 
    pl.lead_data->>'title',
    'Lead sem título'
  ) as title,
  
  -- Extract contact info
  pl.lead_data->>'nome_lead' as contact_name,
  pl.lead_data->>'email' as contact_email,
  COALESCE(pl.lead_data->>'telefone', pl.lead_data->>'phone') as contact_phone,
  COALESCE(pl.lead_data->>'empresa', pl.lead_data->>'company') as company_name,
  
  -- Keep original custom_data
  pl.lead_data as custom_data,
  pl.created_by,
  pl.created_at,
  pl.updated_at,
  COALESCE(pl.moved_at, pl.updated_at) as last_activity_at
FROM pipeline_leads pl
WHERE NOT EXISTS (
  SELECT 1 FROM leads l WHERE l.id = pl.id
);

-- ============================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

-- Users new indexes
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Pipelines new indexes
CREATE INDEX IF NOT EXISTS idx_pipelines_company_id ON pipelines(company_id);

-- Leads indexes (NEW TABLE)
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_id ON leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_contact_email ON leads(contact_email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(last_activity_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_owner ON leads(pipeline_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_pipeline ON leads(company_id, pipeline_id);

-- ============================================
-- STEP 5: UPDATE RLS POLICIES (SIMPLIFIED)
-- ============================================

-- Enable RLS on new tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies (company isolation)
CREATE POLICY "company_isolation_companies" ON companies 
FOR ALL USING (
  id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "company_isolation_leads" ON leads 
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Update existing policies to use company_id
DROP POLICY IF EXISTS "users_access_policy" ON users;
CREATE POLICY "company_isolation_users" ON users 
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ) OR auth.uid() IS NULL -- Allow for system operations
);

DROP POLICY IF EXISTS "pipelines_access_policy" ON pipelines;
CREATE POLICY "company_isolation_pipelines" ON pipelines 
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ) OR auth.uid() IS NULL -- Allow for system operations
);

-- ============================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- ============================================

-- Function to get user role and company
CREATE OR REPLACE FUNCTION get_user_context()
RETURNS TABLE (
  user_id UUID,
  company_id UUID,
  user_role TEXT,
  user_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.company_id,
    u.role as user_role,
    u.name as user_name
  FROM users u
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view all company leads
CREATE OR REPLACE FUNCTION can_view_all_leads()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid();
  
  RETURN user_role IN ('super_admin', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 7: CREATE TRIGGERS
-- ============================================

-- Trigger to update updated_at on companies
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at 
  BEFORE UPDATE ON leads 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update last_activity_at when lead is updated
CREATE OR REPLACE FUNCTION update_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_activity 
  BEFORE UPDATE ON leads 
  FOR EACH ROW EXECUTE FUNCTION update_lead_activity();

-- ============================================
-- STEP 8: VALIDATION QUERIES
-- ============================================

-- Verify migration success
DO $$
DECLARE
  old_leads_count INTEGER;
  new_leads_count INTEGER;
  users_with_company INTEGER;
  pipelines_with_company INTEGER;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO old_leads_count FROM pipeline_leads;
  SELECT COUNT(*) INTO new_leads_count FROM leads;
  SELECT COUNT(*) INTO users_with_company FROM users WHERE company_id IS NOT NULL;
  SELECT COUNT(*) INTO pipelines_with_company FROM pipelines WHERE company_id IS NOT NULL;
  
  -- Log results
  RAISE NOTICE 'Migration Phase 1 Complete:';
  RAISE NOTICE '- Old leads: %, New leads: %', old_leads_count, new_leads_count;
  RAISE NOTICE '- Users with company: %', users_with_company;
  RAISE NOTICE '- Pipelines with company: %', pipelines_with_company;
  
  -- Validate critical data
  IF new_leads_count = 0 AND old_leads_count > 0 THEN
    RAISE EXCEPTION 'Lead migration failed: no leads migrated';
  END IF;
  
  IF users_with_company = 0 THEN
    RAISE EXCEPTION 'User migration failed: no users have company_id';
  END IF;
END $$;

-- ============================================
-- MIGRATION PHASE 1 COMPLETE
-- ============================================

-- Summary:
-- ✅ Added new structure (companies, leads table)
-- ✅ Migrated existing data (pipeline_leads -> leads)
-- ✅ Added proper indexes for performance
-- ✅ Simplified RLS policies
-- ✅ Created helper functions
-- ✅ Kept old structure working (zero downtime)
-- 
-- Next Phase: Update backend services to use new structure
-- Then Phase: Update frontend to use new APIs
-- Finally: Remove old structure (pipeline_leads, pipeline_members) 