-- ============================================================================
-- FIX DELETE CASCADE FOR TEAMS AND PROFILES
-- ============================================================================
-- Permite deletar times e colaboradores corrigindo foreign keys
-- ============================================================================

-- ============================================
-- 1. PROFILES - Permitir deletar colaboradores
-- ============================================

-- Quando um colaborador (profile) é deletado:
-- - Seus deals devem ter assignee_id = NULL
-- - Suas tasks devem ter assignee_id = NULL
-- - Seus time logs devem ser deletados
-- - Suas atividades devem ser mantidas (para histórico)

-- DEALS: assignee_id
ALTER TABLE deals
DROP CONSTRAINT IF EXISTS deals_assignee_id_fkey;

ALTER TABLE deals
ADD CONSTRAINT deals_assignee_id_fkey
FOREIGN KEY (assignee_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- DEALS: created_by (manter para histórico)
ALTER TABLE deals
DROP CONSTRAINT IF EXISTS deals_created_by_fkey;

ALTER TABLE deals
ADD CONSTRAINT deals_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- DEALS: next_responsible_user
ALTER TABLE deals
DROP CONSTRAINT IF EXISTS deals_next_responsible_user_fkey;

ALTER TABLE deals
ADD CONSTRAINT deals_next_responsible_user_fkey
FOREIGN KEY (next_responsible_user)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- TASKS: assignee_id
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;

ALTER TABLE tasks
ADD CONSTRAINT tasks_assignee_id_fkey
FOREIGN KEY (assignee_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- TASKS: created_by
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

ALTER TABLE tasks
ADD CONSTRAINT tasks_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- TIME_LOGS: Deletar quando usuário for deletado
ALTER TABLE time_logs
DROP CONSTRAINT IF EXISTS time_logs_user_id_fkey;

ALTER TABLE time_logs
ADD CONSTRAINT time_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- DEAL_ACTIVITIES: Manter atividades mas sem referência ao usuário
ALTER TABLE deal_activities
DROP CONSTRAINT IF EXISTS deal_activities_user_id_fkey;

ALTER TABLE deal_activities
ADD CONSTRAINT deal_activities_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- DEAL_ATTACHMENTS: uploaded_by
ALTER TABLE deal_attachments
DROP CONSTRAINT IF EXISTS deal_attachments_uploaded_by_fkey;

ALTER TABLE deal_attachments
ADD CONSTRAINT deal_attachments_uploaded_by_fkey
FOREIGN KEY (uploaded_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- DEAL_CHECKLIST_ITEMS: assignee_id
ALTER TABLE deal_checklist_items
DROP CONSTRAINT IF EXISTS deal_checklist_items_assignee_id_fkey;

ALTER TABLE deal_checklist_items
ADD CONSTRAINT deal_checklist_items_assignee_id_fkey
FOREIGN KEY (assignee_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- ============================================
-- 2. TEAMS - Permitir deletar times
-- ============================================

-- Quando um time é deletado:
-- - Profiles do time devem ter team_id = NULL
-- - Pipelines do time devem ter team_id = NULL

-- PROFILES: team_id
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_team_id_fkey;

ALTER TABLE profiles
ADD CONSTRAINT profiles_team_id_fkey
FOREIGN KEY (team_id)
REFERENCES teams(id)
ON DELETE SET NULL;

-- TEAMS: manager_id (o manager ainda será um profile válido)
ALTER TABLE teams
DROP CONSTRAINT IF EXISTS teams_manager_id_fkey;

ALTER TABLE teams
ADD CONSTRAINT teams_manager_id_fkey
FOREIGN KEY (manager_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- PIPELINES: team_id
ALTER TABLE pipelines
DROP CONSTRAINT IF EXISTS pipelines_team_id_fkey;

ALTER TABLE pipelines
ADD CONSTRAINT pipelines_team_id_fkey
FOREIGN KEY (team_id)
REFERENCES teams(id)
ON DELETE SET NULL;

-- ============================================
-- 3. VERIFICAR CONSTRAINTS ATUALIZADAS
-- ============================================

-- Listar todas as foreign keys de profiles
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (ccu.table_name = 'profiles' OR ccu.table_name = 'teams')
ORDER BY tc.table_name, kcu.column_name;
