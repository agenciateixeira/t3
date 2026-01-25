-- ============================================================================
-- CORRIGIR PROBLEMAS DE REAL-TIME DO CHAT
-- ============================================================================
-- 1. Garantir que RLS permite real-time subscriptions
-- 2. Habilitar realtime na tabela messages
-- 3. Verificar políticas de leitura
-- ============================================================================

-- PASSO 1: Habilitar Realtime para a tabela messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- PASSO 2: Verificar se existe política de SELECT que permite usuários verem mensagens relevantes
-- Esta política já deve existir, mas vamos recriar para garantir

DROP POLICY IF EXISTS "Users can view messages they are part of" ON messages;

CREATE POLICY "Users can view messages they are part of"
ON messages
FOR SELECT
USING (
  -- Mensagens enviadas por mim
  auth.uid() = sender_id
  OR
  -- Mensagens enviadas para mim (DM)
  auth.uid() = recipient_id
  OR
  -- Mensagens em grupos onde sou membro
  (
    group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = messages.group_id
      AND group_members.user_id = auth.uid()
    )
  )
);

-- PASSO 3: Garantir política de INSERT (para criar mensagens)
DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can send messages"
ON messages
FOR INSERT
WITH CHECK (
  -- Posso enviar mensagens como eu mesmo
  auth.uid() = sender_id
  AND
  (
    -- DM: posso enviar para qualquer usuário
    (recipient_id IS NOT NULL AND group_id IS NULL)
    OR
    -- Grupo: posso enviar se sou membro
    (
      group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM group_members
        WHERE group_members.group_id = messages.group_id
        AND group_members.user_id = auth.uid()
      )
    )
  )
);

-- COMENTÁRIOS
COMMENT ON POLICY "Users can view messages they are part of" ON messages IS
'Permite que usuários vejam mensagens DM, mensagens enviadas por eles, ou mensagens em grupos onde são membros. Necessário para Realtime funcionar.';

COMMENT ON POLICY "Users can send messages" ON messages IS
'Permite que usuários enviem mensagens DM ou em grupos onde são membros.';
