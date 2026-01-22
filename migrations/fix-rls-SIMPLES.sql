-- =============================================
-- SCRIPT SIMPLES PARA CORRIGIR RLS
-- Execute este no SQL Editor do Supabase
-- =============================================

-- 1. DESABILITAR RLS TEMPORARIAMENTE (para limpar políticas)
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tools DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_groups DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS ANTIGAS
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Remove todas as policies de user_roles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_roles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_roles';
    END LOOP;

    -- Remove todas as policies de profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
    END LOOP;

    -- Remove todas as policies de clients
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'clients' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.clients';
    END LOOP;

    -- Remove todas as policies de tasks
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tasks' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.tasks';
    END LOOP;

    -- Remove todas as policies de teams
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'teams' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.teams';
    END LOOP;

    -- Remove todas as policies de tools
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tools' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.tools';
    END LOOP;

    -- Remove todas as policies de messages
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.messages';
    END LOOP;

    -- Remove todas as policies de chat_groups
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_groups' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.chat_groups';
    END LOOP;
END $$;

-- 3. REABILITAR RLS
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_groups ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICAS SIMPLES (SEM RECURSÃO)

-- USER_ROLES: Permitir leitura para todos autenticados
CREATE POLICY "user_roles_read" ON public.user_roles
  FOR SELECT USING (true);

CREATE POLICY "user_roles_write" ON public.user_roles
  FOR ALL USING (auth.uid() IS NOT NULL);

-- PROFILES: Permitir leitura para todos, escrita apenas próprio perfil
CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_write_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- CLIENTS: Permitir tudo para autenticados
CREATE POLICY "clients_all" ON public.clients
  FOR ALL USING (auth.uid() IS NOT NULL);

-- TASKS: Permitir tudo para autenticados
CREATE POLICY "tasks_all" ON public.tasks
  FOR ALL USING (auth.uid() IS NOT NULL);

-- TEAMS: Permitir tudo para autenticados
CREATE POLICY "teams_all" ON public.teams
  FOR ALL USING (auth.uid() IS NOT NULL);

-- TOOLS: Permitir tudo para autenticados
CREATE POLICY "tools_all" ON public.tools
  FOR ALL USING (auth.uid() IS NOT NULL);

-- MESSAGES: Permitir visualizar se for remetente ou destinatário
CREATE POLICY "messages_read" ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id OR
    auth.uid() = recipient_id OR
    group_id IS NOT NULL
  );

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE USING (auth.uid() = sender_id);

-- CHAT_GROUPS: Permitir tudo para autenticados
CREATE POLICY "chat_groups_all" ON public.chat_groups
  FOR ALL USING (auth.uid() IS NOT NULL);
