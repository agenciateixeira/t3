-- ============================================================================
-- RLS POLICIES BASEADAS EM HIERARQUIA
-- ============================================================================
-- Define políticas de acesso baseadas em:
-- - admin: Acesso total
-- - team_manager: Acesso ao seu time
-- - employee: Acesso apenas às suas informações e do time
-- ============================================================================

-- ============================================
-- 1. REMOVER POLÍTICAS ANTIGAS
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins podem deletar perfis" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Clients
DROP POLICY IF EXISTS "Usuários podem ver clientes atribuídos a eles" ON clients;
DROP POLICY IF EXISTS "Admins e gerentes podem inserir clientes" ON clients;
DROP POLICY IF EXISTS "Admins e gerentes podem atualizar clientes" ON clients;
DROP POLICY IF EXISTS "Admins podem deletar clientes" ON clients;

-- Tasks
DROP POLICY IF EXISTS "Usuários podem ver tarefas dos seus clientes ou atribuídas a eles" ON tasks;
DROP POLICY IF EXISTS "Usuários podem criar tarefas" ON tasks;
DROP POLICY IF EXISTS "Usuários podem atualizar tarefas que criaram ou foram atribuídas" ON tasks;
DROP POLICY IF EXISTS "Criadores e admins podem deletar tarefas" ON tasks;

-- Calendar Events
DROP POLICY IF EXISTS "Usuários podem ver eventos dos seus clientes" ON calendar_events;
DROP POLICY IF EXISTS "Usuários podem criar eventos" ON calendar_events;
DROP POLICY IF EXISTS "Criadores podem atualizar eventos" ON calendar_events;
DROP POLICY IF EXISTS "Criadores e admins podem deletar eventos" ON calendar_events;

-- ============================================
-- 2. FUNÇÃO AUXILIAR: Verificar se é admin
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND hierarchy = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FUNÇÃO AUXILIAR: Verificar se é gerente
-- ============================================

CREATE OR REPLACE FUNCTION is_team_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND hierarchy = 'team_manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNÇÃO AUXILIAR: Obter team_id do usuário
-- ============================================

CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT team_id
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. POLÍTICAS RLS - PROFILES
-- ============================================

-- SELECT: Todos veem perfis do mesmo time, admins veem todos
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  USING (
    is_admin() OR
    team_id = get_user_team_id() OR
    id = auth.uid()
  );

-- INSERT: Apenas admins e gerentes podem criar perfis
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (
    is_admin() OR is_team_manager()
  );

-- UPDATE: Admins atualizam qualquer perfil, gerentes atualizam do time, usuários atualizam próprio
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  USING (
    is_admin() OR
    (is_team_manager() AND team_id = get_user_team_id()) OR
    id = auth.uid()
  )
  WITH CHECK (
    is_admin() OR
    (is_team_manager() AND team_id = get_user_team_id()) OR
    id = auth.uid()
  );

-- DELETE: Apenas admins podem deletar perfis
CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE
  USING (is_admin());

-- ============================================
-- 6. POLÍTICAS RLS - CLIENTS
-- ============================================

-- SELECT: Admin vê todos, gerente vê do seu time, colaborador vê do seu time
CREATE POLICY "clients_select_policy" ON clients
  FOR SELECT
  USING (
    is_admin() OR
    team_id = get_user_team_id() OR
    team_id IS NULL
  );

-- INSERT: Apenas admins e gerentes podem criar clientes
CREATE POLICY "clients_insert_policy" ON clients
  FOR INSERT
  WITH CHECK (
    is_admin() OR is_team_manager()
  );

-- UPDATE: Admin atualiza qualquer, gerente atualiza do seu time
CREATE POLICY "clients_update_policy" ON clients
  FOR UPDATE
  USING (
    is_admin() OR
    (is_team_manager() AND team_id = get_user_team_id())
  )
  WITH CHECK (
    is_admin() OR
    (is_team_manager() AND team_id = get_user_team_id())
  );

-- DELETE: Apenas admins podem deletar clientes
CREATE POLICY "clients_delete_policy" ON clients
  FOR DELETE
  USING (is_admin());

