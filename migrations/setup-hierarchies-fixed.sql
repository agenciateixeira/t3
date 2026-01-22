-- Sistema de Hierarquias e Permissões T3ntaculos - ORDEM CORRIGIDA

-- 1. Criar enum para tipos de hierarquia
DO $$ BEGIN
  CREATE TYPE user_hierarchy AS ENUM (
    'admin',           -- ADM Principal (Vanessa)
    'team_manager',    -- Gerente de Time
    'strategy',        -- Estratégia
    'traffic_manager', -- Gestor de Tráfego
    'social_media',    -- Social Media
    'designer'         -- Designer
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Criar tabela de times PRIMEIRO
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DEPOIS atualizar tabela profiles para incluir hierarquia
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hierarchy user_hierarchy DEFAULT 'designer',
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- 4. AGORA adicionar a foreign key do manager na tabela teams
ALTER TABLE public.teams
  ADD CONSTRAINT teams_manager_id_fkey
  FOREIGN KEY (manager_id)
  REFERENCES public.profiles(id);

-- 5. Criar tabela de ferramentas
CREATE TABLE IF NOT EXISTS public.tools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  icon TEXT,
  category TEXT,
  instructions TEXT, -- Como usar a ferramenta
  required_hierarchy user_hierarchy[] DEFAULT ARRAY['admin']::user_hierarchy[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Criar tabela de solicitações de acesso
CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  tool_id UUID REFERENCES public.tools(id) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

-- 7. Criar tabela de acessos concedidos
CREATE TABLE IF NOT EXISTS public.user_tool_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  tool_id UUID REFERENCES public.tools(id) NOT NULL,
  granted_by UUID REFERENCES public.profiles(id) NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, tool_id)
);

-- 8. Criar tabela de grupos de chat ANTES de messages
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Criar tabela de mensagens para o chat
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT, -- audio, image, video
  group_id UUID REFERENCES public.chat_groups(id),
  recipient_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Criar tabela de membros de grupos
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.chat_groups(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  role TEXT DEFAULT 'member', -- admin, member
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 11. Criar tabela de leituras de mensagens (para visualização)
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- 12. Atualizar tabela tasks para incluir data e horário específico
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- 13. Enable RLS nas novas tabelas
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tool_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- 14. Políticas RLS para teams
DROP POLICY IF EXISTS "Usuários podem ver seus próprios times" ON public.teams;
CREATE POLICY "Usuários podem ver seus próprios times"
  ON public.teams FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE team_id = teams.id
    ) OR auth.uid() = manager_id
  );

DROP POLICY IF EXISTS "Gerentes podem atualizar seus times" ON public.teams;
CREATE POLICY "Gerentes podem atualizar seus times"
  ON public.teams FOR UPDATE
  USING (auth.uid() = manager_id);

DROP POLICY IF EXISTS "Admin pode fazer tudo em times" ON public.teams;
CREATE POLICY "Admin pode fazer tudo em times"
  ON public.teams FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE hierarchy = 'admin'
    )
  );

-- 15. Políticas RLS para tools
DROP POLICY IF EXISTS "Usuários autenticados podem ver ferramentas" ON public.tools;
CREATE POLICY "Usuários autenticados podem ver ferramentas"
  ON public.tools FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin pode gerenciar ferramentas" ON public.tools;
CREATE POLICY "Admin pode gerenciar ferramentas"
  ON public.tools FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE hierarchy = 'admin'
    )
  );

-- 16. Políticas RLS para access_requests
DROP POLICY IF EXISTS "Usuários podem ver suas próprias solicitações" ON public.access_requests;
CREATE POLICY "Usuários podem ver suas próprias solicitações"
  ON public.access_requests FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = reviewed_by);

DROP POLICY IF EXISTS "Usuários podem criar solicitações" ON public.access_requests;
CREATE POLICY "Usuários podem criar solicitações"
  ON public.access_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin pode revisar solicitações" ON public.access_requests;
CREATE POLICY "Admin pode revisar solicitações"
  ON public.access_requests FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE hierarchy = 'admin'
    )
  );

-- 17. Políticas RLS para messages
DROP POLICY IF EXISTS "Usuários podem ver mensagens de seus grupos" ON public.messages;
CREATE POLICY "Usuários podem ver mensagens de seus grupos"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR auth.uid() IN (
      SELECT user_id FROM public.group_members WHERE group_id = messages.group_id
    )
  );

DROP POLICY IF EXISTS "Usuários podem enviar mensagens" ON public.messages;
CREATE POLICY "Usuários podem enviar mensagens"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- 18. Políticas RLS para chat_groups
DROP POLICY IF EXISTS "Membros podem ver seus grupos" ON public.chat_groups;
CREATE POLICY "Membros podem ver seus grupos"
  ON public.chat_groups FOR SELECT
  USING (
    auth.uid() = created_by
    OR auth.uid() IN (
      SELECT user_id FROM public.group_members WHERE group_id = chat_groups.id
    )
  );

DROP POLICY IF EXISTS "Usuários podem criar grupos" ON public.chat_groups;
CREATE POLICY "Usuários podem criar grupos"
  ON public.chat_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Criadores podem atualizar grupos" ON public.chat_groups;
CREATE POLICY "Criadores podem atualizar grupos"
  ON public.chat_groups FOR UPDATE
  USING (auth.uid() = created_by);

-- 19. Políticas RLS para group_members
DROP POLICY IF EXISTS "Membros podem ver membros do grupo" ON public.group_members;
CREATE POLICY "Membros podem ver membros do grupo"
  ON public.group_members FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.group_members gm WHERE gm.group_id = group_members.group_id
    )
  );

DROP POLICY IF EXISTS "Admin do grupo pode adicionar membros" ON public.group_members;
CREATE POLICY "Admin do grupo pode adicionar membros"
  ON public.group_members FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM public.chat_groups WHERE id = group_id
    )
  );

DROP POLICY IF EXISTS "Admin do grupo pode remover membros" ON public.group_members;
CREATE POLICY "Admin do grupo pode remover membros"
  ON public.group_members FOR DELETE
  USING (
    auth.uid() IN (
      SELECT created_by FROM public.chat_groups WHERE id = group_id
    )
  );

-- 20. Inserir ferramentas padrão
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

-- 21. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 22. Criar triggers para updated_at
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

-- 23. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
