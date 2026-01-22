-- ============================================================================
-- DEBUG PROFILE DELETE
-- ============================================================================
-- Verifica o que está bloqueando a exclusão de profiles
-- ============================================================================

-- 1. Verificar RLS policies de DELETE em profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'DELETE';

-- 2. Verificar TODAS as foreign keys que referenciam profiles
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles'
ORDER BY rc.delete_rule, tc.table_name, kcu.column_name;

-- 3. Verificar se há triggers em profiles
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- 4. Verificar o hierarchy do usuário atual (para ver se pode deletar)
SELECT id, full_name, hierarchy
FROM profiles
WHERE id = auth.uid();