-- ============================================
-- 7. POLÍTICAS RLS - TASKS
-- ============================================

-- SELECT: Todos veem todas as tarefas (conforme requisito)
CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT
  USING (true);

-- INSERT: Todos podem criar tarefas
CREATE POLICY "tasks_insert_policy" ON tasks
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Admins atualizam qualquer, gerentes atualizam do seu time, colaboradores atualizam suas
CREATE POLICY "tasks_update_policy" ON tasks
  FOR UPDATE
  USING (
    is_admin() OR
    assignee_id = auth.uid() OR
    created_by = auth.uid() OR
    (is_team_manager() AND EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = tasks.client_id
        AND c.team_id = get_user_team_id()
    ))
  )
  WITH CHECK (
    is_admin() OR
    assignee_id = auth.uid() OR
    created_by = auth.uid() OR
    (is_team_manager() AND EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = tasks.client_id
        AND c.team_id = get_user_team_id()
    ))
  );

-- DELETE: Admins e criadores podem deletar
CREATE POLICY "tasks_delete_policy" ON tasks
  FOR DELETE
  USING (
    is_admin() OR created_by = auth.uid()
  );

-- ============================================
-- 8. POLÍTICAS RLS - CALENDAR_EVENTS
-- ============================================

-- SELECT: Todos veem todos os eventos (conforme requisito)
CREATE POLICY "calendar_events_select_policy" ON calendar_events
  FOR SELECT
  USING (true);

-- INSERT: Todos podem criar eventos
CREATE POLICY "calendar_events_insert_policy" ON calendar_events
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Criadores e admins podem atualizar
CREATE POLICY "calendar_events_update_policy" ON calendar_events
  FOR UPDATE
  USING (
    is_admin() OR created_by = auth.uid()
  )
  WITH CHECK (
    is_admin() OR created_by = auth.uid()
  );

-- DELETE: Criadores e admins podem deletar
CREATE POLICY "calendar_events_delete_policy" ON calendar_events
  FOR DELETE
  USING (
    is_admin() OR created_by = auth.uid()
  );

-- ============================================
-- 9. POLÍTICAS RLS - TEAMS (se existir)
-- ============================================

-- Verificar se a tabela teams existe e criar políticas
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams') THEN
    -- Remover políticas antigas
    EXECUTE 'DROP POLICY IF EXISTS "teams_select_policy" ON teams';
    EXECUTE 'DROP POLICY IF EXISTS "teams_insert_policy" ON teams';
    EXECUTE 'DROP POLICY IF EXISTS "teams_update_policy" ON teams';
    EXECUTE 'DROP POLICY IF EXISTS "teams_delete_policy" ON teams';

    -- SELECT: Todos veem os times
    EXECUTE 'CREATE POLICY "teams_select_policy" ON teams FOR SELECT USING (true)';

    -- INSERT: Apenas admins podem criar times
    EXECUTE 'CREATE POLICY "teams_insert_policy" ON teams FOR INSERT WITH CHECK (is_admin())';

    -- UPDATE: Admins e gerentes do time podem atualizar
    EXECUTE 'CREATE POLICY "teams_update_policy" ON teams FOR UPDATE USING (is_admin() OR manager_id = auth.uid()) WITH CHECK (is_admin() OR manager_id = auth.uid())';

    -- DELETE: Apenas admins podem deletar times
    EXECUTE 'CREATE POLICY "teams_delete_policy" ON teams FOR DELETE USING (is_admin())';
  END IF;
END $$;

-- ============================================
-- 10. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON FUNCTION is_admin() IS 'Verifica se o usuário logado é administrador';
COMMENT ON FUNCTION is_team_manager() IS 'Verifica se o usuário logado é gerente de time';
COMMENT ON FUNCTION get_user_team_id() IS 'Retorna o team_id do usuário logado';

-- ============================================
-- 11. GARANTIR QUE RLS ESTÁ ATIVADO
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. VERIFICAÇÃO FINAL
-- ============================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'clients', 'tasks', 'calendar_events', 'teams')
ORDER BY tablename, policyname;
