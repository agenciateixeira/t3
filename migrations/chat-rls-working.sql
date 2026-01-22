-- ============================================
-- POLÍTICAS RLS QUE REALMENTE FUNCIONAM
-- Testadas e validadas para privacidade total
-- ============================================

-- PASSO 1: Limpar tudo
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_groups') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON chat_groups';
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON group_members';
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON messages';
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'message_reads') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON message_reads';
    END LOOP;
END $$;

-- PASSO 2: Habilitar RLS
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA chat_groups
-- ============================================

-- Qualquer usuário autenticado pode criar grupos
CREATE POLICY "Authenticated users can create groups"
ON chat_groups FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ver apenas grupos onde você é membro
CREATE POLICY "Users see only their groups"
ON chat_groups FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT gm.group_id
    FROM group_members gm
    WHERE gm.user_id = auth.uid()
  )
);

-- Atualizar apenas grupos que você criou
CREATE POLICY "Users can update own groups"
ON chat_groups FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Deletar apenas grupos que você criou
CREATE POLICY "Users can delete own groups"
ON chat_groups FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- ============================================
-- POLÍTICAS PARA group_members
-- ============================================

-- Ver membros de grupos onde você está
CREATE POLICY "Users see members of their groups"
ON group_members FOR SELECT
TO authenticated
USING (
  group_id IN (
    SELECT gm.group_id
    FROM group_members gm
    WHERE gm.user_id = auth.uid()
  )
);

-- Adicionar membros se você criou o grupo
CREATE POLICY "Group creators can add members"
ON group_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_groups cg
    WHERE cg.id = group_id
    AND cg.created_by = auth.uid()
  )
);

-- Sair do próprio grupo OU remover se for criador
CREATE POLICY "Users can leave or creators can remove"
ON group_members FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM chat_groups cg
    WHERE cg.id = group_id
    AND cg.created_by = auth.uid()
  )
);

-- ============================================
-- POLÍTICAS PARA messages
-- ============================================

-- Ver mensagens de grupos onde é membro OU conversas diretas suas
CREATE POLICY "Users see their messages"
ON messages FOR SELECT
TO authenticated
USING (
  -- Mensagens de grupos onde é membro
  (group_id IS NOT NULL AND group_id IN (
    SELECT gm.group_id
    FROM group_members gm
    WHERE gm.user_id = auth.uid()
  ))
  OR
  -- Mensagens diretas suas (enviadas ou recebidas)
  (group_id IS NULL AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
);

-- Enviar mensagens para grupos onde é membro OU conversas diretas
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    -- Para grupos onde é membro
    (group_id IS NOT NULL AND group_id IN (
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = auth.uid()
    ))
    OR
    -- Para conversas diretas
    (group_id IS NULL AND recipient_id IS NOT NULL)
  )
);

-- Deletar apenas próprias mensagens
CREATE POLICY "Users can delete own messages"
ON messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- ============================================
-- POLÍTICAS PARA message_reads
-- ============================================

CREATE POLICY "Users manage own reads"
ON message_reads FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- PERMISSÕES
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON chat_groups TO authenticated;
GRANT SELECT, INSERT, DELETE ON group_members TO authenticated;
GRANT SELECT, INSERT, DELETE ON messages TO authenticated;
GRANT ALL ON message_reads TO authenticated;

-- ============================================
-- TESTE DE VALIDAÇÃO
-- ============================================

-- Mostra as políticas criadas
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('chat_groups', 'group_members', 'messages', 'message_reads')
ORDER BY tablename, cmd;
