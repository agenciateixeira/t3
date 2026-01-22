-- ============================================
-- TENTÁCULO FLOW - CONFIGURAÇÃO COMPLETA DO SUPABASE
-- ============================================
-- Execute este script UMA VEZ no SQL Editor do Supabase
-- ============================================

-- ============================================
-- 1. EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. ENUMS E TIPOS
-- ============================================
CREATE TYPE user_role AS ENUM ('admin', 'gerente', 'designer', 'social_media', 'gestor_trafego');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'in_review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published', 'failed');
CREATE TYPE post_platform AS ENUM ('instagram', 'facebook', 'linkedin', 'twitter');

-- ============================================
-- 3. TABELA DE PERFIS (complementa auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 4. TABELA DE FUNÇÕES DE USUÁRIOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, role)
);

-- ============================================
-- 5. TABELA DE CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  services TEXT[], -- Array de serviços oferecidos
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 6. TABELA DE RELACIONAMENTO CLIENTE-USUÁRIO
-- ============================================
CREATE TABLE IF NOT EXISTS public.client_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(client_id, user_id)
);

-- ============================================
-- 7. TABELA DE RELACIONAMENTO GERENTE-FUNCIONÁRIOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.manager_employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  manager_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(manager_id, employee_id),
  CHECK (manager_id != employee_id)
);

-- ============================================
-- 8. TABELA DE TAREFAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status task_status DEFAULT 'todo' NOT NULL,
  priority task_priority DEFAULT 'medium' NOT NULL,
  due_date DATE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 9. TABELA DE POSTS AGENDADOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  platform post_platform NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  status post_status DEFAULT 'draft' NOT NULL,
  media_urls TEXT[], -- Array de URLs de mídia
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 10. TABELA DE EVENTOS DO CALENDÁRIO
-- ============================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  attendees TEXT[], -- Array de emails ou IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 11. ÍNDICES PARA PERFORMANCE
-- ============================================
-- Nota: profiles.id já é indexado automaticamente como PRIMARY KEY
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON public.client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON public.client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_manager_employees_manager ON public.manager_employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_employees_employee ON public.manager_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_client_id ON public.scheduled_posts(client_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON public.scheduled_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client_id ON public.calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON public.calendar_events(start_date);

-- ============================================
-- 12. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 13. REMOVER POLÍTICAS EXISTENTES (se houver)
-- ============================================
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Todos podem ver funções" ON public.user_roles;
DROP POLICY IF EXISTS "Admins podem gerenciar funções" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver clientes atribuídos a eles" ON public.clients;
DROP POLICY IF EXISTS "Admins e gerentes podem inserir clientes" ON public.clients;
DROP POLICY IF EXISTS "Admins e gerentes podem atualizar clientes" ON public.clients;
DROP POLICY IF EXISTS "Admins podem deletar clientes" ON public.clients;
DROP POLICY IF EXISTS "Todos podem ver atribuições de clientes" ON public.client_users;
DROP POLICY IF EXISTS "Admins e gerentes podem gerenciar atribuições" ON public.client_users;
DROP POLICY IF EXISTS "Gerentes podem ver sua equipe" ON public.manager_employees;
DROP POLICY IF EXISTS "Admins e gerentes podem gerenciar equipes" ON public.manager_employees;
DROP POLICY IF EXISTS "Usuários podem ver tarefas dos seus clientes ou atribuídas a eles" ON public.tasks;
DROP POLICY IF EXISTS "Usuários podem criar tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Usuários podem atualizar tarefas que criaram ou foram atribuídas" ON public.tasks;
DROP POLICY IF EXISTS "Criadores e admins podem deletar tarefas" ON public.tasks;
DROP POLICY IF EXISTS "Usuários podem ver posts dos seus clientes" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Usuários podem criar posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Criadores podem atualizar seus posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Criadores e admins podem deletar posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Usuários podem ver eventos dos seus clientes" ON public.calendar_events;
DROP POLICY IF EXISTS "Usuários podem criar eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Criadores podem atualizar eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Criadores e admins podem deletar eventos" ON public.calendar_events;

-- ============================================
-- 14. POLÍTICAS RLS - PROFILES
-- ============================================
CREATE POLICY "Usuários podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 15. POLÍTICAS RLS - USER_ROLES
-- ============================================
CREATE POLICY "Todos podem ver funções"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar funções"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 16. POLÍTICAS RLS - CLIENTS
-- ============================================
CREATE POLICY "Usuários podem ver clientes atribuídos a eles"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users
      WHERE client_id = clients.id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Admins e gerentes podem inserir clientes"
  ON public.clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Admins e gerentes podem atualizar clientes"
  ON public.clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Admins podem deletar clientes"
  ON public.clients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 17. POLÍTICAS RLS - CLIENT_USERS
-- ============================================
CREATE POLICY "Todos podem ver atribuições de clientes"
  ON public.client_users FOR SELECT
  USING (true);

CREATE POLICY "Admins e gerentes podem gerenciar atribuições"
  ON public.client_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

-- ============================================
-- 18. POLÍTICAS RLS - MANAGER_EMPLOYEES
-- ============================================
CREATE POLICY "Gerentes podem ver sua equipe"
  ON public.manager_employees FOR SELECT
  USING (
    manager_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar equipes"
  ON public.manager_employees FOR ALL
  USING (
    manager_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 19. POLÍTICAS RLS - TASKS
-- ============================================
CREATE POLICY "Usuários podem ver tarefas dos seus clientes ou atribuídas a eles"
  ON public.tasks FOR SELECT
  USING (
    assignee_id = auth.uid()
    OR
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.client_users
      WHERE client_id = tasks.client_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Usuários podem criar tarefas"
  ON public.tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar tarefas que criaram ou foram atribuídas"
  ON public.tasks FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    assignee_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Criadores e admins podem deletar tarefas"
  ON public.tasks FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 20. POLÍTICAS RLS - SCHEDULED_POSTS
-- ============================================
CREATE POLICY "Usuários podem ver posts dos seus clientes"
  ON public.scheduled_posts FOR SELECT
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.client_users
      WHERE client_id = scheduled_posts.client_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Usuários podem criar posts"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Criadores podem atualizar seus posts"
  ON public.scheduled_posts FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Criadores e admins podem deletar posts"
  ON public.scheduled_posts FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 21. POLÍTICAS RLS - CALENDAR_EVENTS
-- ============================================
CREATE POLICY "Usuários podem ver eventos dos seus clientes"
  ON public.calendar_events FOR SELECT
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.client_users
      WHERE client_id = calendar_events.client_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Usuários podem criar eventos"
  ON public.calendar_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Criadores podem atualizar eventos"
  ON public.calendar_events FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Criadores e admins podem deletar eventos"
  ON public.calendar_events FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 22. FUNÇÕES E TRIGGERS
-- ============================================

-- Função para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário'),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para executar função após criar usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_scheduled_posts_updated_at ON public.scheduled_posts;
CREATE TRIGGER set_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER set_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 23. FUNÇÃO PARA VERIFICAR SE USUÁRIO É ADMIN
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1 AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 24. FUNÇÃO PARA VERIFICAR SE USUÁRIO É GERENTE
-- ============================================
CREATE OR REPLACE FUNCTION public.is_manager(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1 AND role = 'gerente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Execução concluída! Todas as tabelas, políticas e triggers foram criados.
-- Próximos passos:
-- 1. Configure Email Templates em Authentication > Email Templates
-- 2. Configure URLs de redirecionamento em Authentication > URL Configuration
-- 3. Crie o primeiro usuário admin manualmente (veja instruções no SUPABASE_CONFIG.md)
-- ============================================
