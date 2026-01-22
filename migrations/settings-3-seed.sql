-- ============================================
-- BLOCO 3: SEED DATA
-- ============================================

-- Inserir configuração padrão da organização
INSERT INTO public.organization_settings (company_name, primary_color, timezone_default)
SELECT 'Tentáculo Flow', '#2db4af', 'America/Sao_Paulo'
WHERE NOT EXISTS (SELECT 1 FROM public.organization_settings);

-- Inserir configuração padrão de notificações
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
