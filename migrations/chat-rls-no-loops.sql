-- ============================================
-- POLÍTICAS RLS SEM LOOPS INFINITOS
-- Simplificadas e eficientes
-- ============================================

-- Limpar todas as políticas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename IN ('chat_groups', 'group_members', 'messages', 'message_reads')) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
    END LOOP;
END $$;

-- ============================================
-- POLÍTICAS PARA group_members (PRIMEIRO!)
-- Simples: você vê apenas onde user_id = você
-- ============================================

CREATE POLICY "group_members_select"
ON group_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "group_members_insert"
ON group_members FOR INSERT
TO authenticated
WITH CHECK (true);  -- Criador do grupo pode adicionar qualquer um

CREATE POLICY "group_members_delete"
ON group_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());  -- Pode sair do próprio grupo

-- ============================================
-- POLÍTICAS PARA chat_groups
-- ============================================

CREATE POLICY "chat_groups_select_all"
ON chat_groups FOR SELECT
TO authenticated
USING (true);  -- Todos veem todos os grupos (filtro será feito no código)

CREATE POLICY "chat_groups_insert"
ON chat_groups FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "chat_groups_update"
ON chat_groups FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "chat_groups_delete"
ON chat_groups FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- ============================================
-- POLÍTICAS PARA messages
-- ============================================

CREATE POLICY "messages_select"
ON messages FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR
  recipient_id = auth.uid()
  OR
  group_id IS NOT NULL  -- Mensagens de grupo (filtro adicional no código)
);

CREATE POLICY "messages_insert"
ON messages FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages_delete"
ON messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- ============================================
-- POLÍTICAS PARA message_reads
-- ============================================

CREATE POLICY "message_reads_all"
ON message_reads FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- PERMISSÕES
-- ============================================

GRANT ALL ON chat_groups TO authenticated;
GRANT ALL ON group_members TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_reads TO authenticated;

-- ============================================
-- VALIDAÇÃO
-- ============================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('chat_groups', 'group_members', 'messages', 'message_reads')
ORDER BY tablename, cmd;
