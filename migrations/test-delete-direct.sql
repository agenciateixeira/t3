-- ============================================================================
-- TEST DELETE DIRECTLY
-- ============================================================================

-- Primeiro, ver quantos profiles existem
SELECT COUNT(*) as total_profiles FROM profiles;

-- Ver o profile específico
SELECT id, full_name, hierarchy
FROM profiles
WHERE id = '2e745e8a-72af-4d3f-8c08-fc8151d80cc1';

-- Tentar deletar DIRETO (sem RLS)
DELETE FROM profiles
WHERE id = '2e745e8a-72af-4d3f-8c08-fc8151d80cc1'
RETURNING *;

-- Ver quantos restaram
SELECT COUNT(*) as total_profiles FROM profiles;
