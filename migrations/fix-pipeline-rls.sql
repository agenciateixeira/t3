-- ============================================================================
-- FIX PIPELINE RLS POLICIES
-- ============================================================================
-- Este script cria as políticas RLS necessárias para permitir que usuários
-- autenticados possam criar, visualizar, editar e deletar pipelines e stages
-- ============================================================================

-- ============================================================================
-- 1. TABELA: pipelines
-- ============================================================================

-- Habilitar RLS na tabela pipelines
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (se existirem) para evitar conflitos
DROP POLICY IF EXISTS "Usuários autenticados podem criar pipelines" ON pipelines;
DROP POLICY IF EXISTS "Usuários podem ver pipelines do seu time" ON pipelines;
DROP POLICY IF EXISTS "Usuários podem editar pipelines do seu time" ON pipelines;
DROP POLICY IF EXISTS "Usuários podem deletar pipelines que criaram" ON pipelines;

-- Política para INSERT (criar pipelines)
CREATE POLICY "Usuários autenticados podem criar pipelines"
ON pipelines
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- Política para SELECT (visualizar pipelines)
CREATE POLICY "Usuários podem ver pipelines do seu time"
ON pipelines
FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM profiles
    WHERE id = auth.uid()
  )
  OR created_by = auth.uid()
  OR team_id IS NULL
);

-- Política para UPDATE (editar pipelines)
CREATE POLICY "Usuários podem editar pipelines do seu time"
ON pipelines
FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM profiles
    WHERE id = auth.uid()
  )
  OR created_by = auth.uid()
  OR team_id IS NULL
)
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM profiles
    WHERE id = auth.uid()
  )
  OR created_by = auth.uid()
  OR team_id IS NULL
);

-- Política para DELETE (deletar pipelines)
CREATE POLICY "Usuários podem deletar pipelines que criaram"
ON pipelines
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
);

-- ============================================================================
-- 2. TABELA: pipeline_stages
-- ============================================================================

-- Habilitar RLS na tabela pipeline_stages
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (se existirem) para evitar conflitos
DROP POLICY IF EXISTS "Usuários podem ver stages dos seus pipelines" ON pipeline_stages;
DROP POLICY IF EXISTS "Usuários podem criar stages nos seus pipelines" ON pipeline_stages;
DROP POLICY IF EXISTS "Usuários podem editar stages dos seus pipelines" ON pipeline_stages;
DROP POLICY IF EXISTS "Usuários podem deletar stages dos seus pipelines" ON pipeline_stages;

-- Política para SELECT (visualizar stages)
CREATE POLICY "Usuários podem ver stages dos seus pipelines"
ON pipeline_stages
FOR SELECT
TO authenticated
USING (
  pipeline_id IN (
    SELECT id FROM pipelines
    WHERE team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
    OR team_id IS NULL
  )
);

-- Política para INSERT (criar stages)
CREATE POLICY "Usuários podem criar stages nos seus pipelines"
ON pipeline_stages
FOR INSERT
TO authenticated
WITH CHECK (
  pipeline_id IN (
    SELECT id FROM pipelines
    WHERE team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
    OR team_id IS NULL
  )
);

-- Política para UPDATE (editar stages)
CREATE POLICY "Usuários podem editar stages dos seus pipelines"
ON pipeline_stages
FOR UPDATE
TO authenticated
USING (
  pipeline_id IN (
    SELECT id FROM pipelines
    WHERE team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
    OR team_id IS NULL
  )
)
WITH CHECK (
  pipeline_id IN (
    SELECT id FROM pipelines
    WHERE team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
    OR team_id IS NULL
  )
);

-- Política para DELETE (deletar stages)
CREATE POLICY "Usuários podem deletar stages dos seus pipelines"
ON pipeline_stages
FOR DELETE
TO authenticated
USING (
  pipeline_id IN (
    SELECT id FROM pipelines
    WHERE team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
    OR team_id IS NULL
  )
);

-- ============================================================================
-- 3. TABELA: deals
-- ============================================================================

-- Habilitar RLS na tabela deals
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (se existirem) para evitar conflitos
DROP POLICY IF EXISTS "Usuários podem ver deals dos seus pipelines" ON deals;
DROP POLICY IF EXISTS "Usuários podem criar deals nos seus pipelines" ON deals;
DROP POLICY IF EXISTS "Usuários podem editar deals dos seus pipelines" ON deals;
DROP POLICY IF EXISTS "Usuários podem deletar deals dos seus pipelines" ON deals;

-- Política para SELECT (visualizar deals)
CREATE POLICY "Usuários podem ver deals dos seus pipelines"
ON deals
FOR SELECT
TO authenticated
USING (
  pipeline_id IN (
    SELECT id FROM pipelines
    WHERE team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
    OR team_id IS NULL
  )
);

-- Política para INSERT (criar deals)
CREATE POLICY "Usuários podem criar deals nos seus pipelines"
ON deals
FOR INSERT
TO authenticated
WITH CHECK (
  pipeline_id IN (
    SELECT id FROM pipelines
    WHERE team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
    OR team_id IS NULL
  )
  AND created_by = auth.uid()
);

-- Política para UPDATE (editar deals)
CREATE POLICY "Usuários podem editar deals dos seus pipelines"
ON deals
FOR UPDATE
TO authenticated
USING (
  pipeline_id IN (
    SELECT id FROM pipelines
    WHERE team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
    OR team_id IS NULL
  )
)
WITH CHECK (
  pipeline_id IN (
    SELECT id FROM pipelines
    WHERE team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
    OR team_id IS NULL
  )
);

-- Política para DELETE (deletar deals)
CREATE POLICY "Usuários podem deletar deals dos seus pipelines"
ON deals
FOR DELETE
TO authenticated
USING (
  pipeline_id IN (
    SELECT id FROM pipelines
    WHERE team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
    OR team_id IS NULL
  )
);

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

-- Verificar se as políticas foram criadas corretamente
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('pipelines', 'pipeline_stages', 'deals')
ORDER BY tablename, policyname;
