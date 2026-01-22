-- ============================================
-- SYSTEM SETTINGS - ORGANIZATION LEVEL
-- ============================================
-- Execute este SQL para criar todas as tabelas de configurações
-- do sistema (organização, permissões, pipelines, notificações, auditoria)
-- ============================================

-- 1. ORGANIZATION SETTINGS (Configurações Gerais da Organização)
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL DEFAULT 'Minha Empresa',
  company_logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#2db4af',
  timezone_default VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ROLE PERMISSIONS (RBAC - Controle de Acesso Baseado em Funções)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role VARCHAR(50) PRIMARY KEY,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PIPELINES (Funis de Vendas)
CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(10) DEFAULT '📊',
  color VARCHAR(7) DEFAULT '#2db4af',
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. PIPELINE STAGES (Etapas dos Funis)
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1',
  position INTEGER DEFAULT 0,
  is_final BOOLEAN DEFAULT false,
  is_won BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. NOTIFICATION SETTINGS (Configurações de Notificações)
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_enabled BOOLEAN DEFAULT true,
  notify_task_created BOOLEAN DEFAULT true,
  notify_task_overdue BOOLEAN DEFAULT true,
  notify_pipeline_stage_changed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. AUDIT LOGS (Logs de Auditoria)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - APENAS ADMIN
-- ============================================

-- ORGANIZATION SETTINGS: Apenas admin pode gerenciar
CREATE POLICY "Admins podem ver configurações da organização"
  ON public.organization_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

CREATE POLICY "Admins podem atualizar configurações da organização"
  ON public.organization_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

CREATE POLICY "Admins podem inserir configurações da organização"
  ON public.organization_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

-- ROLE PERMISSIONS: Apenas admin pode gerenciar
CREATE POLICY "Admins podem ver permissões"
  ON public.role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

CREATE POLICY "Admins podem gerenciar permissões"
  ON public.role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

-- PIPELINES: Todos podem ver, apenas admin pode gerenciar
CREATE POLICY "Todos podem ver pipelines"
  ON public.pipelines FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar pipelines"
  ON public.pipelines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

-- PIPELINE STAGES: Todos podem ver, apenas admin pode gerenciar
CREATE POLICY "Todos podem ver etapas de pipeline"
  ON public.pipeline_stages FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar etapas de pipeline"
  ON public.pipeline_stages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

-- NOTIFICATION SETTINGS: Apenas admin pode gerenciar
CREATE POLICY "Admins podem ver configurações de notificação"
  ON public.notification_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

CREATE POLICY "Admins podem gerenciar configurações de notificação"
  ON public.notification_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

-- AUDIT LOGS: Apenas admin pode ver, ninguém pode deletar
CREATE POLICY "Admins podem ver audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

CREATE POLICY "Sistema pode inserir audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- TRIGGERS PARA updated_at
-- ============================================

CREATE TRIGGER set_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_pipelines_updated_at
  BEFORE UPDATE ON public.pipelines
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- SEED DATA INICIAL
-- ============================================

-- Inserir configuração padrão da organização (se não existir)
INSERT INTO public.organization_settings (company_name, primary_color, timezone_default)
SELECT 'Tentáculo Flow', '#2db4af', 'America/Sao_Paulo'
WHERE NOT EXISTS (SELECT 1 FROM public.organization_settings);

-- Inserir configuração padrão de notificações (se não existir)
INSERT INTO public.notification_settings (email_enabled, notify_task_created, notify_task_overdue, notify_pipeline_stage_changed)
SELECT true, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.notification_settings);

-- Inserir roles padrão com permissões
INSERT INTO public.role_permissions (role, permissions, description)
VALUES
  ('admin', '{
    "clients": {"view": true, "create": true, "edit": true, "delete": true},
    "tools": {"view": true, "create": true, "edit": true, "delete": true},
    "pipelines": {"view": true, "create": true, "edit": true, "delete": true},
    "employees": {"view": true, "create": true, "edit": true, "delete": true},
    "settings": {"view": true, "edit": true}
  }'::jsonb, 'Administrador - Acesso total'),

  ('team_manager', '{
    "clients": {"view": true, "create": true, "edit": true, "delete": false},
    "tools": {"view": true, "create": true, "edit": true, "delete": false},
    "pipelines": {"view": true, "create": true, "edit": true, "delete": false},
    "employees": {"view": true, "create": false, "edit": false, "delete": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb, 'Gerente de Time - Gerencia equipe'),

  ('strategy', '{
    "clients": {"view": true, "create": true, "edit": true, "delete": false},
    "tools": {"view": true, "create": true, "edit": true, "delete": false},
    "pipelines": {"view": true, "create": true, "edit": true, "delete": false},
    "employees": {"view": true, "create": false, "edit": false, "delete": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb, 'Estrategista - Planeja estratégias'),

  ('traffic_manager', '{
    "clients": {"view": true, "create": false, "edit": true, "delete": false},
    "tools": {"view": true, "create": true, "edit": true, "delete": false},
    "pipelines": {"view": true, "create": false, "edit": true, "delete": false},
    "employees": {"view": true, "create": false, "edit": false, "delete": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb, 'Gestor de Tráfego - Gerencia tráfego pago'),

  ('social_media', '{
    "clients": {"view": true, "create": false, "edit": true, "delete": false},
    "tools": {"view": true, "create": true, "edit": true, "delete": false},
    "pipelines": {"view": true, "create": false, "edit": false, "delete": false},
    "employees": {"view": true, "create": false, "edit": false, "delete": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb, 'Social Media - Gerencia redes sociais'),

  ('designer', '{
    "clients": {"view": true, "create": false, "edit": false, "delete": false},
    "tools": {"view": true, "create": true, "edit": true, "delete": false},
    "pipelines": {"view": true, "create": false, "edit": false, "delete": false},
    "employees": {"view": true, "create": false, "edit": false, "delete": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb, 'Designer - Cria peças visuais'),

  ('audiovisual', '{
    "clients": {"view": true, "create": false, "edit": false, "delete": false},
    "tools": {"view": true, "create": true, "edit": true, "delete": false},
    "pipelines": {"view": true, "create": false, "edit": false, "delete": false},
    "employees": {"view": true, "create": false, "edit": false, "delete": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb, 'Audiovisual - Produz vídeos')
ON CONFLICT (role) DO NOTHING;

-- ============================================
-- STORAGE BUCKET PARA LOGOS
-- ============================================
-- IMPORTANTE: Criar bucket 'org-logos' manualmente no Dashboard
-- depois executar as políticas abaixo:

/*
DROP POLICY IF EXISTS "Admins podem fazer upload de logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar logos" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver logos" ON storage.objects;

CREATE POLICY "Admins podem fazer upload de logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

CREATE POLICY "Admins podem atualizar logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-logos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

CREATE POLICY "Admins podem deletar logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-logos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

CREATE POLICY "Todos podem ver logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');
*/

-- ============================================
-- DONE!
-- ============================================
