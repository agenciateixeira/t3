-- ============================================================================
-- FIX DEAL ACTIVITIES RLS POLICIES
-- ============================================================================
-- Corrige políticas RLS para permitir comentários e outras atividades
-- ============================================================================

-- Habilitar RLS na tabela deal_activities
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Usuários podem ver atividades dos seus deals" ON deal_activities;
DROP POLICY IF EXISTS "Usuários podem criar atividades" ON deal_activities;
DROP POLICY IF EXISTS "Usuários podem atualizar suas atividades" ON deal_activities;
DROP POLICY IF EXISTS "Usuários podem deletar suas atividades" ON deal_activities;

-- Política para SELECT - ver atividades de deals acessíveis
CREATE POLICY "Usuários podem ver atividades dos seus deals"
ON deal_activities FOR SELECT
TO authenticated
USING (
  deal_id IN (
    SELECT id FROM deals
    WHERE created_by = auth.uid()
    OR pipeline_id IN (
      SELECT id FROM pipelines
      WHERE created_by = auth.uid()
    )
  )
  OR auth.uid() IN (
    SELECT id FROM profiles WHERE hierarchy = 'admin'
  )
);

-- Política para INSERT - criar atividades
CREATE POLICY "Usuários podem criar atividades"
ON deal_activities FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- Política para UPDATE - atualizar suas próprias atividades
CREATE POLICY "Usuários podem atualizar suas atividades"
ON deal_activities FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Política para DELETE - deletar suas próprias atividades
CREATE POLICY "Usuários podem deletar suas atividades"
ON deal_activities FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Verificar políticas criadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'deal_activities'
ORDER BY policyname;
