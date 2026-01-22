-- ============================================================================
-- CLEANUP OLD RLS POLICIES
-- ============================================================================
-- Remove políticas antigas em inglês que estão duplicadas
-- ============================================================================

-- Remove políticas antigas de deal_activities
DROP POLICY IF EXISTS "Users can manage deal activities" ON deal_activities;
DROP POLICY IF EXISTS "Users can view deal activities" ON deal_activities;

-- Remove políticas antigas de deal_checklists
DROP POLICY IF EXISTS "Users can manage deal checklists" ON deal_checklists;
DROP POLICY IF EXISTS "Users can view deal checklists" ON deal_checklists;

-- Remove políticas antigas de deal_checklist_items
DROP POLICY IF EXISTS "Users can manage deal checklist items" ON deal_checklist_items;
DROP POLICY IF EXISTS "Users can view deal checklist items" ON deal_checklist_items;

-- Remove políticas antigas de deal_attachments
DROP POLICY IF EXISTS "Users can manage deal attachments" ON deal_attachments;
DROP POLICY IF EXISTS "Users can view deal attachments" ON deal_attachments;

-- Verificar políticas restantes
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('deal_activities', 'deal_checklists', 'deal_checklist_items', 'deal_attachments')
ORDER BY tablename, policyname;
