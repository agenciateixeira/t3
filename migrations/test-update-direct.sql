-- ============================================================================
-- TEST UPDATE DIRECTLY IN DATABASE
-- ============================================================================
-- Testa se o UPDATE funciona direto no banco (bypassing RLS)
-- ============================================================================

-- 1. Ver dados ANTES do update
SELECT
  id,
  full_name,
  hierarchy,
  team_id
FROM profiles
WHERE id = 'b0791d80-7abc-4e83-b194-d4223df0da8e';

-- 2. Fazer UPDATE direto (sem RLS)
UPDATE profiles
SET
  hierarchy = 'social_media',
  team_id = 'a772e112-66e0-4897-8cc6-d727f92eb6ba'
WHERE id = 'b0791d80-7abc-4e83-b194-d4223df0da8e';

-- 3. Ver dados DEPOIS do update
SELECT
  id,
  full_name,
  hierarchy,
  team_id
FROM profiles
WHERE id = 'b0791d80-7abc-4e83-b194-d4223df0da8e';

-- 4. Verificar se há TRIGGERS na tabela profiles
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';
