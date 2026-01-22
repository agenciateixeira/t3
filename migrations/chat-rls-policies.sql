-- ============================================
-- POLÍTICAS RLS PARA CHAT COM PRIVACIDADE TOTAL
-- Cada usuário vê apenas seus grupos e conversas
-- ============================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Users can view their own group memberships" ON group_members;
DROP POLICY IF EXISTS "Users can insert group memberships" ON group_members;
DROP POLICY IF EXISTS "Users can delete their own group memberships" ON group_members;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON chat_groups;
DROP POLICY IF EXISTS "Users can create groups" ON chat_groups;
DROP POLICY IF EXISTS "Users can update groups they created" ON chat_groups;
DROP POLICY IF EXISTS "Users can delete groups they created" ON chat_groups;
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Habilitar RLS nas tabelas
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA group_members
-- ============================================

-- Ver apenas membros dos grupos onde você está
CREATE POLICY "Users can view their own group memberships"
ON group_members FOR SELECT
USING (
  user_id = auth.uid()
  OR
  group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  )
);

-- Inserir membros (apenas criadores de grupo podem adicionar)
CREATE POLICY "Users can insert group memberships"
ON group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_groups
    WHERE id = group_id
    AND created_by = auth.uid()
  )
);

-- Deletar apenas própria participação ou se for criador do grupo
CREATE POLICY "Users can delete their own group memberships"
ON group_members FOR DELETE
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM chat_groups
    WHERE id = group_id
    AND created_by = auth.uid()
  )
);

-- ============================================
-- POLÍTICAS PARA chat_groups
-- ============================================

-- Ver apenas grupos onde você é membro
CREATE POLICY "Users can view groups they are members of"
ON chat_groups FOR SELECT
USING (
  id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  )
);

-- Criar grupos
CREATE POLICY "Users can create groups"
ON chat_groups FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Atualizar grupos que criou
CREATE POLICY "Users can update groups they created"
ON chat_groups FOR UPDATE
USING (created_by = auth.uid());

-- Deletar grupos que criou
CREATE POLICY "Users can delete groups they created"
ON chat_groups FOR DELETE
USING (created_by = auth.uid());

-- ============================================
-- POLÍTICAS PARA messages
-- ============================================

-- Ver mensagens:
-- 1. De grupos onde é membro
-- 2. De conversas diretas onde é remetente ou destinatário
CREATE POLICY "Users can view their messages"
ON messages FOR SELECT
USING (
  -- Mensagens de grupos onde é membro
  (group_id IS NOT NULL AND group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  ))
  OR
  -- Mensagens diretas enviadas por você
  (group_id IS NULL AND sender_id = auth.uid())
  OR
  -- Mensagens diretas enviadas para você
  (group_id IS NULL AND recipient_id = auth.uid())
);

-- Enviar mensagens:
-- 1. Para grupos onde é membro
-- 2. Para conversas diretas
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    -- Mensagens para grupos onde é membro
    (group_id IS NOT NULL AND group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    ))
    OR
    -- Mensagens diretas (sem grupo)
    (group_id IS NULL AND recipient_id IS NOT NULL)
  )
);

-- Deletar apenas próprias mensagens
CREATE POLICY "Users can delete their own messages"
ON messages FOR DELETE
USING (sender_id = auth.uid());

-- ============================================
-- POLÍTICAS PARA message_reads
-- ============================================

-- Ver apenas próprias leituras
CREATE POLICY "Users can view their own message reads"
ON message_reads FOR SELECT
USING (user_id = auth.uid());

-- Inserir apenas próprias leituras
CREATE POLICY "Users can insert their own message reads"
ON message_reads FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Deletar apenas próprias leituras
CREATE POLICY "Users can delete their own message reads"
ON message_reads FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, DELETE ON group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_groups TO authenticated;
GRANT SELECT, INSERT, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON message_reads TO authenticated;
