-- ============================================
-- DESABILITAR RLS TEMPORARIAMENTE NO CHAT
-- Para que tudo funcione sem restrições
-- ============================================

-- Desabilita RLS em todas as tabelas de chat
ALTER TABLE chat_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads DISABLE ROW LEVEL SECURITY;

-- Remove todas as políticas existentes
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Remove políticas de chat_groups
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_groups') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON chat_groups';
    END LOOP;

    -- Remove políticas de group_members
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON group_members';
    END LOOP;

    -- Remove políticas de messages
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON messages';
    END LOOP;

    -- Remove políticas de message_reads
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'message_reads') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON message_reads';
    END LOOP;
END $$;

-- Garante permissões totais para usuários autenticados
GRANT ALL ON chat_groups TO authenticated;
GRANT ALL ON group_members TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_reads TO authenticated;

-- Confirma que desabilitou
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('chat_groups', 'group_members', 'messages', 'message_reads');
