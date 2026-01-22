-- ============================================================================
-- FIX REMAINING CASCADE FOR CHAT AND ACCESS REQUESTS
-- ============================================================================
-- Corrige foreign keys restantes que impedem deletar colaboradores
-- ============================================================================

-- ============================================
-- CHAT SYSTEM
-- ============================================

-- CHAT_GROUPS: created_by
ALTER TABLE chat_groups
DROP CONSTRAINT IF EXISTS chat_groups_created_by_fkey;

ALTER TABLE chat_groups
ADD CONSTRAINT chat_groups_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- GROUP_MEMBERS: Deletar membro quando user for deletado
ALTER TABLE group_members
DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;

ALTER TABLE group_members
ADD CONSTRAINT group_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- MESSAGES: sender_id e recipient_id
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey
FOREIGN KEY (sender_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_recipient_id_fkey
FOREIGN KEY (recipient_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- MESSAGE_READS: Deletar quando user for deletado
ALTER TABLE message_reads
DROP CONSTRAINT IF EXISTS message_reads_user_id_fkey;

ALTER TABLE message_reads
ADD CONSTRAINT message_reads_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- ============================================
-- ACCESS REQUESTS
-- ============================================

-- ACCESS_REQUESTS: user_id
ALTER TABLE access_requests
DROP CONSTRAINT IF EXISTS access_requests_user_id_fkey;

ALTER TABLE access_requests
ADD CONSTRAINT access_requests_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- ACCESS_REQUESTS: reviewed_by
ALTER TABLE access_requests
DROP CONSTRAINT IF EXISTS access_requests_reviewed_by_fkey;

ALTER TABLE access_requests
ADD CONSTRAINT access_requests_reviewed_by_fkey
FOREIGN KEY (reviewed_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- ============================================
-- USER TOOL ACCESS
-- ============================================

-- USER_TOOL_ACCESS: user_id
ALTER TABLE user_tool_access
DROP CONSTRAINT IF EXISTS user_tool_access_user_id_fkey;

ALTER TABLE user_tool_access
ADD CONSTRAINT user_tool_access_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- USER_TOOL_ACCESS: granted_by
ALTER TABLE user_tool_access
DROP CONSTRAINT IF EXISTS user_tool_access_granted_by_fkey;

ALTER TABLE user_tool_access
ADD CONSTRAINT user_tool_access_granted_by_fkey
FOREIGN KEY (granted_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- ============================================
-- VERIFICAR TODAS AS CONSTRAINTS
-- ============================================

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles'
ORDER BY tc.table_name, kcu.column_name;
