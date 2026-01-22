-- PASSO 1: Criar enum
DO $$ BEGIN
  CREATE TYPE user_hierarchy AS ENUM (
    'admin',
    'team_manager',
    'strategy',
    'traffic_manager',
    'social_media',
    'designer'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- PASSO 2: Criar tabela teams SEM manager_id (para evitar referência circular)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PASSO 3: Adicionar colunas em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hierarchy user_hierarchy DEFAULT 'designer',
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- PASSO 4: AGORA adicionar manager_id em teams
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id);

-- PASSO 5: Ferramentas
CREATE TABLE IF NOT EXISTS public.tools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  icon TEXT,
  category TEXT,
  instructions TEXT,
  required_hierarchy user_hierarchy[] DEFAULT ARRAY['admin']::user_hierarchy[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PASSO 6: Solicitações de acesso
CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  tool_id UUID REFERENCES public.tools(id) NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

-- PASSO 7: Acessos concedidos
CREATE TABLE IF NOT EXISTS public.user_tool_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  tool_id UUID REFERENCES public.tools(id) NOT NULL,
  granted_by UUID REFERENCES public.profiles(id) NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, tool_id)
);

-- PASSO 8: Chat groups
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PASSO 9: Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  group_id UUID REFERENCES public.chat_groups(id),
  recipient_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PASSO 10: Group members
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.chat_groups(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- PASSO 11: Message reads
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- PASSO 12: Atualizar tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- PASSO 13: RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tool_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- PASSO 14: Políticas teams
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
CREATE POLICY "teams_select_policy"
  ON public.teams FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "teams_all_admin" ON public.teams;
CREATE POLICY "teams_all_admin"
  ON public.teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

-- PASSO 15: Políticas tools
DROP POLICY IF EXISTS "tools_select_policy" ON public.tools;
CREATE POLICY "tools_select_policy"
  ON public.tools FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "tools_all_admin" ON public.tools;
CREATE POLICY "tools_all_admin"
  ON public.tools FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

-- PASSO 16: Políticas access_requests
DROP POLICY IF EXISTS "access_requests_select_policy" ON public.access_requests;
CREATE POLICY "access_requests_select_policy"
  ON public.access_requests FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = reviewed_by);

DROP POLICY IF EXISTS "access_requests_insert_policy" ON public.access_requests;
CREATE POLICY "access_requests_insert_policy"
  ON public.access_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "access_requests_update_admin" ON public.access_requests;
CREATE POLICY "access_requests_update_admin"
  ON public.access_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

-- PASSO 17: Políticas user_tool_access
DROP POLICY IF EXISTS "user_tool_access_select_policy" ON public.user_tool_access;
CREATE POLICY "user_tool_access_select_policy"
  ON public.user_tool_access FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_tool_access_all_admin" ON public.user_tool_access;
CREATE POLICY "user_tool_access_all_admin"
  ON public.user_tool_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

-- PASSO 18: Políticas messages
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = messages.group_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- PASSO 19: Políticas chat_groups
DROP POLICY IF EXISTS "chat_groups_select_policy" ON public.chat_groups;
CREATE POLICY "chat_groups_select_policy"
  ON public.chat_groups FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = chat_groups.id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_groups_insert_policy" ON public.chat_groups;
CREATE POLICY "chat_groups_insert_policy"
  ON public.chat_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "chat_groups_update_policy" ON public.chat_groups;
CREATE POLICY "chat_groups_update_policy"
  ON public.chat_groups FOR UPDATE
  USING (auth.uid() = created_by);

-- PASSO 20: Políticas group_members
DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;
CREATE POLICY "group_members_select_policy"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "group_members_insert_policy" ON public.group_members;
CREATE POLICY "group_members_insert_policy"
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_groups
      WHERE id = group_id AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "group_members_delete_policy" ON public.group_members;
CREATE POLICY "group_members_delete_policy"
  ON public.group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_groups
      WHERE id = group_id AND created_by = auth.uid()
    )
  );

-- PASSO 21: Políticas message_reads
DROP POLICY IF EXISTS "message_reads_select_policy" ON public.message_reads;
CREATE POLICY "message_reads_select_policy"
  ON public.message_reads FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "message_reads_insert_policy" ON public.message_reads;
CREATE POLICY "message_reads_insert_policy"
  ON public.message_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- PASSO 22: Inserir ferramentas padrão
INSERT INTO public.tools (name, description, url, category, instructions, required_hierarchy) VALUES
('Meta Ads', 'Gerenciamento de anúncios Facebook e Instagram', 'https://business.facebook.com', 'Tráfego', 'Use para criar, monitorar e otimizar campanhas de Meta Ads. Colete credenciais do cliente antes de acessar.', ARRAY['admin', 'team_manager', 'strategy', 'traffic_manager']::user_hierarchy[]),
('Google Ads', 'Plataforma de anúncios do Google', 'https://ads.google.com', 'Tráfego', 'Acesse para gerenciar campanhas de pesquisa, display e YouTube. Sempre verifique o orçamento diário.', ARRAY['admin', 'team_manager', 'strategy', 'traffic_manager']::user_hierarchy[]),
('Canva', 'Editor de design gráfico', 'https://canva.com', 'Design', 'Crie peças visuais profissionais. Use templates da marca do cliente.', ARRAY['admin', 'team_manager', 'designer', 'social_media']::user_hierarchy[]),
('Photoshop', 'Editor de imagens profissional', NULL, 'Design', 'Software desktop para edição avançada de imagens.', ARRAY['admin', 'team_manager', 'designer']::user_hierarchy[]),
('Instagram Business', 'Gerenciamento de Instagram', 'https://business.instagram.com', 'Social Media', 'Gerencie perfis comerciais, agende posts e visualize insights.', ARRAY['admin', 'team_manager', 'social_media', 'strategy']::user_hierarchy[]),
('Meta Business Suite', 'Gerenciamento Facebook e Instagram', 'https://business.facebook.com', 'Social Media', 'Centralize o gerenciamento de Facebook e Instagram em um só lugar.', ARRAY['admin', 'team_manager', 'social_media', 'strategy']::user_hierarchy[]),
('Google Analytics', 'Análise de dados web', 'https://analytics.google.com', 'BI/Analytics', 'Monitore tráfego, conversões e comportamento do usuário.', ARRAY['admin', 'team_manager', 'strategy', 'traffic_manager']::user_hierarchy[]),
('Looker Studio', 'Dashboards e relatórios', 'https://lookerstudio.google.com', 'BI/Analytics', 'Crie dashboards personalizados para apresentar resultados aos clientes.', ARRAY['admin', 'team_manager', 'strategy', 'traffic_manager']::user_hierarchy[])
ON CONFLICT DO NOTHING;

-- PASSO 23: Função update_updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASSO 24: Triggers
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tools_updated_at ON public.tools;
CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_groups_updated_at ON public.chat_groups;
CREATE TRIGGER update_chat_groups_updated_at BEFORE UPDATE ON public.chat_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PASSO 25: Notificar
NOTIFY pgrst, 'reload schema';
