-- ============================================================================
-- FIX CHECKLIST AND ATTACHMENTS RLS POLICIES
-- ============================================================================
-- Corrige políticas RLS para checklists e anexos
-- ============================================================================

-- ============================================================================
-- DEAL CHECKLISTS
-- ============================================================================

ALTER TABLE deal_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver checklists dos seus deals" ON deal_checklists;
DROP POLICY IF EXISTS "Usuários podem criar checklists" ON deal_checklists;
DROP POLICY IF EXISTS "Usuários podem atualizar checklists" ON deal_checklists;
DROP POLICY IF EXISTS "Usuários podem deletar checklists" ON deal_checklists;

CREATE POLICY "Usuários podem ver checklists dos seus deals"
ON deal_checklists FOR SELECT
TO authenticated
USING (
  deal_id IN (
    SELECT id FROM deals
    WHERE created_by = auth.uid()
    OR pipeline_id IN (
      SELECT id FROM pipelines WHERE created_by = auth.uid()
    )
  )
);

CREATE POLICY "Usuários podem criar checklists"
ON deal_checklists FOR INSERT
TO authenticated
WITH CHECK (
  deal_id IN (
    SELECT id FROM deals
    WHERE created_by = auth.uid()
    OR pipeline_id IN (
      SELECT id FROM pipelines WHERE created_by = auth.uid()
    )
  )
);

CREATE POLICY "Usuários podem atualizar checklists"
ON deal_checklists FOR UPDATE
TO authenticated
USING (
  deal_id IN (
    SELECT id FROM deals
    WHERE created_by = auth.uid()
    OR pipeline_id IN (
      SELECT id FROM pipelines WHERE created_by = auth.uid()
    )
  )
);

CREATE POLICY "Usuários podem deletar checklists"
ON deal_checklists FOR DELETE
TO authenticated
USING (
  deal_id IN (
    SELECT id FROM deals
    WHERE created_by = auth.uid()
    OR pipeline_id IN (
      SELECT id FROM pipelines WHERE created_by = auth.uid()
    )
  )
);

-- ============================================================================
-- DEAL CHECKLIST ITEMS
-- ============================================================================

ALTER TABLE deal_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver items dos checklists dos seus deals" ON deal_checklist_items;
DROP POLICY IF EXISTS "Usuários podem criar items" ON deal_checklist_items;
DROP POLICY IF EXISTS "Usuários podem atualizar items" ON deal_checklist_items;
DROP POLICY IF EXISTS "Usuários podem deletar items" ON deal_checklist_items;

CREATE POLICY "Usuários podem ver items dos checklists dos seus deals"
ON deal_checklist_items FOR SELECT
TO authenticated
USING (
  checklist_id IN (
    SELECT id FROM deal_checklists
    WHERE deal_id IN (
      SELECT id FROM deals
      WHERE created_by = auth.uid()
      OR pipeline_id IN (
        SELECT id FROM pipelines WHERE created_by = auth.uid()
      )
    )
  )
);

CREATE POLICY "Usuários podem criar items"
ON deal_checklist_items FOR INSERT
TO authenticated
WITH CHECK (
  checklist_id IN (
    SELECT id FROM deal_checklists
    WHERE deal_id IN (
      SELECT id FROM deals
      WHERE created_by = auth.uid()
      OR pipeline_id IN (
        SELECT id FROM pipelines WHERE created_by = auth.uid()
      )
    )
  )
);

CREATE POLICY "Usuários podem atualizar items"
ON deal_checklist_items FOR UPDATE
TO authenticated
USING (
  checklist_id IN (
    SELECT id FROM deal_checklists
    WHERE deal_id IN (
      SELECT id FROM deals
      WHERE created_by = auth.uid()
      OR pipeline_id IN (
        SELECT id FROM pipelines WHERE created_by = auth.uid()
      )
    )
  )
);

CREATE POLICY "Usuários podem deletar items"
ON deal_checklist_items FOR DELETE
TO authenticated
USING (
  checklist_id IN (
    SELECT id FROM deal_checklists
    WHERE deal_id IN (
      SELECT id FROM deals
      WHERE created_by = auth.uid()
      OR pipeline_id IN (
        SELECT id FROM pipelines WHERE created_by = auth.uid()
      )
    )
  )
);

-- ============================================================================
-- DEAL ATTACHMENTS
-- ============================================================================

ALTER TABLE deal_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver anexos dos seus deals" ON deal_attachments;
DROP POLICY IF EXISTS "Usuários podem criar anexos" ON deal_attachments;
DROP POLICY IF EXISTS "Usuários podem deletar anexos" ON deal_attachments;

CREATE POLICY "Usuários podem ver anexos dos seus deals"
ON deal_attachments FOR SELECT
TO authenticated
USING (
  deal_id IN (
    SELECT id FROM deals
    WHERE created_by = auth.uid()
    OR pipeline_id IN (
      SELECT id FROM pipelines WHERE created_by = auth.uid()
    )
  )
);

CREATE POLICY "Usuários podem criar anexos"
ON deal_attachments FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
);

CREATE POLICY "Usuários podem deletar anexos"
ON deal_attachments FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid()
);

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verificar políticas de checklists
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('deal_checklists', 'deal_checklist_items', 'deal_attachments')
ORDER BY tablename, policyname;
