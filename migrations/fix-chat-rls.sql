-- ============================================
-- CORREÇÃO COMPLETA DAS POLÍTICAS RLS DO CHAT
-- ============================================

-- PRIMEIRO: Remover TODAS as políticas antigas
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Remove todas as políticas de group_members
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON group_members';
    END LOOP;

    -- Remove todas as políticas de chat_groups
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_groups') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON chat_groups';
    END LOOP;

    -- Remove todas as políticas de messages
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON messages';
    END LOOP;

    -- Remove todas as políticas de message_reads
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'message_reads') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON message_reads';
    END LOOP;
END $$;

-- SEGUNDO: Habilitar RLS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA group_members
-- ============================================

-- SELECT: Ver membros dos grupos onde você está
CREATE POLICY "group_members_select"
ON group_members FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- INSERT: Apenas criadores de grupo podem adicionar membros
CREATE POLICY "group_members_insert"
ON group_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_groups
    WHERE id = group_id
    AND created_by = auth.uid()
  )
);

-- DELETE: Pode sair do próprio grupo ou remover se for criador
CREATE POLICY "group_members_delete"
ON group_members FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
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

-- SELECT: Ver grupos onde é membro
CREATE POLICY "chat_groups_select"
ON chat_groups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = chat_groups.id
    AND user_id = auth.uid()
  )
);

-- INSERT: Qualquer um pode criar grupo
CREATE POLICY "chat_groups_insert"
ON chat_groups FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- UPDATE: Apenas criador pode atualizar
CREATE POLICY "chat_groups_update"
ON chat_groups FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- DELETE: Apenas criador pode deletar
CREATE POLICY "chat_groups_delete"
ON chat_groups FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- ============================================
-- POLÍTICAS PARA messages
-- ============================================

-- SELECT: Ver mensagens dos grupos onde é membro OU conversas diretas suas
CREATE POLICY "messages_select"
ON messages FOR SELECT
TO authenticated
USING (
  -- Mensagens de grupos onde é membro
  (
    group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = messages.group_id
      AND user_id = auth.uid()
    )
  )
  OR
  -- Mensagens diretas onde você é remetente ou destinatário
  (
    group_id IS NULL
    AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  )
);

-- INSERT: Pode enviar para grupos onde é membro ou conversas diretas
CREATE POLICY "messages_insert"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    -- Grupo onde é membro
    (
      group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = messages.group_id
        AND user_id = auth.uid()
      )
    )
    OR
    -- Conversa direta
    (group_id IS NULL AND recipient_id IS NOT NULL)
  )
);

-- DELETE: Apenas próprias mensagens
CREATE POLICY "messages_delete"
ON messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- ============================================
-- POLÍTICAS PARA message_reads
-- ============================================

-- SELECT: Ver apenas próprias leituras
CREATE POLICY "message_reads_select"
ON message_reads FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Marcar apenas próprias leituras
CREATE POLICY "message_reads_insert"
ON message_reads FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- DELETE: Deletar apenas próprias leituras
CREATE POLICY "message_reads_delete"
ON message_reads FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- PERMISSÕES
-- ============================================

GRANT ALL ON group_members TO authenticated;
GRANT ALL ON chat_groups TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_reads TO authenticated;

-- ============================================
-- ATUALIZAR FUNÇÃO DE DELETAR CONVERSA
-- ============================================

CREATE OR REPLACE FUNCTION delete_conversation(
  p_conversation_id UUID,
  p_conversation_type TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF p_conversation_type = 'group' THEN
    -- Para grupos: remove o usuário do grupo
    DELETE FROM group_members
    WHERE group_id = p_conversation_id
    AND user_id = p_user_id;

    v_result := json_build_object(
      'success', true,
      'message', 'Você saiu do grupo com sucesso'
    );
  ELSE
    -- Para conversas diretas: deleta TODAS as mensagens da conversa (ambos os lados)
    DELETE FROM messages
    WHERE group_id IS NULL
    AND (
      (sender_id = p_user_id AND recipient_id = p_conversation_id)
      OR
      (sender_id = p_conversation_id AND recipient_id = p_user_id)
    );

    v_result := json_build_object(
      'success', true,
      'message', 'Conversa deletada completamente'
    );
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_conversation(UUID, TEXT, UUID) TO authenticated;
