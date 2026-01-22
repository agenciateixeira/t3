-- ============================================================================
-- FORCE PROFILE DELETE FIX
-- ============================================================================
-- Força a correção de TODAS as foreign keys que referenciam profiles
-- ============================================================================

-- Primeiro, vamos ver TODAS as constraints que ainda existem
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Loop em todas as foreign keys que referenciam profiles
  FOR r IN
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
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
      AND rc.delete_rule = 'NO ACTION'
  LOOP
    -- Dropar constraint
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);

    -- Recriar com CASCADE ou SET NULL (dependendo da coluna)
    IF r.column_name IN ('user_id', 'member_id', 'participant_id') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES profiles(id) ON DELETE CASCADE',
        r.table_name, r.constraint_name, r.column_name);
      RAISE NOTICE 'Fixed % on %.% with CASCADE', r.constraint_name, r.table_name, r.column_name;
    ELSE
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES profiles(id) ON DELETE SET NULL',
        r.table_name, r.constraint_name, r.column_name);
      RAISE NOTICE 'Fixed % on %.% with SET NULL', r.constraint_name, r.table_name, r.column_name;
    END IF;
  END LOOP;
END $$;

-- Verificar se ainda há alguma NO ACTION
SELECT
  tc.table_name,
  kcu.column_name,
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
  AND rc.delete_rule = 'NO ACTION';
