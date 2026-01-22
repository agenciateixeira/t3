-- ============================================
-- BLOCO 2: RLS E POLÍTICAS
-- ============================================

-- Habilitar RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ORGANIZATION SETTINGS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins podem ver configurações da organização" ON public.organization_settings;
DROP POLICY IF EXISTS "Admins podem atualizar configurações da organização" ON public.organization_settings;
DROP POLICY IF EXISTS "Admins podem inserir configurações da organização" ON public.organization_settings;

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

-- ============================================
-- ROLE PERMISSIONS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins podem ver permissões" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins podem gerenciar permissões" ON public.role_permissions;

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

-- ============================================
-- PIPELINES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Todos podem ver pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Admins podem gerenciar pipelines" ON public.pipelines;

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

-- ============================================
-- PIPELINE STAGES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Todos podem ver etapas de pipeline" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Admins podem gerenciar etapas de pipeline" ON public.pipeline_stages;

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

-- ============================================
-- NOTIFICATION SETTINGS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins podem ver configurações de notificação" ON public.notification_settings;
DROP POLICY IF EXISTS "Admins podem gerenciar configurações de notificação" ON public.notification_settings;

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

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins podem ver audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Sistema pode inserir audit logs" ON public.audit_logs;

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

DROP TRIGGER IF EXISTS set_organization_settings_updated_at ON public.organization_settings;
DROP TRIGGER IF EXISTS set_role_permissions_updated_at ON public.role_permissions;
DROP TRIGGER IF EXISTS set_pipelines_updated_at ON public.pipelines;
DROP TRIGGER IF EXISTS set_pipeline_stages_updated_at ON public.pipeline_stages;
DROP TRIGGER IF EXISTS set_notification_settings_updated_at ON public.notification_settings;

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
