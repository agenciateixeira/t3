-- ============================================
-- Pipeline CRM System - Complete Schema
-- ============================================
-- This schema creates a fully customizable pipeline/CRM system
-- where users can create multiple pipelines with custom stages and fields

-- ============================================
-- 1. PIPELINES TABLE
-- ============================================
-- Main pipeline configuration (e.g., "Vendas", "Projetos", "Recrutamento")
CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Emoji or icon name
  color TEXT DEFAULT '#2db4af',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PIPELINE STAGES TABLE
-- ============================================
-- Customizable stages for each pipeline (e.g., "Prospecção", "Negociação", "Fechado")
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#94a3b8',
  position INTEGER NOT NULL DEFAULT 0,
  is_final BOOLEAN DEFAULT false, -- Marks stage as "won" or "lost"
  stage_type TEXT CHECK (stage_type IN ('active', 'won', 'lost')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pipeline_id, position)
);

-- ============================================
-- 3. PIPELINE FIELD DEFINITIONS TABLE
-- ============================================
-- Custom fields that can be added to pipeline stages or deals
CREATE TABLE IF NOT EXISTS public.pipeline_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE CASCADE, -- NULL = applies to all stages
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'number', 'currency', 'date', 'datetime', 'email', 'phone',
    'url', 'select', 'multiselect', 'checkbox', 'textarea', 'cnpj', 'cpf',
    'percentage', 'user', 'client', 'file'
  )),
  field_options JSONB, -- For select/multiselect: ["Option 1", "Option 2"]
  is_required BOOLEAN DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  default_value TEXT,
  placeholder TEXT,
  help_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. DEALS TABLE (Opportunities/Cards)
-- ============================================
-- Individual deals/opportunities in the pipeline
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  value DECIMAL(15, 2), -- Deal value/revenue
  currency TEXT DEFAULT 'BRL',
  probability INTEGER DEFAULT 50, -- 0-100%
  expected_close_date DATE,
  actual_close_date DATE,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  position INTEGER DEFAULT 0, -- Position within stage for ordering
  card_color TEXT DEFAULT '#ffffff',
  tags TEXT[], -- Array of tags

  -- Activity tracking
  last_activity_at TIMESTAMPTZ,
  last_activity_type TEXT,

  -- Metadata
  source TEXT, -- Lead source: "website", "referral", "cold_call", etc.
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. DEAL FIELD VALUES TABLE
-- ============================================
-- Stores custom field values for each deal
CREATE TABLE IF NOT EXISTS public.deal_field_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.pipeline_fields(id) ON DELETE CASCADE,
  value TEXT, -- Stores all values as text (JSON for complex types)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, field_id)
);

