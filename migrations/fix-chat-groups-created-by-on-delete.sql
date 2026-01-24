-- ============================================================================
-- FIX: Permitir deletar usuários que participam de chats
-- ============================================================================
-- Quando um usuário é deletado:
-- - Grupos criados por ele continuam existindo (created_by = NULL)
-- - Mensagens enviadas por ele continuam existindo (sender_id = NULL)
-- - Membros do grupo são removidos
-- ============================================================================

-- 1. Permitir NULL na coluna created_by da tabela chat_groups
ALTER TABLE chat_groups
ALTER COLUMN created_by DROP NOT NULL;

-- 2. Atualizar a constraint de foreign key para SET NULL ao invés de bloquear
ALTER TABLE chat_groups
DROP CONSTRAINT IF EXISTS chat_groups_created_by_fkey;

ALTER TABLE chat_groups
ADD CONSTRAINT chat_groups_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- 3. Permitir NULL na coluna sender_id da tabela messages
ALTER TABLE messages
ALTER COLUMN sender_id DROP NOT NULL;

-- 4. Atualizar a constraint de foreign key para SET NULL ao invés de bloquear
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey
FOREIGN KEY (sender_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- 5. Atualizar a constraint de group_members para CASCADE (remover membro do grupo)
ALTER TABLE group_members
DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;

ALTER TABLE group_members
ADD CONSTRAINT group_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 6. Comentários
COMMENT ON COLUMN chat_groups.created_by IS 'ID do usuário que criou o grupo. NULL se o usuário foi deletado.';
COMMENT ON COLUMN messages.sender_id IS 'ID do usuário que enviou a mensagem. NULL se o usuário foi deletado.';
