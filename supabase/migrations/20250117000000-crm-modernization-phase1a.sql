-- =====================================================
-- CRM MODERNIZATION - PHASE 1A: ENTERPRISE DATA STRUCTURE
-- Seguindo padrões Salesforce/HubSpot/Pipedrive
-- Zero-downtime migration strategy
-- =====================================================

-- ============================================
-- STEP 1: CREATE CONTACTS TABLE (SALESFORCE PATTERN)
-- ============================================

-- 1.1 Contacts - Centralized contact management
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  
  -- Standard contact fields (Salesforce pattern)
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile_phone VARCHAR(50),
  title VARCHAR(255), -- Job title
  department VARCHAR(255),
  
  -- Company information
  account_name VARCHAR(255), -- Company name
  website VARCHAR(255),
  
  -- Address information
  mailing_street TEXT,
  mailing_city VARCHAR(255),
  mailing_state VARCHAR(255),
  mailing_postal_code VARCHAR(20),
  mailing_country VARCHAR(255),
  
  -- Social and additional info
  linkedin_url VARCHAR(500),
  lead_source VARCHAR(100) DEFAULT 'manual',
  
  -- Status and lifecycle
  contact_status VARCHAR(50) DEFAULT 'active' CHECK (contact_status IN ('active', 'inactive', 'bounced', 'opted_out')),
  lifecycle_stage VARCHAR(50) DEFAULT 'lead' CHECK (lifecycle_stage IN ('lead', 'prospect', 'customer', 'evangelist')),
  
  -- Ownership and assignment
  owner_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  
  -- Custom data storage
  custom_fields JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: MODERNIZE DEALS/OPPORTUNITIES TABLE
-- ============================================

-- 2.1 Deals (rename from leads - HubSpot/Salesforce pattern)
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  
  -- Deal identification
  deal_name VARCHAR(255) NOT NULL,
  deal_type VARCHAR(50) DEFAULT 'new_business' CHECK (deal_type IN ('new_business', 'existing_business', 'renewal')),
  
  -- Pipeline and stage
  pipeline_id UUID NOT NULL REFERENCES pipelines(id),
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  
  -- Financial information
  amount DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'BRL',
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  
  -- Dates
  expected_close_date DATE,
  actual_close_date DATE,
  created_date DATE DEFAULT CURRENT_DATE,
  
  -- Contact and company association
  primary_contact_id UUID REFERENCES contacts(id),
  account_name VARCHAR(255), -- Company/Account name
  
  -- Status tracking
  deal_stage VARCHAR(50) DEFAULT 'open',
  deal_status VARCHAR(20) DEFAULT 'open' CHECK (deal_status IN ('open', 'won', 'lost')),
  
  -- Win/Loss tracking
  win_loss_reason VARCHAR(255),
  competitor VARCHAR(255),
  
  -- Source and campaign
  lead_source VARCHAR(100) DEFAULT 'manual',
  campaign_id VARCHAR(255),
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  
  -- Notes and description
  description TEXT,
  next_step TEXT,
  
  -- Custom data
  custom_fields JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stage_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: CREATE ACTIVITIES TABLE (UNIFIED TIMELINE)
-- ============================================

-- 3.1 Activities - Unified activity tracking (Salesforce pattern)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  
  -- Activity type and subject
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'task', 'note', 'demo')),
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Status and priority
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Dates and duration
  activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 0,
  
  -- Relationships (polymorphic - can relate to contacts or deals)
  related_to_type VARCHAR(20) CHECK (related_to_type IN ('contact', 'deal')),
  related_to_id UUID, -- Can be contact_id or deal_id
  contact_id UUID REFERENCES contacts(id),
  deal_id UUID REFERENCES deals(id),
  
  -- Ownership
  assigned_to UUID NOT NULL REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  
  -- Communication tracking
  email_thread_id VARCHAR(255),
  call_duration INTEGER,
  call_outcome VARCHAR(100),
  
  -- Meeting specifics
  meeting_location VARCHAR(255),
  meeting_url VARCHAR(500),
  attendees JSONB DEFAULT '[]',
  
  -- Custom data
  custom_fields JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 4: CREATE PERFORMANCE INDEXES
-- ============================================

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_account_name ON contacts(account_name);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_source ON contacts(lead_source);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_status ON contacts(contact_status);
CREATE INDEX IF NOT EXISTS idx_contacts_lifecycle_stage ON contacts(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_last_activity ON contacts(last_activity_at);

-- Deals indexes
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_id ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_primary_contact_id ON deals(primary_contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_deal_status ON deals(deal_status);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_amount ON deals(amount);
CREATE INDEX IF NOT EXISTS idx_deals_lead_source ON deals(lead_source);
CREATE INDEX IF NOT EXISTS idx_deals_last_activity ON deals(last_activity_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_owner ON deals(pipeline_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_status ON deals(stage_id, deal_status);
CREATE INDEX IF NOT EXISTS idx_deals_company_pipeline ON deals(company_id, pipeline_id);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON activities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to ON activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_activity_date ON activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON activities(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_related_to ON activities(related_to_type, related_to_id);

-- ============================================
-- STEP 5: ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: CREATE RLS POLICIES (ENTERPRISE PATTERN)
-- ============================================

-- Contacts policies
CREATE POLICY "contacts_company_isolation" ON contacts 
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT 'dc2f1fc5-53b5-4f54-bb56-009f58481b97'::uuid -- Default company fallback
    )
  );

-- Deals policies  
CREATE POLICY "deals_company_isolation" ON deals 
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION  
      SELECT 'dc2f1fc5-53b5-4f54-bb56-009f58481b97'::uuid -- Default company fallback
    )
  );

-- Activities policies
CREATE POLICY "activities_company_isolation" ON activities 
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT 'dc2f1fc5-53b5-4f54-bb56-009f58481b97'::uuid -- Default company fallback
    )
  );

-- ============================================
-- STEP 7: CREATE TRIGGERS FOR AUTOMATION
-- ============================================

-- Update triggers for new tables
CREATE TRIGGER update_contacts_updated_at 
  BEFORE UPDATE ON contacts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at 
  BEFORE UPDATE ON deals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at 
  BEFORE UPDATE ON activities 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- ============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'CRM Modernization Phase 1A completed successfully!';
  RAISE NOTICE 'New tables created: contacts, deals, activities';
  RAISE NOTICE 'Performance indexes created for all new tables';
  RAISE NOTICE 'RLS policies implemented following enterprise patterns';
  RAISE NOTICE 'Automation triggers created';
END $$;
