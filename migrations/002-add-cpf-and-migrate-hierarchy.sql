-- ============================================================================
-- PARTE 2: ADICIONAR CPF E MIGRAR HIERARQUIAS
-- ============================================================================
-- IMPORTANTE: Execute esta migration DEPOIS da 001-add-employee-to-hierarchy.sql
-- ============================================================================

-- 1. Adicionar coluna CPF (se não existir)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS cpf TEXT;

-- 2. Adicionar constraint UNIQUE no CPF (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_cpf_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_cpf_key UNIQUE (cpf);
    RAISE NOTICE '✅ Constraint UNIQUE adicionada ao CPF';
  END IF;
END $$;

-- 3. Criar índice no CPF para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf);

-- 4. Criar função de validação de CPF
CREATE OR REPLACE FUNCTION validate_cpf(cpf TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  cpf_clean TEXT;
  sum1 INTEGER := 0;
  sum2 INTEGER := 0;
  digit1 INTEGER;
  digit2 INTEGER;
  i INTEGER;
BEGIN
  -- Se CPF for NULL, retorna TRUE (permitir NULL)
  IF cpf IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Remove caracteres não numéricos
  cpf_clean := regexp_replace(cpf, '\D', '', 'g');

  -- Verifica se tem 11 dígitos
  IF length(cpf_clean) != 11 THEN
    RETURN FALSE;
  END IF;

  -- Verifica se todos os dígitos são iguais (CPF inválido)
  IF cpf_clean ~ '^(\d)\1{10}$' THEN
    RETURN FALSE;
  END IF;

  -- Calcula primeiro dígito verificador
  FOR i IN 1..9 LOOP
    sum1 := sum1 + (substring(cpf_clean, i, 1)::INTEGER * (11 - i));
  END LOOP;

  digit1 := 11 - (sum1 % 11);
  IF digit1 >= 10 THEN
    digit1 := 0;
  END IF;

  -- Verifica primeiro dígito
  IF digit1 != substring(cpf_clean, 10, 1)::INTEGER THEN
    RETURN FALSE;
  END IF;

  -- Calcula segundo dígito verificador
  FOR i IN 1..10 LOOP
    sum2 := sum2 + (substring(cpf_clean, i, 1)::INTEGER * (12 - i));
  END LOOP;

  digit2 := 11 - (sum2 % 11);
  IF digit2 >= 10 THEN
    digit2 := 0;
  END IF;

  -- Verifica segundo dígito
  IF digit2 != substring(cpf_clean, 11, 1)::INTEGER THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Adicionar constraint de validação de CPF
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_cpf_valid'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_cpf_valid CHECK (validate_cpf(cpf));
    RAISE NOTICE '✅ Constraint de validação de CPF adicionada';
  END IF;
END $$;

-- 6. Criar função para formatar CPF
CREATE OR REPLACE FUNCTION format_cpf(cpf TEXT)
RETURNS TEXT AS $$
DECLARE
  cpf_clean TEXT;
BEGIN
  -- Se CPF for NULL, retorna NULL
  IF cpf IS NULL THEN
    RETURN NULL;
  END IF;

  -- Remove caracteres não numéricos
  cpf_clean := regexp_replace(cpf, '\D', '', 'g');

  -- Verifica se tem 11 dígitos
  IF length(cpf_clean) != 11 THEN
    RETURN cpf;
  END IF;

  -- Formata como XXX.XXX.XXX-XX
  RETURN substring(cpf_clean, 1, 3) || '.' ||
         substring(cpf_clean, 4, 3) || '.' ||
         substring(cpf_clean, 7, 3) || '-' ||
         substring(cpf_clean, 10, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Migrar hierarquias antigas para 'employee'
-- strategy, traffic_manager, social_media, designer -> employee
DO $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE profiles
  SET hierarchy = 'employee'::user_hierarchy
  WHERE hierarchy::text IN ('strategy', 'traffic_manager', 'social_media', 'designer');

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE '✅ % perfis migrados para hierarquia "employee"', affected_rows;
END $$;

-- 8. Definir hierarquia padrão como 'employee' se for NULL
DO $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE profiles
  SET hierarchy = 'employee'::user_hierarchy
  WHERE hierarchy IS NULL;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE '✅ % perfis com hierarquia NULL atualizados para "employee"', affected_rows;
END $$;

-- 9. Criar índice para hierarquia
CREATE INDEX IF NOT EXISTS idx_profiles_hierarchy ON profiles(hierarchy);

-- 10. Comentários para documentação
COMMENT ON COLUMN profiles.cpf IS 'CPF do colaborador (único). Validado automaticamente.';
COMMENT ON FUNCTION validate_cpf(TEXT) IS 'Valida CPF brasileiro com dígitos verificadores';
COMMENT ON FUNCTION format_cpf(TEXT) IS 'Formata CPF no padrão XXX.XXX.XXX-XX';

-- 11. Verificar estrutura final
SELECT
  'Estrutura final da tabela profiles:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('cpf', 'phone', 'hierarchy', 'team_id', 'full_name')
ORDER BY column_name;

-- 12. Verificar distribuição de hierarquias
SELECT
  'Distribuição de hierarquias:' as info,
  hierarchy,
  COUNT(*) as total
FROM profiles
GROUP BY hierarchy
ORDER BY hierarchy;
