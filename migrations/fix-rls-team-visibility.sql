-- ============================================================================
-- FIX RLS POLICIES - PERMITIR QUE TODO O TIME VEJA TUDO
-- ============================================================================
-- Problema: Outros usuários não veem atividades, anexos e checklists
-- Solução: Permitir que todos vejam, mas só possam editar/deletar o que criaram
-- ============================================================================

-- ============================================================================
-- DEAL ACTIVITIES - Time inteiro vê tudo
-- ============================================================================

DROP POLICY IF EXISTS "Usuários podem ver atividades dos seus deals" ON deal_activities;

-- NOVA POLÍTICA: Todos podem ver todas as atividades
CREATE POLICY "Time pode ver todas as atividades"
ON deal_activities FOR SELECT
TO authenticated
USING (true);

-- Manter políticas de INSERT, UPDATE, DELETE como estão (só mexe no que criou)

-- ============================================================================
-- DEAL ATTACHMENTS - Time inteiro vê tudo
-- ============================================================================

DROP POLICY IF EXISTS "Usuários podem ver anexos dos seus deals" ON deal_attachments;

-- NOVA POLÍTICA: Todos podem ver todos os anexos
CREATE POLICY "Time pode ver todos os anexos"
ON deal_attachments FOR SELECT
TO authenticated
USING (true);

-- Manter políticas de INSERT e DELETE como estão

-- ============================================================================
-- DEAL CHECKLISTS - Time inteiro vê tudo
-- ============================================================================

DROP POLICY IF EXISTS "Usuários podem ver checklists dos seus deals" ON deal_checklists;

-- NOVA POLÍTICA: Todos podem ver todos os checklists
CREATE POLICY "Time pode ver todos os checklists"
ON deal_checklists FOR SELECT
TO authenticated
USING (true);

-- Permitir que qualquer um crie checklists em qualquer deal
DROP POLICY IF EXISTS "Usuários podem criar checklists" ON deal_checklists;

CREATE POLICY "Time pode criar checklists"
ON deal_checklists FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir que qualquer um atualize checklists
DROP POLICY IF EXISTS "Usuários podem atualizar checklists" ON deal_checklists;

CREATE POLICY "Time pode atualizar checklists"
ON deal_checklists FOR UPDATE
TO authenticated
USING (true);

-- Permitir que qualquer um delete checklists
DROP POLICY IF EXISTS "Usuários podem deletar checklists" ON deal_checklists;

CREATE POLICY "Time pode deletar checklists"
ON deal_checklists FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- DEAL CHECKLIST ITEMS - Time inteiro vê tudo
-- ============================================================================

DROP POLICY IF EXISTS "Usuários podem ver items dos checklists dos seus deals" ON deal_checklist_items;

-- NOVA POLÍTICA: Todos podem ver todos os items
CREATE POLICY "Time pode ver todos os items"
ON deal_checklist_items FOR SELECT
TO authenticated
USING (true);

-- Permitir que qualquer um crie items
DROP POLICY IF EXISTS "Usuários podem criar items" ON deal_checklist_items;

CREATE POLICY "Time pode criar items"
ON deal_checklist_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir que qualquer um atualize items
DROP POLICY IF EXISTS "Usuários podem atualizar items" ON deal_checklist_items;

CREATE POLICY "Time pode atualizar items"
ON deal_checklist_items FOR UPDATE
TO authenticated
USING (true);

-- Permitir que qualquer um delete items
DROP POLICY IF EXISTS "Usuários podem deletar items" ON deal_checklist_items;

CREATE POLICY "Time pode deletar items"
ON deal_checklist_items FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- DEALS - Time inteiro vê todos os deals
-- ============================================================================

-- Verificar políticas de deals
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'deals'
ORDER BY policyname;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('deal_activities', 'deal_attachments', 'deal_checklists', 'deal_checklist_items')
ORDER BY tablename, policyname;
