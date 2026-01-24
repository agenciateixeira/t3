-- ============================================================================
-- PARTE 1: ADICIONAR 'employee' AO ENUM user_hierarchy
-- ============================================================================
-- IMPORTANTE: Execute esta migration PRIMEIRO e sozinha!
-- Depois execute a migration 002-add-cpf-and-migrate-hierarchy.sql
-- ============================================================================

-- Adicionar 'employee' ao enum user_hierarchy
DO $$
BEGIN
  -- Verificar se 'employee' já existe no enum
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'employee'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_hierarchy')
  ) THEN
    -- Adicionar 'employee' ao enum existente
    ALTER TYPE user_hierarchy ADD VALUE 'employee';
    RAISE NOTICE '✅ Valor "employee" adicionado ao enum user_hierarchy com sucesso!';
  ELSE
    RAISE NOTICE 'ℹ️  Valor "employee" já existe no enum user_hierarchy';
  END IF;
END $$;

-- Verificar os valores atuais do enum
SELECT
  'Valores do enum user_hierarchy:' as info,
  enumlabel as valor
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_hierarchy')
ORDER BY enumsortorder;
