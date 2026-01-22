-- ============================================================================
-- CREATE VIEW: teams_with_counts
-- ============================================================================
-- Esta VIEW resolve o problema N+1 ao buscar times com contagem de membros
-- Reduz de ~11 queries para apenas 1 query
-- ============================================================================

-- 1. Criar a VIEW
CREATE OR REPLACE VIEW teams_with_counts AS
SELECT
  t.id,
  t.name,
  t.description,
  t.manager_id,
  t.created_at,
  t.updated_at,
  COUNT(p.id) as member_count
FROM teams t
LEFT JOIN profiles p ON p.team_id = t.id
GROUP BY t.id, t.name, t.description, t.manager_id, t.created_at, t.updated_at;

-- 2. Testar a VIEW
SELECT * FROM teams_with_counts;

-- 3. Verificar performance
EXPLAIN ANALYZE SELECT * FROM teams_with_counts;
