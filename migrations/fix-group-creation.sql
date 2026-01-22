-- ============================================
-- CORREÇÃO: Permitir criação de grupos
-- ============================================

-- Remove política de INSERT em chat_groups se existir
DROP POLICY IF EXISTS "chat_groups_insert" ON chat_groups;

-- Cria política permitindo qualquer usuário autenticado criar grupos
CREATE POLICY "chat_groups_insert"
ON chat_groups FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Garante que a tabela está com RLS habilitado
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;

-- Garante permissões
GRANT INSERT ON chat_groups TO authenticated;
GRANT SELECT ON chat_groups TO authenticated;
GRANT UPDATE ON chat_groups TO authenticated;
GRANT DELETE ON chat_groups TO authenticated;
