-- ============================================================================
-- ADICIONAR CPF E ATUALIZAR HIERARQUIAS - VERSÃO CORRIGIDA
-- ============================================================================
-- Adiciona campo CPF na tabela profiles com validação
-- Atualiza hierarquias para admin/team_manager/employee
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

-- 7. ADICIONAR 'employee' AO ENUM user_hierarchy (ANTES de usar!)
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
    RAISE NOTICE 'Valor "employee" adicionado ao enum user_hierarchy com sucesso!';
  ELSE
    RAISE NOTICE 'Valor "employee" já existe no enum user_hierarchy';
  END IF;
END $$;

-- 8. AGORA SIM podemos migrar hierarquias antigas para 'employee'
-- strategy, traffic_manager, social_media, designer -> employee
UPDATE profiles
SET hierarchy = 'employee'::user_hierarchy
WHERE hierarchy::text IN ('strategy', 'traffic_manager', 'social_media', 'designer');

-- 9. Definir hierarquia padrão como 'employee' se for NULL
UPDATE profiles
SET hierarchy = 'employee'::user_hierarchy
WHERE hierarchy IS NULL;

-- 10. Criar índice para hierarquia
CREATE INDEX IF NOT EXISTS idx_profiles_hierarchy ON profiles(hierarchy);

-- 11. Comentários para documentação
COMMENT ON COLUMN profiles.cpf IS 'CPF do colaborador (único). Validado automaticamente.';
COMMENT ON FUNCTION validate_cpf(TEXT) IS 'Valida CPF brasileiro com dígitos verificadores';
COMMENT ON FUNCTION format_cpf(TEXT) IS 'Formata CPF no padrão XXX.XXX.XXX-XX';

-- 12. Verificar estrutura final
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('cpf', 'phone', 'hierarchy', 'team_id', 'full_name')
ORDER BY column_name;

-- 13. Mostrar valores do enum user_hierarchy para confirmar
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_hierarchy')
ORDER BY enumsortorder;
