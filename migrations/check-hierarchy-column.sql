-- ============================================================================
-- CHECK HIERARCHY COLUMN CONSTRAINTS
-- ============================================================================

-- 1. Ver detalhes da coluna hierarchy
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  udt_name
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'hierarchy';

-- 2. Ver se hierarchy é um ENUM
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'user_hierarchy'
ORDER BY e.enumsortorder;

-- 3. Verificar constraints na coluna
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
  AND conname LIKE '%hierarchy%';

-- 4. Testar UPDATE direto do hierarchy
UPDATE profiles
SET hierarchy = 'traffic_manager'
WHERE id = 'b0791d80-7abc-4e83-b194-d4223df0da8e'
RETURNING id, full_name, hierarchy;