-- ============================================
-- 6. DEAL ACTIVITIES TABLE
-- ============================================
-- Activity log for deals (notes, calls, meetings, emails)
CREATE TABLE IF NOT EXISTS public.deal_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'note', 'call', 'meeting', 'email', 'task', 'status_change', 'stage_change', 'field_update'
  )),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB, -- Flexible storage for activity details
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. DEAL ATTACHMENTS TABLE
-- ============================================
-- File attachments for deals
CREATE TABLE IF NOT EXISTS public.deal_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER, -- bytes
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. DEAL CHECKLISTS TABLE
-- ============================================
-- Subtasks and checklists for deals
CREATE TABLE IF NOT EXISTS public.deal_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deal_checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.deal_checklists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pipelines_team ON public.pipelines(team_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_created_by ON public.pipelines(created_by);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON public.pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_position ON public.pipeline_stages(pipeline_id, position);

CREATE INDEX IF NOT EXISTS idx_pipeline_fields_pipeline ON public.pipeline_fields(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_fields_stage ON public.pipeline_fields(stage_id);

CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON public.deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_client ON public.deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_assignee ON public.deals(assignee_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_by ON public.deals(created_by);
CREATE INDEX IF NOT EXISTS idx_deals_position ON public.deals(stage_id, position);

CREATE INDEX IF NOT EXISTS idx_deal_field_values_deal ON public.deal_field_values(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_field_values_field ON public.deal_field_values(field_id);

CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON public.deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_user ON public.deal_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_scheduled ON public.deal_activities(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_deal_attachments_deal ON public.deal_attachments(deal_id);

CREATE INDEX IF NOT EXISTS idx_deal_checklists_deal ON public.deal_checklists(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_checklist_items_checklist ON public.deal_checklist_items(checklist_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON public.pipelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_fields_updated_at BEFORE UPDATE ON public.pipeline_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deal_field_values_updated_at BEFORE UPDATE ON public.deal_field_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users can access their team's data)
CREATE POLICY "Users can view pipelines from their team" ON public.pipelines
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert pipelines for their team" ON public.pipelines
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update pipelines from their team" ON public.pipelines
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete pipelines from their team" ON public.pipelines
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

-- Similar policies for other tables (inherit from pipeline)
CREATE POLICY "Users can view pipeline stages" ON public.pipeline_stages
  FOR SELECT USING (
    pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage pipeline stages" ON public.pipeline_stages
  FOR ALL USING (
    pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view pipeline fields" ON public.pipeline_fields
  FOR SELECT USING (
    pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage pipeline fields" ON public.pipeline_fields
  FOR ALL USING (
    pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view deals" ON public.deals
  FOR SELECT USING (
    pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage deals" ON public.deals
  FOR ALL USING (
    pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Similar policies for child tables
CREATE POLICY "Users can view deal field values" ON public.deal_field_values
  FOR SELECT USING (
    deal_id IN (SELECT id FROM public.deals WHERE pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    ))
  );

CREATE POLICY "Users can manage deal field values" ON public.deal_field_values
  FOR ALL USING (
    deal_id IN (SELECT id FROM public.deals WHERE pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    ))
  );

CREATE POLICY "Users can view deal activities" ON public.deal_activities
  FOR SELECT USING (
    deal_id IN (SELECT id FROM public.deals WHERE pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    ))
  );

CREATE POLICY "Users can manage deal activities" ON public.deal_activities
  FOR ALL USING (
    deal_id IN (SELECT id FROM public.deals WHERE pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    ))
  );

CREATE POLICY "Users can view deal attachments" ON public.deal_attachments
  FOR SELECT USING (
    deal_id IN (SELECT id FROM public.deals WHERE pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    ))
  );

CREATE POLICY "Users can manage deal attachments" ON public.deal_attachments
  FOR ALL USING (
    deal_id IN (SELECT id FROM public.deals WHERE pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    ))
  );

CREATE POLICY "Users can view deal checklists" ON public.deal_checklists
  FOR SELECT USING (
    deal_id IN (SELECT id FROM public.deals WHERE pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    ))
  );

CREATE POLICY "Users can manage deal checklists" ON public.deal_checklists
  FOR ALL USING (
    deal_id IN (SELECT id FROM public.deals WHERE pipeline_id IN (
      SELECT id FROM public.pipelines WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    ))
  );

CREATE POLICY "Users can view deal checklist items" ON public.deal_checklist_items
  FOR SELECT USING (
    checklist_id IN (SELECT id FROM public.deal_checklists WHERE deal_id IN (
      SELECT id FROM public.deals WHERE pipeline_id IN (
        SELECT id FROM public.pipelines WHERE team_id IN (
          SELECT team_id FROM public.profiles WHERE id = auth.uid()
        )
      )
    ))
  );

CREATE POLICY "Users can manage deal checklist items" ON public.deal_checklist_items
  FOR ALL USING (
    checklist_id IN (SELECT id FROM public.deal_checklists WHERE deal_id IN (
      SELECT id FROM public.deals WHERE pipeline_id IN (
        SELECT id FROM public.pipelines WHERE team_id IN (
          SELECT team_id FROM public.profiles WHERE id = auth.uid()
        )
      )
    ))
  );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.pipelines IS 'Main pipeline configurations (e.g., Sales, Projects, HR)';
COMMENT ON TABLE public.pipeline_stages IS 'Customizable stages for each pipeline';
COMMENT ON TABLE public.pipeline_fields IS 'Custom field definitions for pipelines';
COMMENT ON TABLE public.deals IS 'Individual opportunities/deals in pipelines';
COMMENT ON TABLE public.deal_field_values IS 'Custom field values for each deal';
COMMENT ON TABLE public.deal_activities IS 'Activity log for deals (notes, calls, meetings)';
COMMENT ON TABLE public.deal_attachments IS 'File attachments for deals';
COMMENT ON TABLE public.deal_checklists IS 'Checklists for deals';
COMMENT ON TABLE public.deal_checklist_items IS 'Individual checklist items';
